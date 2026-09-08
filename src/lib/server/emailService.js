// lib/server/emailService.js
//
// ⚠️ SERVER ONLY — never import this from a client component (SMTP credentials
// live here, and nodemailer doesn't run in a browser anyway).
//
// All system emails per the PRD: submission confirmation, status updates,
// offer and rejection notifications. Every attempt — sent, failed or
// simulated — leaves an emailLogs record, because the log trail is a PRD
// requirement in its own right, not a nice-to-have.
//
// SIMULATED MODE: when the SMTP env vars are missing, nothing is sent and the
// log records deliveryStatus "simulated" instead. That's deliberate — it lets
// the whole team demo the decision → email flow with zero SMTP setup, and the
// evidence in Firestore looks identical to production minus delivery.

import nodemailer from "nodemailer";
import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logEmailError } from "./auditLogger";
import { DOC_TYPE_LABELS } from "@/constants/documentTypes";

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
);

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

// Small shared shell so all emails look consistent without a template engine.
function htmlShell(title, bodyLines) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a202c;">
    <div style="background: #1e3a5f; color: #fff; padding: 16px 24px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0; font-size: 18px;">UAAMS</h2>
    </div>
    <div style="border: 1px solid #e2e8f0; border-top: 0; padding: 24px; border-radius: 0 0 8px 8px;">
      <h3 style="margin-top: 0;">${title}</h3>
      ${bodyLines.map((line) => `<p style="line-height: 1.5;">${line}</p>`).join("")}
      <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
        This is an automated message from the University Administration &amp; Application Management System.
      </p>
    </div>
  </div>`;
}

/** Writes an emailLogs record — every send attempt goes through here exactly once. */
export async function createEmailLog({ userId, applicationId, recipientEmail, emailType, subject, htmlTemplateName, deliveryStatus, errorMessage = null }) {
  const ref = await adminDb.collection("emailLogs").add({
    userId: userId || null,
    applicationId: applicationId || null,
    recipientEmail,
    emailType,
    subject,
    htmlTemplateName,
    deliveryStatus,
    errorMessage,
    createdAt: FieldValue.serverTimestamp(),
    sentAt: deliveryStatus === "sent" ? FieldValue.serverTimestamp() : null,
  });
  return ref.id;
}

// One internal path for every email type — the exported functions below are
// thin wrappers that fill in type, subject and body.
async function send({ userId, applicationId, recipientEmail, emailType, subject, htmlTemplateName, html }) {
  if (!smtpConfigured) {
    await createEmailLog({
      userId, applicationId, recipientEmail, emailType, subject, htmlTemplateName,
      deliveryStatus: "simulated",
    });
    return { delivered: false, simulated: true };
  }

  try {
    await transporter().sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: recipientEmail,
      subject,
      html,
    });
    await createEmailLog({
      userId, applicationId, recipientEmail, emailType, subject, htmlTemplateName,
      deliveryStatus: "sent",
    });
    return { delivered: true, simulated: false };
  } catch (error) {
    // A failed email must never break the decision that triggered it — log it
    // in both places and let the caller carry on.
    await createEmailLog({
      userId, applicationId, recipientEmail, emailType, subject, htmlTemplateName,
      deliveryStatus: "failed", errorMessage: error.message,
    });
    await logEmailError(userId, `Failed to send ${emailType} email: ${error.message}`);
    return { delivered: false, simulated: false, error: error.message };
  }
}

/** Submission confirmation — PRD email event: application submitted. */
export function sendApplicationSubmittedEmail({ userId, applicationId, recipientEmail, studentName, universityName, courseName }) {
  return send({
    userId, applicationId, recipientEmail,
    emailType: "submission",
    subject: "Your application has been submitted",
    htmlTemplateName: "application-submitted",
    html: htmlShell("Application submitted", [
      `Dear ${studentName},`,
      `Your application for <strong>${courseName}</strong> at <strong>${universityName}</strong> has been received and is now with the admissions team.`,
      `You can track its status from your dashboard at any time.`,
    ]),
  });
}

/** Generic status change notice — PRD email event: status update. */
export function sendStatusUpdateEmail({ userId, applicationId, recipientEmail, studentName, universityName, newStatusLabel }) {
  return send({
    userId, applicationId, recipientEmail,
    emailType: "status_update",
    subject: "Your application status has changed",
    htmlTemplateName: "status-update",
    html: htmlShell("Application update", [
      `Dear ${studentName},`,
      `Your application to <strong>${universityName}</strong> is now: <strong>${newStatusLabel}</strong>.`,
      `Sign in to your dashboard for the details.`,
    ]),
  });
}

/** Offer notification — PRD email event: offer. */
export function sendOfferEmail({ userId, applicationId, recipientEmail, studentName, universityName, courseName, decisionMessage }) {
  return send({
    userId, applicationId, recipientEmail,
    emailType: "offer",
    subject: `Offer from ${universityName}`,
    htmlTemplateName: "offer-email",
    html: htmlShell("Congratulations — you have an offer!", [
      `Dear ${studentName},`,
      `<strong>${universityName}</strong> is pleased to offer you a place on <strong>${courseName}</strong>.`,
      decisionMessage ? `Message from the admissions team: "${decisionMessage}"` : "",
      `Sign in to your dashboard to view your offer.`,
    ].filter(Boolean)),
  });
}

/** Rejection notification — PRD email event: rejection. */
export function sendRejectionEmail({ userId, applicationId, recipientEmail, studentName, universityName, courseName, decisionMessage }) {
  return send({
    userId, applicationId, recipientEmail,
    emailType: "rejection",
    subject: `Update on your application to ${universityName}`,
    htmlTemplateName: "rejection-email",
    html: htmlShell("Application decision", [
      `Dear ${studentName},`,
      `After careful consideration, <strong>${universityName}</strong> is unable to offer you a place on <strong>${courseName}</strong> at this time.`,
      decisionMessage ? `Message from the admissions team: "${decisionMessage}"` : "",
      `We wish you every success with your future applications.`,
    ].filter(Boolean)),
  });
}

/** Missing documents request — PRD / Sprint 3 email event: missing documents. */
export function sendMissingDocumentsEmail({
  userId,
  applicationId,
  recipientEmail,
  studentName,
  universityName,
  courseName,
  missingDocumentTypes = [],
  message = "",
}) {
  const documentLabels = missingDocumentTypes
    .map((type) => DOC_TYPE_LABELS[type] || type)
    .join(", ");

  const lines = [
    `Dear ${studentName},`,
    `<strong>${universityName}</strong> has reviewed your application for <strong>${courseName}</strong> and requires additional documents before your application can proceed.`,
    documentLabels ? `Requested document(s): <strong>${documentLabels}</strong>` : "",
    message ? `Message from the admissions team: "${message}"` : "",
    `Please sign in to your account and upload the required document(s) directly on your application page:`,
    `<a href="/applications/${applicationId}">View application and upload documents</a>`,
  ].filter(Boolean);

  return send({
    userId,
    applicationId,
    recipientEmail,
    emailType: "missing_documents",
    subject: `Action required: Missing documents for your application to ${universityName}`,
    htmlTemplateName: "missing-documents",
    html: htmlShell("Missing documents requested", lines),
  });
}

