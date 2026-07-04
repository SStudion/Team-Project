// lib/firebase/users.js
// Own-profile reads and writes. The security rules only allow access to your
// own users doc, so every function here works off the signed-in uid.

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

function requireUid() {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in to do that.");
  return user.uid;
}

/** Returns the signed-in user's profile document. */
export async function getMyProfile() {
  const uid = requireUid();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("Your profile could not be found.");
  return { uid: snap.id, ...snap.data() };
}

/** Updates the signed-in user's own profile fields (role/university are locked by the rules). */
export async function updateMyProfile(updates) {
  const uid = requireUid();

  // Strip anything the rules would reject anyway — cleaner to never send it
  // than to let a permission error surface for a field the UI shouldn't edit.
  const { role, assignedUniversityId, uid: _, ...safe } = updates;

  await updateDoc(doc(db, "users", uid), {
    ...safe,
    updatedAt: serverTimestamp(),
  });
}

/** Returns just the role string — used for route protection per PRD role-based access. */
export async function getMyRole() {
  const profile = await getMyProfile();
  return profile.role;
}
