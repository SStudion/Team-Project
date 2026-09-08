// lib/server/adminApplicationService.js
//
// ⚠️ SERVER ONLY — never import this from a client component.
//
// Read-side admin queries (list, counts, search, review data) and internal
// notes. Split out of decisionService so that file stays focused on the one
// thing that mutates the lifecycle. Every function takes the verified admin
// from apiAuth and scopes hard to their university — an admin can't reach
// another university's data by changing request parameters.

import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { ApiError } from "./apiAuth";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

// Shared guard: loads an application and checks it belongs to this admin's
// university before anything else happens.
async function getScopedApplication(applicationId, admin) {
  const snap = await adminDb.collection("applications").doc(applicationId).get();
  if (!snap.exists) throw new ApiError(404, "Application not found.");
  const app = snap.data();
  if (app.universityId !== admin.universityId) {
    throw new ApiError(403, "This application belongs to another university.");
  }
  return { applicationId: snap.id, ...app };
}

/** Lists the admin's university's applications with optional status filter and cursor pagination — PRD: admin dashboard list, paginated. */
export async function listAssignedApplications({
  admin,
  status = null,
  pageSize = PAGE_SIZE_DEFAULT,
  cursor = null,
}) {
  const size = Math.min(Number(pageSize) || PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);

  if (status === "draft") {
    throw new ApiError(403, "Draft applications are not visible to admins.");
  }

  // Sprint 1/PoC safe query:
  // Keep the Firestore query simple so it does not require a composite index.
  // We scope by university on the server, then filter/sort the small demo set in code.
  const snap = await adminDb
    .collection("applications")
    .where("universityId", "==", admin.universityId)
    .get();

  let applications = snap.docs
    .map((d) => ({
      applicationId: d.id,
      ...d.data(),
    }))
    .filter((app) => app.status !== "draft");

  if (status) {
    applications = applications.filter((app) => app.status === status);
  } else {
    applications = applications.filter((app) =>
      ["submitted", "under_review", "missing_documents", "offered", "rejected"].includes(app.status)
    );
  }

  applications.sort((a, b) => {
    const aTime =
      a.createdAt?.toMillis?.() ??
      a.submittedAt?.toMillis?.() ??
      a.updatedAt?.toMillis?.() ??
      0;

    const bTime =
      b.createdAt?.toMillis?.() ??
      b.submittedAt?.toMillis?.() ??
      b.updatedAt?.toMillis?.() ??
      0;

    return bTime - aTime;
  });

  const startIndex = cursor ? Number(cursor) || 0 : 0;
  const pagedApplications = applications.slice(startIndex, startIndex + size);

  const nextCursor =
    startIndex + size < applications.length ? String(startIndex + size) : null;

  return {
    applications: pagedApplications,
    nextCursor,
  };
}

/** Returns per-status counts for the admin dashboard stat cards. */
export async function getApplicationCounts({ admin }) {
  const statuses = ["submitted", "under_review", "missing_documents", "offered", "rejected"];
  const counts = {};

  // One aggregate count() per status — four cheap index hits instead of
  // downloading every document just to count it.
  for (const status of statuses) {
    const agg = await adminDb
      .collection("applications")
      .where("universityId", "==", admin.universityId)
      .where("status", "==", status)
      .count()
      .get();
    counts[status] = agg.data().count;
  }

  counts.total = statuses.reduce((sum, s) => sum + counts[s], 0);
  return counts;
}

/** Searches by student name or application ID within the admin's university — PRD: admin search. */
export async function searchApplications({ admin, term }) {
  const needle = (term || "").trim();
  if (!needle) return { applications: [] };

  // Direct ID hit first — cheap, and exactly what an admin pasting an ID wants.
  try {
    const byId = await getScopedApplication(needle, admin);
    if (byId.status !== "draft") return { applications: [byId] };
  } catch {
    // not an ID (or not ours) — fall through to the name search
  }

  // Firestore has no contains-search, so this is the standard prefix trick on
  // the denormalised studentName ( is the highest sensible code point,
  // making this "everything that starts with the term"). Good enough for a
  // dashboard search box; a proper text-search service is the upgrade path if
  // the client ever needs fuzzy matching.
  const snap = await adminDb
    .collection("applications")
    .where("universityId", "==", admin.universityId)
    .orderBy("studentName")
    .startAt(needle)
    .endAt(needle + "")
    .limit(25)
    .get();

  const applications = snap.docs
    .map((d) => ({ applicationId: d.id, ...d.data() }))
    .filter((a) => a.status !== "draft");

  return { applications };
}

/** Returns everything the review screen needs in one response: application, documents, notes, decision history. */
export async function getApplicationReviewData({ admin, applicationId }) {
  const application = await getScopedApplication(applicationId, admin);

  if (application.status === "draft") {
    throw new ApiError(403, "Draft applications are not visible to admins.");
  }

  // Sprint 1/PoC safe queries:
  // Avoid composite index requirements by querying by applicationId only,
  // then sorting notes/history in server code.
  const [docsSnap, notesSnap, historySnap] = await Promise.all([
    adminDb
      .collection("documents")
      .where("applicationId", "==", applicationId)
      .get(),

    adminDb
      .collection("internalNotes")
      .where("applicationId", "==", applicationId)
      .get(),

    adminDb
      .collection("decisionHistory")
      .where("applicationId", "==", applicationId)
      .get(),
  ]);

  const sortNewestFirst = (items) =>
    items.sort((a, b) => {
      const aTime =
        a.createdAt?.toMillis?.() ??
        a.updatedAt?.toMillis?.() ??
        0;

      const bTime =
        b.createdAt?.toMillis?.() ??
        b.updatedAt?.toMillis?.() ??
        0;

      return bTime - aTime;
    });

  const documents = docsSnap.docs.map((d) => ({
    documentId: d.id,
    ...d.data(),
  }));

  const internalNotes = sortNewestFirst(
    notesSnap.docs.map((d) => ({
      noteId: d.id,
      ...d.data(),
    }))
  );

  const decisionHistory = sortNewestFirst(
    historySnap.docs.map((d) => ({
      decisionId: d.id,
      ...d.data(),
    }))
  );

  return {
    application,
    documents,
    internalNotes,
    decisionHistory,
  };
}

/** Adds an internal note (admin-only commentary the student can never read) and bumps the count on the application. */
export async function addInternalNote({ admin, applicationId, noteText }) {
  const text = (noteText || "").trim();
  if (!text) throw new ApiError(400, "Note text is required.");

  const application = await getScopedApplication(applicationId, admin);

  const ref = await adminDb.collection("internalNotes").add({
    applicationId,
    universityId: application.universityId,
    noteText: text,
    createdBy: admin.uid,
    createdByName:
  admin.profile?.fullName ??
  admin.fullName ??
  admin.email ??
  "University Admin",
    visibility: "admin_only",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await adminDb.collection("applications").doc(applicationId).update({
    "adminReview.internalNotesCount": FieldValue.increment(1),
  });

  return ref.id;
}

/** Lists an application's internal notes, newest first. */
export async function getInternalNotes({ admin, applicationId }) {
  await getScopedApplication(applicationId, admin);
  const snap = await adminDb
    .collection("internalNotes")
    .where("applicationId", "==", applicationId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => ({ noteId: d.id, ...d.data() }));
}

/** Returns email logs, optionally filtered to one application — admin visibility into the PRD's email trail. */
export async function getEmailLogs({ admin, applicationId = null }) {
  let q = adminDb.collection("emailLogs").orderBy("createdAt", "desc").limit(50);
  if (applicationId) {
    await getScopedApplication(applicationId, admin); // scoping check
    q = adminDb
      .collection("emailLogs")
      .where("applicationId", "==", applicationId)
      .orderBy("createdAt", "desc");
  }
  const snap = await q.get();

  // Without an application filter, only return logs for this university's
  // students — an admin shouldn't browse another university's email trail.
  const logs = snap.docs.map((d) => ({ emailLogId: d.id, ...d.data() }));
  if (applicationId) return logs;

  const appIds = [...new Set(logs.map((l) => l.applicationId).filter(Boolean))];
  const allowed = new Set();
  await Promise.all(
    appIds.map(async (id) => {
      const s = await adminDb.collection("applications").doc(id).get();
      if (s.exists && s.data().universityId === admin.universityId) allowed.add(id);
    })
  );
  return logs.filter((l) => l.applicationId && allowed.has(l.applicationId));
}
