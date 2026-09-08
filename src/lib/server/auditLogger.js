// lib/server/auditLogger.js
//
// ⚠️ SERVER ONLY — never import this from a client component.
//
// Writes to the systemLogs collection. The PRD asks for logging of auth
// failures, permission violations and email delivery errors — this is that,
// and nothing more. Logging must never break the flow it's logging, so every
// write is wrapped and failures fall back to console.error.

import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const LOG_TYPES = {
  AUTH_FAILURE: "auth_failure",
  PERMISSION_VIOLATION: "permission_violation",
  EMAIL_ERROR: "email_error",
};

async function write(type, userId, message) {
  try {
    await adminDb.collection("systemLogs").add({
      type,
      userId: userId || null,
      message,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // If even the logger fails, the console is the last resort — but the
    // request that triggered the log keeps going regardless.
    console.error("auditLogger failed:", type, message, error);
  }
}

/** Records a failed authentication attempt. */
export function logAuthFailure(userId, message) {
  return write(LOG_TYPES.AUTH_FAILURE, userId, message);
}

/** Records an attempt to do something the caller's role doesn't permit. */
export function logPermissionViolation(userId, message) {
  return write(LOG_TYPES.PERMISSION_VIOLATION, userId, message);
}

/** Records an email that failed to send. */
export function logEmailError(userId, message) {
  return write(LOG_TYPES.EMAIL_ERROR, userId, message);
}
