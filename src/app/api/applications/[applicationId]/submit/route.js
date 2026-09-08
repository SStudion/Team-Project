// api/applications/[applicationId]/submit — POST (student)
//
// This is the canonical submission path, and the reason it's an API route
// rather than only a client call: submission triggers the confirmation email
// (a PRD email event), and emails can only be sent server-side. The frontend
// calls this route on submit so the email actually fires.
//
// The draft -> submitted transition runs inside a Firestore transaction so two
// near-simultaneous submit requests can't both succeed: whichever loses the
// race re-reads the now-"submitted" document on its retry, hits the same 409
// a stale double-submit already produces, and never reaches the email/
// notification code below. That code deliberately lives outside the
// transaction — Firestore can retry a transaction body on contention, and an
// email/notification must never fire more than once per real submission.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { validateApplicationForSubmit } from "@/lib/validation/applicationValidation";
import { sendApplicationSubmittedEmail } from "@/lib/server/emailService";

export async function POST(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;
    const appRef = adminDb.collection("applications").doc(applicationId);

    let app;

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(appRef);
      if (!snap.exists) throw new ApiError(404, "Application not found.");
      const current = snap.data();

      if (current.studentId !== student.uid) {
        throw new ApiError(403, "This application isn't yours.");
      }
      if (current.status !== "draft") {
        throw new ApiError(409, "This application has already been submitted.");
      }

      // Required fields per PRD 4.2.3 — an incomplete application never reaches
      // an admin's queue.
      const { valid, errors } = validateApplicationForSubmit({ ...current, universityId: current.universityId });
      if (!valid) {
        const err = new ApiError(400, "Please complete all required fields before submitting.");
        err.fieldErrors = errors;
        throw err;
      }

      tx.update(appRef, {
        status: "submitted",
        submittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      app = current;
    });

    // Confirmation email (simulated automatically when SMTP isn't configured).
    await sendApplicationSubmittedEmail({
      userId: student.uid,
      applicationId,
      recipientEmail: app.studentEmail,
      studentName: app.studentName,
      universityName: app.universityName,
      courseName: app.courseInfo?.courseName || "your chosen course",
    });

    // In-app notification too, so the dashboard reflects it immediately.
    await adminDb.collection("notifications").add({
      userId: student.uid,
      applicationId,
      type: "submission",
      title: "Application submitted",
      message: `Your application to ${app.universityName} was received.`,
      readStatus: false,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    });

    return Response.json({ ok: true, status: "submitted" });
  } catch (error) {
    if (error instanceof ApiError && error.fieldErrors) {
      return Response.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: error.status }
      );
    }
    return toErrorResponse(error);
  }
}
