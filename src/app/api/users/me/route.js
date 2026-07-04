// api/users/me — GET own profile, PATCH own profile

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, toErrorResponse } from "@/lib/server/apiAuth";

export async function GET(request) {
  try {
    const { uid, profile } = await requireUser(request);
    return Response.json({ uid, ...profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    const { uid } = await requireUser(request);
    const body = await request.json();

    // Role and university assignment are never editable through this route —
    // same freeze the Firestore rules apply to direct client writes.
    const { role, assignedUniversityId, uid: _, email, ...safe } = body;

    await adminDb.collection("users").doc(uid).update({
      ...safe,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
