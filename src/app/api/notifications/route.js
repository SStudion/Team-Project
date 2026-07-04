// api/notifications — GET my notifications (any signed-in user)

import { adminDb } from "@/lib/server/firebaseAdmin";
import { requireUser, toErrorResponse } from "@/lib/server/apiAuth";

export async function GET(request) {
  try {
    const { uid } = await requireUser(request);
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";

    let q = adminDb.collection("notifications").where("userId", "==", uid);
    if (unreadOnly) q = q.where("readStatus", "==", false);

    const snap = await q.orderBy("createdAt", "desc").limit(50).get();
    const notifications = snap.docs.map((d) => ({ notificationId: d.id, ...d.data() }));

    return Response.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.readStatus).length,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
