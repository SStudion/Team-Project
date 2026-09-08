// lib/server/adminStudentService.js
//
// ⚠️ SERVER ONLY — never import this from a client component.
//
// Read-side query for the Admin > Students screen (Sprint 3 frontend item 3:
// "list of students who applied"). There's no separate `students` collection
// in the data contract — a "student who applied" is just the distinct set of
// studentIds on this university's applications — so this derives the list
// from `applications` instead of duplicating student data into its own
// collection. Same "Sprint 1/PoC safe query" approach as
// adminApplicationService: scope by university on the server, then group in
// code rather than reaching for a composite index for what is still a small
// demo dataset.

import { adminDb } from "./firebaseAdmin";

/** Lists distinct students with at least one non-draft application to the admin's university, with a small per-student activity summary. */
export async function listUniversityStudents({ admin }) {
  const snap = await adminDb
    .collection("applications")
    .where("universityId", "==", admin.universityId)
    .get();

  const applications = snap.docs
    .map((d) => ({ applicationId: d.id, ...d.data() }))
    .filter((app) => app.status !== "draft");

  const byStudent = new Map();

  for (const app of applications) {
    const activityAt = app.updatedAt ?? app.submittedAt ?? app.createdAt ?? null;
    const activityMillis = activityAt?.toMillis?.() ?? 0;

    const existing = byStudent.get(app.studentId);
    if (!existing) {
      byStudent.set(app.studentId, {
        studentId: app.studentId,
        studentName: app.studentName,
        studentEmail: app.studentEmail,
        applicationsCount: 1,
        latestStatus: app.status,
        lastActivityAt: activityAt,
        _lastActivityMillis: activityMillis, // stripped before the response goes out
      });
      continue;
    }

    existing.applicationsCount += 1;
    if (activityMillis >= existing._lastActivityMillis) {
      existing.latestStatus = app.status;
      existing.lastActivityAt = activityAt;
      existing._lastActivityMillis = activityMillis;
    }
  }

  const students = Array.from(byStudent.values())
    .sort((a, b) => b._lastActivityMillis - a._lastActivityMillis)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to strip it from the response
    .map(({ _lastActivityMillis, ...rest }) => rest);

  return { students };
}
