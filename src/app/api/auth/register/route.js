// api/auth/register — POST
// Server-side registration path. The client can also register directly through
// the Firebase SDK; this route exists so registration is possible with the same
// validation and audit behaviour from server contexts (seeding test students,
// demos) and to prove the client/server split works end to end.

import { adminAuth, adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { logAuthFailure } from "@/lib/server/auditLogger";
import { validateRegistration } from "@/lib/validation/authValidation";

export async function POST(request) {
  try {
    const body = await request.json();

    // Same validator the form uses — checked again here because an API caller
    // isn't obliged to have used our form.
    const { valid, errors } = validateRegistration(body);
    if (!valid) {
      return Response.json({ error: "Validation failed.", fieldErrors: errors }, { status: 400 });
    }

    const { fullName, email, password, nationality, intendedLevelOfStudy } = body;

    let userRecord;
    try {
      userRecord = await adminAuth.createUser({ email, password, displayName: fullName });
    } catch (error) {
      if (error.code === "auth/email-already-exists") {
        throw new ApiError(409, "An account with this email already exists.");
      }
      await logAuthFailure(null, `Registration failed for ${email}: ${error.message}`);
      throw new ApiError(400, "Could not create the account.");
    }

    // Role is hardcoded to student — there is no server or client path that
    // registers an admin; those are seeded deliberately.
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: "student",
      fullName,
      email,
      nationality,
      intendedLevelOfStudy,
      assignedUniversityId: null,
      emailVerified: false,
      privacyPolicyAccepted: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ uid: userRecord.uid }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
