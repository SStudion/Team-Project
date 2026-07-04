// lib/firebase/universities.js
// Read-only catalogue access — universities are seeded server-side and the
// rules block all client writes, so there are no create/update functions here.

import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./config";

/** Lists all universities for the application form dropdown. */
export async function listUniversities() {
  const snap = await getDocs(query(collection(db, "universities"), orderBy("name")));
  return snap.docs.map((d) => ({ universityId: d.id, ...d.data() }));
}

/** Fetches one university by ID. */
export async function getUniversity(universityId) {
  const snap = await getDoc(doc(db, "universities", universityId));
  if (!snap.exists()) throw new Error("University not found.");
  return { universityId: snap.id, ...snap.data() };
}

/** Returns a university's embedded courses array (courses live on the university doc — one read fills the whole course dropdown). */
export async function getUniversityCourses(universityId) {
  const uni = await getUniversity(universityId);
  return uni.courses || [];
}
