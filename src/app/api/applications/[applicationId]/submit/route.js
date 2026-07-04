// api/applications/[applicationId]/submit — POST (student)
//
// This is the canonical submission path, and the reason it's an API route
// rather than only a client call: submission triggers the confirmation email
// (a PRD email event), and emails can only be sent server-side. The frontend
// should call this route on submit so the email actually fires.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { validateApplicationForSubmit } from "@/lib/validation/applicationValidation";
import { sendApplicationSubmittedEmail } from "@/lib/server/emailService";

export async function POST(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;

    const snap = await adminDb.collection("applications").doc(applicationId).get();
    if (!snap.exists) throw new ApiError(404, "Application not found.");
    const app = snap.data();

    if (app.studentId !== student.uid) {
      throw new ApiError(403, "This application isn't yours.");
    }
    if (app.status !== "draft") {
      throw new ApiError(409, "This application has already been submitted.");
    }

    // Required fields per PRD 4.2.3 — an incomplete application never reaches
    // an admin's queue.
    const { valid, errors } = validateApplicationForSubmit({ ...app, universityId: app.universityId });
    if (!valid) {
      return Response.json(
        { error: "Please complete all required fields before submitting.", fieldErrors: errors },
        { status: 400 }
      );
    }

    await adminDb.collection("applications").doc(applicationId).update({
      status: "submitted",
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
    return toErrorResponse(error);
  }
}
