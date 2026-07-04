// api/email/send — POST (admin)
//
// Manual email trigger, mainly for demos and for re-sending after a failure.
// Falls back to simulated mode automatically when SMTP isn't configured — the
// emailLogs record is written either way, which is the point: the flow is
// provable without credentials. Admin-only; the automatic emails (submission,
// decision) are triggered by their own routes, not this one.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { requireAdmin, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import {
  sendApplicationSubmittedEmail,
  sendStatusUpdateEmail,
  sendOfferEmail,
  sendRejectionEmail,
} from "@/lib/server/emailService";

const SENDERS = {
  submission: sendApplicationSubmittedEmail,
  status_update: sendStatusUpdateEmail,
  offer: sendOfferEmail,
  rejection: sendRejectionEmail,
};

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    const { emailType, applicationId, newStatusLabel = "", decisionMessage = "" } = await request.json();

    const sender = SENDERS[emailType];
    if (!sender) throw new ApiError(400, `Unknown emailType — expected one of: ${Object.keys(SENDERS).join(", ")}.`);
    if (!applicationId) throw new ApiError(400, "applicationId is required.");

    const snap = await adminDb.collection("applications").doc(applicationId).get();
    if (!snap.exists) throw new ApiError(404, "Application not found.");
    const app = snap.data();

    // Same university scoping as every other admin action.
    if (app.universityId !== admin.universityId) {
      throw new ApiError(403, "This application belongs to another university.");
    }

    const result = await sender({
      userId: app.studentId,
      applicationId,
      recipientEmail: app.studentEmail,
      studentName: app.studentName,
      universityName: app.universityName,
      courseName: app.courseInfo?.courseName || "your chosen course",
      newStatusLabel,
      decisionMessage,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
