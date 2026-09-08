// lib/firebase/notifications.js
// Reading and marking notifications. Creation happens server-side (the decision
// service writes them together with the decision), so there's no create here —
// and the rules would refuse one anyway.

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./config";

function requireUid() {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in to do that.");
  return user.uid;
}

/** Returns the signed-in user's notifications, newest first. */
export async function getMyNotifications() {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ notificationId: d.id, ...d.data() }));
}

/** Returns how many notifications are unread — drives the badge in the sidebar. */
export async function getUnreadCount() {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      where("readStatus", "==", false)
    )
  );
  return snap.size;
}

/** Marks one notification as read. */
export async function markRead(notificationId) {
  await updateDoc(doc(db, "notifications", notificationId), {
    readStatus: true,
    readAt: serverTimestamp(),
  });
}

/** Marks all of the signed-in user's notifications as read in one batch. */
export async function markAllRead() {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      where("readStatus", "==", false)
    )
  );
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { readStatus: true, readAt: serverTimestamp() });
  });
  await batch.commit();
}
