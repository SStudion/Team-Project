// lib/server/decisionService.js
//
// ⚠️ SERVER ONLY — never import this from a client component.
//
// Admin status changes and final decisions. This is server-side (not in the
// client services) because one admin action fans out into four writes —
// application update, decisionHistory record, notification, email log — and
// the audit trail collections are locked against client writes in the rules.
// Doing it here means the trail can't be skipped, spoofed or half-completed
// by a misbehaving client.

import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { ApiError } from "./apiAuth";
import {
  sendStatusUpdateEmail,
  sendOfferEmail,
  sendRejectionEmail,
} from "./emailService";

// Same lifecycle map as constants/statuses.js — duplicated here on purpose,
// because server code shouldn't import from the client bundle and these five
// strings are the one contract that never changes without a team decision.
const ADMIN_TRANSITIONS = {
  submitted: ["under_review", "offered", "rejected"],
  under_review: ["offered", "rejected"],
};
const FINAL = ["offered", "rejected"];

const STATUS_LABELS = {
  under_review: "Under Review",
  offered: "Offered",
  rejected: "Rejected",
};

// Shared core: validates the transition, applies every write, returns what happened.
async function applyTransition({ applicationId, admin, newStatus, decisionMessage = "" }) {
  const appRef = adminDb.collection("applications").doc(applicationId);
  const snap = await appRef.get();
  if (!snap.exists) throw new ApiError(404, "Application not found.");
  const app = snap.data();

  // API-layer version of the same check firestore.rules makes — the Admin SDK
  // bypasses rules, so it has to happen again here.
  if (app.universityId !== admin.universityId) {
    throw new ApiError(403, "This application belongs to another university.");
  }

  const allowed = ADMIN_TRANSITIONS[app.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
  400,
  app.status === "offered" || app.status === "rejected"
    ? "This application already has a final decision. Further changes require academic representative review."
    : `Cannot move an application from "${app.status}" to "${newStatus}".`
);
  }

  const isFinal = FINAL.includes(newStatus);

  await appRef.update({
    status: newStatus,
    "adminReview.reviewedBy": admin.uid,
    "adminReview.reviewedAt": FieldValue.serverTimestamp(),
    ...(isFinal && decisionMessage
      ? { "adminReview.latestDecisionMessage": decisionMessage }
      : {}),
    updatedAt: FieldValue.serverTimestamp(),
    ...(isFinal ? { decidedAt: FieldValue.serverTimestamp() } : {}),
  });

  // Email first, so the decisionHistory record can state truthfully whether
  // one was triggered.
  const emailPayload = {
    userId: app.studentId,
    applicationId,
    recipientEmail: app.studentEmail,
    studentName: app.studentName,
    universityName: app.universityName,
    courseName: app.courseInfo?.courseName || "your chosen course",
    decisionMessage,
  };

  let emailResult;
  if (newStatus === "offered") {
    emailResult = await sendOfferEmail(emailPayload);
  } else if (newStatus === "rejected") {
    emailResult = await sendRejectionEmail(emailPayload);
  } else {
    emailResult = await sendStatusUpdateEmail({
      ...emailPayload,
      newStatusLabel: STATUS_LABELS[newStatus] || newStatus,
    });
  }
  const emailTriggered = emailResult.delivered || emailResult.simulated;

  // In-app notification — created server-side because the rules block client
  // notification writes.
  await adminDb.collection("notifications").add({
    userId: app.studentId,
    applicationId,
    type: isFinal ? newStatus : "status_update",
    title: isFinal ? "Application decision" : "Application update",
    message: isFinal
      ? `${app.universityName} has made a decision on your application.`
      : `Your application to ${app.universityName} is now ${STATUS_LABELS[newStatus] || newStatus}.`,
    readStatus: false,
    createdAt: FieldValue.serverTimestamp(),
    readAt: null,
  });

 await adminDb.collection("decisionHistory").add({
  applicationId,
  universityId: app.universityId,
  studentId: app.studentId,
  previousStatus: app.status,
  newStatus,
  decisionMessage: decisionMessage || "",
  decidedBy: admin.uid,
  decidedByName:
    admin.profile?.fullName ??
    admin.fullName ??
    admin.email ??
    "University Admin",
  emailTriggered,
  notificationCreated: true,
  createdAt: FieldValue.serverTimestamp(),
});

  return { previousStatus: app.status, newStatus, emailTriggered };
}

/** Moves an application to under_review — the non-final status change an admin makes when picking it up. */
export function updateApplicationStatus({ applicationId, admin, newStatus }) {
  return applyTransition({ applicationId, admin, newStatus });
}

/** Saves the final offer/reject decision with an optional message to the student — per PRD: decision saved, email sent, history logged. */
export function saveFinalDecision({ applicationId, admin, decision, decisionMessage }) {
  if (!FINAL.includes(decision)) {
    throw new ApiError(400, "A final decision must be either 'offered' or 'rejected'.");
  }
  return applyTransition({ applicationId, admin, newStatus: decision, decisionMessage });
}
