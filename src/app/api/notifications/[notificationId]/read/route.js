// api/notifications/[notificationId]/read — PATCH
// Marks one notification read. Ownership is checked server-side — the id in
// the URL isn't trusted to belong to the caller.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, toErrorResponse, ApiError } from "@/lib/server/apiAuth";

export async function PATCH(request, { params }) {
  try {
    const { uid } = await requireUser(request);
    const { notificationId } = await params;

    const ref = adminDb.collection("notifications").doc(notificationId);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Notification not found.");
    if (snap.data().userId !== uid) throw new ApiError(403, "This notification isn't yours.");

    await ref.update({ readStatus: true, readAt: FieldValue.serverTimestamp() });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
