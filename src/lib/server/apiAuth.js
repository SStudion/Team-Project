// lib/server/apiAuth.js
//
// ⚠️ SERVER ONLY — never import this from a client component.
//
// Role enforcement for the API routes. firestore.rules already protects direct
// client → Firestore access, but the API routes run with the Admin SDK, which
// bypasses rules entirely — so every route has to re-check identity and role
// here, at the API layer, before touching anything. Relying on the rules alone
// would leave the server-triggered actions wide open.
//
// Callers authenticate by sending their Firebase ID token:
//   Authorization: Bearer <idToken>

import { adminAuth, adminDb } from "./firebaseAdmin";
import { logAuthFailure, logPermissionViolation } from "./auditLogger";

// Routes catch this and turn .status/.message into the HTTP response.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Verifies the Bearer token and loads the caller's profile doc. Throws 401 if either fails. */
export async function requireUser(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, "Not signed in.");
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    await logAuthFailure(null, "API request with invalid or expired ID token");
    throw new ApiError(401, "Session expired — please sign in again.");
  }

  const snap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!snap.exists) {
    await logAuthFailure(decoded.uid, "Authenticated user has no profile document");
    throw new ApiError(401, "Account profile not found.");
  }

  return { uid: decoded.uid, profile: snap.data() };
}

/** Like requireUser, but the caller must be a student. */
export async function requireStudent(request) {
  const caller = await requireUser(request);
  if (caller.profile.role !== "student") {
    await logPermissionViolation(caller.uid, "Non-student called a student-only endpoint");
    throw new ApiError(403, "This action is only available to students.");
  }
  return caller;
}

/** Like requireUser, but the caller must be a university admin with an assigned university. */
export async function requireAdmin(request) {
  const caller = await requireUser(request);
  if (caller.profile.role !== "university_admin" || !caller.profile.assignedUniversityId) {
    await logPermissionViolation(caller.uid, "Non-admin called an admin-only endpoint");
    throw new ApiError(403, "This action is only available to university admins.");
  }
  return { ...caller, universityId: caller.profile.assignedUniversityId };
}

/** Standard error → JSON response mapping so every route handles failures the same way. */
export function toErrorResponse(error) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof ApiError ? error.message : "Something went wrong.";
  if (status === 500) console.error("API route error:", error);
  return Response.json({ error: message }, { status });
}
