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

    // Role, university assignment and email are never editable through this
    // route — same freeze the Firestore rules apply to direct client writes.
    // Stripped via delete (not destructure-to-omit) so there's no unused
    // binding for each field name — same denylist, same effect.
    const safe = { ...body };
    delete safe.role;
    delete safe.assignedUniversityId;
    delete safe.uid;
    delete safe.email;

    await adminDb.collection("users").doc(uid).update({
      ...safe,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
