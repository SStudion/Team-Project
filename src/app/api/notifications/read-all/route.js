// api/notifications/read-all — POST
// Marks all of the caller's unread notifications read in one batch.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, toErrorResponse } from "@/lib/server/apiAuth";

export async function POST(request) {
  try {
    const { uid } = await requireUser(request);

    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", uid)
      .where("readStatus", "==", false)
      .get();

    if (snap.empty) return Response.json({ ok: true, updated: 0 });

    const batch = adminDb.batch();
    snap.docs.forEach((d) => {
      batch.update(d.ref, { readStatus: true, readAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();

    return Response.json({ ok: true, updated: snap.size });
  } catch (error) {
    return toErrorResponse(error);
  }
}
