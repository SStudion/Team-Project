// lib/firebase/applications.js
//
// The student side of the application lifecycle. Admin actions (status changes,
// decisions) are NOT here — they go through the server-side decision service,
// because they trigger audit records and emails that a client shouldn't be
// trusted to write itself.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./config";
import { STATUS } from "@/constants";
import { getMyProfile } from "./users";

function requireUid() {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in to do that.");
  return user.uid;
}

/** Creates a new draft application — starts as "draft" so admins can't see it before the student submits. */
export async function createDraftApplication({ universityId, personalInfo = {}, academicInfo = {}, courseInfo = {} }) {
  const uid = requireUid();

  // Denormalised copies of the student's and university's names go on the
  // application so the admin dashboard renders its list from one query.
  // The data contract explains this trade-off properly.
  const profile = await getMyProfile();
  const universityNames = {
  "uni_solent":      "Southampton Solent University",
  "uni_southampton": "University of Southampton",
  "uni_portsmouth":  "University of Portsmouth",
  };
  const university = { name: universityNames[universityId] ?? "Unknown University" };

  const ref = await addDoc(collection(db, "applications"), {
    studentId: uid,
    studentName: profile.fullName,
    studentEmail: profile.email ?? auth.currentUser?.email ?? "",
    universityId,
    universityName: university.name,
    status: STATUS.DRAFT,
    personalInfo,
    academicInfo,
    courseInfo,
    documentSummary: {
      total: 0,
      byType: { passport: 0, transcript: 0, certificate: 0, english_test: 0 },
    },
    adminReview: {
      reviewedBy: null,
      reviewedAt: null,
      latestDecisionMessage: "",
      internalNotesCount: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAt: null,
    decidedAt: null,
  });

  return ref.id;
}

/** Returns all of the signed-in student's applications, newest first. */
export async function getMyApplications() {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      collection(db, "applications"),
      where("studentId", "==", uid),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ applicationId: d.id, ...d.data() }));
}

/** Fetches a single application (rules ensure it's the student's own). */
export async function getApplication(applicationId) {
  const snap = await getDoc(doc(db, "applications", applicationId));
  if (!snap.exists()) throw new Error("Application not found.");
  return { applicationId: snap.id, ...snap.data() };
}

/** Updates the form sections of a draft — refused once submitted, matching the rules. */
export async function updateDraftApplication(applicationId, { personalInfo, academicInfo, courseInfo }) {
  const app = await getApplication(applicationId);
  if (app.status !== STATUS.DRAFT) {
    throw new Error("This application has been submitted and can no longer be edited.");
  }

  const updates = { updatedAt: serverTimestamp() };
  if (personalInfo) updates.personalInfo = personalInfo;
  if (academicInfo) updates.academicInfo = academicInfo;
  if (courseInfo) updates.courseInfo = courseInfo;

  await updateDoc(doc(db, "applications", applicationId), updates);
}

/** Deletes a draft — the rules refuse this for anything already submitted. */
export async function deleteDraftApplication(applicationId) {
  const app = await getApplication(applicationId);
  if (app.status !== STATUS.DRAFT) {
    throw new Error("Submitted applications can't be deleted.");
  }
  await deleteDoc(doc(db, "applications", applicationId));
}
