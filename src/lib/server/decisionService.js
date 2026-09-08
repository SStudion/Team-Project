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
//
// The application update + decisionHistory + notification commit together in
// one Firestore transaction (see applyTransition/requestMissingDocuments) —
// re-reading and re-validating the transition inside it means a decision can
// never exist without its audit record, and two admins racing the same
// application can't both land conflicting decisions. Email is deliberately
// triggered only after that transaction commits: Firestore can retry a
// transaction body on contention, and an email must never fire twice for one
// real decision.

import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { ApiError } from "./apiAuth";
import {
  sendStatusUpdateEmail,
  sendOfferEmail,
  sendRejectionEmail,
  sendMissingDocumentsEmail,
} from "./emailService";
import { DOC_TYPES } from "@/constants/documentTypes";
import { STATUS } from "@/constants/statuses";

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

  let app;
  let historyDocId;
  let isFinal;

  // Application update + decisionHistory + notification commit atomically.
  // The status/ownership checks run against the read INSIDE the transaction
  // (not a read taken before it), so if two admins race the same
  // application, the loser's transaction retries on the now-changed
  // document and re-validates against it — if the transition it wanted is no
  // longer valid, it fails cleanly instead of creating a second, conflicting
  // decision. See resubmitMissingDocuments() below for the same pattern.
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(appRef);
    if (!snap.exists) throw new ApiError(404, "Application not found.");
    const current = snap.data();

    // API-layer version of the same check firestore.rules makes — the Admin SDK
    // bypasses rules, so it has to happen again here.
    if (current.universityId !== admin.universityId) {
      throw new ApiError(403, "This application belongs to another university.");
    }

    const allowed = ADMIN_TRANSITIONS[current.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ApiError(
        400,
        current.status === "offered" || current.status === "rejected"
          ? "This application already has a final decision. Further changes require academic representative review."
          : `Cannot move an application from "${current.status}" to "${newStatus}".`
      );
    }

    isFinal = FINAL.includes(newStatus);

    tx.update(appRef, {
      status: newStatus,
      "adminReview.reviewedBy": admin.uid,
      "adminReview.reviewedAt": FieldValue.serverTimestamp(),
      ...(isFinal && decisionMessage
        ? { "adminReview.latestDecisionMessage": decisionMessage }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
      ...(isFinal ? { decidedAt: FieldValue.serverTimestamp() } : {}),
    });

    // emailTriggered starts false — it's only known once the email attempt
    // below actually runs, after this transaction has committed. Patched to
    // true afterward if it succeeds/simulates; see the follow-up write below.
    const historyRef = adminDb.collection("decisionHistory").doc();
    historyDocId = historyRef.id;
    tx.set(historyRef, {
      applicationId,
      universityId: current.universityId,
      studentId: current.studentId,
      previousStatus: current.status,
      newStatus,
      decisionMessage: decisionMessage || "",
      decidedBy: admin.uid,
      decidedByName:
        admin.profile?.fullName ??
        admin.fullName ??
        admin.email ??
        "University Admin",
      decidedByRole: "university_admin",
      emailTriggered: false,
      notificationCreated: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    // In-app notification — created server-side because the rules block client
    // notification writes. Same commit as the status change and history record,
    // so notificationCreated: true above is never a lie.
    const notificationRef = adminDb.collection("notifications").doc();
    tx.set(notificationRef, {
      userId: current.studentId,
      applicationId,
      type: isFinal ? newStatus : "status_update",
      title: isFinal ? "Application decision" : "Application update",
      message: isFinal
        ? `${current.universityName} has made a decision on your application.`
        : `Your application to ${current.universityName} is now ${STATUS_LABELS[newStatus] || newStatus}.`,
      readStatus: false,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    });

    app = current;
  });

  // Everything authoritative has already committed by this point. Email is
  // attempted only now, never inside the transaction above, since a
  // transaction body can be retried by the SDK on contention and an email
  // must not be sent more than once for a single real decision. A thrown
  // error here must not make an already-successful decision look like it
  // failed to the caller, so it's caught and logged rather than propagated.
  const emailPayload = {
    userId: app.studentId,
    applicationId,
    recipientEmail: app.studentEmail,
    studentName: app.studentName,
    universityName: app.universityName,
    courseName: app.courseInfo?.courseName || "your chosen course",
    decisionMessage,
  };

  let emailTriggered = false;
  try {
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
    emailTriggered = Boolean(emailResult.delivered || emailResult.simulated);
  } catch (err) {
    console.error("applyTransition: email attempt threw unexpectedly:", err);
  }

  // Smallest safe follow-up write: only needed when the email actually went
  // out/simulated — the transaction already wrote emailTriggered: false, so a
  // failed or skipped email needs no correction. emailLogs (written by
  // emailService.js on every attempt) remains the authoritative delivery
  // record either way; this only keeps decisionHistory's own summary field
  // truthful for anyone reading that collection in isolation.
  if (emailTriggered) {
    try {
      await adminDb.collection("decisionHistory").doc(historyDocId).update({ emailTriggered: true });
    } catch (err) {
      console.error("applyTransition: failed to patch decisionHistory.emailTriggered:", err);
    }
  }

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

/**
 * Requests missing documents from an applicant (Sprint 3 / D-03/D-04).
 * Moves an application from submitted or under_review to missing_documents,
 * records missing document types, sends notification and email, and logs decision history.
 */
export async function requestMissingDocuments({
  applicationId,
  admin,
  missingDocumentTypes,
  message = "",
}) {
  if (!applicationId) {
    throw new ApiError(400, "applicationId is required.");
  }

  if (!Array.isArray(missingDocumentTypes) || missingDocumentTypes.length === 0) {
    throw new ApiError(400, "missingDocumentTypes must be a non-empty array.");
  }

  const allowedDocTypes = Object.values(DOC_TYPES);
  for (const docType of missingDocumentTypes) {
    if (typeof docType !== "string" || !allowedDocTypes.includes(docType)) {
      throw new ApiError(
        400,
        `Invalid document type: "${docType}". Allowed types are: ${allowedDocTypes.join(", ")}.`
      );
    }
  }

  const sanitizedDocTypes = [...new Set(missingDocumentTypes)];
  const trimmedMessage = (message || "").trim();

  const appRef = adminDb.collection("applications").doc(applicationId);

  let app;
  let historyDocId;

  // Same atomic-commit / re-validate-inside-the-transaction pattern as
  // applyTransition() above — see its comment for the concurrency reasoning.
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(appRef);
    if (!snap.exists) throw new ApiError(404, "Application not found.");
    const current = snap.data();

    if (current.universityId !== admin.universityId) {
      throw new ApiError(403, "This application belongs to another university.");
    }

    if (current.status === STATUS.OFFERED || current.status === STATUS.REJECTED) {
      throw new ApiError(
        400,
        "This application already has a final decision. Further changes require academic representative review."
      );
    }

    if (current.status !== STATUS.SUBMITTED && current.status !== STATUS.UNDER_REVIEW) {
      throw new ApiError(
        400,
        `Cannot move an application from "${current.status}" to "missing_documents". Only "submitted" or "under_review" applications can be flagged for missing documents.`
      );
    }

    tx.update(appRef, {
      status: STATUS.MISSING_DOCUMENTS,
      "adminReview.missingDocumentTypes": sanitizedDocTypes,
      "adminReview.latestDecisionMessage": trimmedMessage,
      "adminReview.reviewedBy": admin.uid,
      "adminReview.reviewedAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const historyRef = adminDb.collection("decisionHistory").doc();
    historyDocId = historyRef.id;
    tx.set(historyRef, {
      applicationId,
      universityId: current.universityId,
      studentId: current.studentId,
      previousStatus: current.status,
      newStatus: STATUS.MISSING_DOCUMENTS,
      decisionMessage: trimmedMessage,
      decidedBy: admin.uid,
      decidedByName:
        admin.profile?.fullName ??
        admin.fullName ??
        admin.email ??
        "University Admin",
      decidedByRole: "university_admin",
      emailTriggered: false,
      notificationCreated: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    const notificationMessage = trimmedMessage
      ? `${current.universityName} requested missing documents: ${trimmedMessage}`
      : `${current.universityName} has requested additional documents for your application.`;

    const notificationRef = adminDb.collection("notifications").doc();
    tx.set(notificationRef, {
      userId: current.studentId,
      applicationId,
      type: "missing_documents",
      title: "Missing documents requested",
      message: notificationMessage,
      readStatus: false,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    });

    app = current;
  });

  // Email only after the transaction has committed — never inside it. Errors
  // here are caught, not propagated: the decision itself already succeeded.
  let emailTriggered = false;
  try {
    const emailResult = await sendMissingDocumentsEmail({
      userId: app.studentId,
      applicationId,
      recipientEmail: app.studentEmail,
      studentName: app.studentName,
      universityName: app.universityName,
      courseName: app.courseInfo?.courseName || "your chosen course",
      missingDocumentTypes: sanitizedDocTypes,
      message: trimmedMessage,
    });
    emailTriggered = Boolean(emailResult.delivered || emailResult.simulated);
  } catch (err) {
    console.error("requestMissingDocuments: email attempt threw unexpectedly:", err);
  }

  // Smallest safe follow-up write — see the matching comment in
  // applyTransition(). emailLogs remains the authoritative delivery record;
  // this only keeps decisionHistory's own summary field accurate.
  if (emailTriggered) {
    try {
      await adminDb.collection("decisionHistory").doc(historyDocId).update({ emailTriggered: true });
    } catch (err) {
      console.error("requestMissingDocuments: failed to patch decisionHistory.emailTriggered:", err);
    }
  }

  return { previousStatus: app.status, newStatus: STATUS.MISSING_DOCUMENTS, emailTriggered };
}

/**
 * Student resubmits after uploading the documents an admin flagged as missing
 * (Sprint 3 / D-03/D-04). Moves missing_documents -> under_review. No email and
 * no new notification — the admin finds out by the application reappearing in
 * their queue. Full adminReview audit context (reviewedBy/reviewedAt/
 * missingDocumentTypes/latestDecisionMessage) is preserved; only
 * missingDocumentsResolvedAt is added.
 */
export async function resubmitMissingDocuments({ applicationId, student }) {
  if (!applicationId) {
    throw new ApiError(400, "applicationId is required.");
  }

  const appRef = adminDb.collection("applications").doc(applicationId);
  const snap = await appRef.get();
  if (!snap.exists) throw new ApiError(404, "Application not found.");
  const app = snap.data();

  if (app.studentId !== student.uid) {
    throw new ApiError(403, "This application isn't yours.");
  }

  if (app.status !== STATUS.MISSING_DOCUMENTS) {
    throw new ApiError(
      400,
      `Cannot resubmit from "${app.status}" — this application isn't waiting on missing documents.`
    );
  }

  const missingDocumentTypes = app.adminReview?.missingDocumentTypes;
  if (!Array.isArray(missingDocumentTypes) || missingDocumentTypes.length === 0) {
    throw new ApiError(400, "This application has no recorded missing document types to resolve.");
  }

  // reviewedAt is stamped by requestMissingDocuments() at the moment of the
  // current request — it's the cutoff a qualifying upload must be at or after,
  // so an old document from before this request can't satisfy it.
  const reviewedAt = app.adminReview?.reviewedAt;
  if (!reviewedAt || typeof reviewedAt.toMillis !== "function") {
    throw new ApiError(400, "This application's missing-document request has no usable review timestamp.");
  }
  const reviewedAtMillis = reviewedAt.toMillis();

  // Sprint 1/PoC safe query: single equality filter, no orderBy — no composite
  // index, same pattern as adminApplicationService.js.
  const docsSnap = await adminDb
    .collection("documents")
    .where("applicationId", "==", applicationId)
    .get();

  const qualifyingTypes = new Set();
  for (const docSnap of docsSnap.docs) {
    const doc = docSnap.data();
    if (doc.studentId !== student.uid) continue;
    if (typeof doc.uploadedAt?.toMillis !== "function") continue;
    if (doc.uploadedAt.toMillis() < reviewedAtMillis) continue; // stale — predates this request
    qualifyingTypes.add(doc.fileType);
  }

  const stillMissing = missingDocumentTypes.filter((type) => !qualifyingTypes.has(type));
  if (stillMissing.length > 0) {
    throw new ApiError(
      400,
      `These document types still need a current upload: ${stillMissing.join(", ")}.`
    );
  }

  // Transaction guards against a duplicate/double-click resubmit racing itself —
  // re-checks status at commit time so only one call can ever flip it.
  await adminDb.runTransaction(async (tx) => {
    const freshSnap = await tx.get(appRef);
    if (!freshSnap.exists) throw new ApiError(404, "Application not found.");
    const freshApp = freshSnap.data();

    if (freshApp.studentId !== student.uid) {
      throw new ApiError(403, "This application isn't yours.");
    }

    if (freshApp.status !== STATUS.MISSING_DOCUMENTS) {
      throw new ApiError(
        400,
        `Cannot resubmit from "${freshApp.status}" — this application isn't waiting on missing documents.`
      );
    }

    tx.update(appRef, {
      status: STATUS.UNDER_REVIEW,
      "adminReview.missingDocumentsResolvedAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const historyRef = adminDb.collection("decisionHistory").doc();
    tx.set(historyRef, {
      applicationId,
      universityId: freshApp.universityId,
      studentId: freshApp.studentId,
      previousStatus: STATUS.MISSING_DOCUMENTS,
      newStatus: STATUS.UNDER_REVIEW,
      decisionMessage: "",
      decidedBy: student.uid,
      decidedByName: student.profile?.fullName ?? student.profile?.email ?? "Student",
      decidedByRole: "student",
      emailTriggered: false,
      notificationCreated: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    previousStatus: STATUS.MISSING_DOCUMENTS,
    newStatus: STATUS.UNDER_REVIEW,
    missingDocumentsResolved: true,
  };
}

