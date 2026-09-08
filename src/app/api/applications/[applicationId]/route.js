// api/applications/[applicationId] — GET one, PATCH draft, DELETE draft (student)

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { logPermissionViolation } from "@/lib/server/auditLogger";

// Ownership check shared by all three methods. Getting this wrong would let
// any student read any application by guessing IDs, so it's one function used
// everywhere rather than three copies that could drift.
async function getOwnApplication(applicationId, student) {
  const snap = await adminDb.collection("applications").doc(applicationId).get();
  if (!snap.exists) throw new ApiError(404, "Application not found.");
  const app = snap.data();
  if (app.studentId !== student.uid) {
    await logPermissionViolation(student.uid, `Student attempted access to another student's application ${applicationId}`);
    throw new ApiError(403, "This application isn't yours.");
  }
  return { snap, app };
}

export async function GET(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;
    const { snap, app } = await getOwnApplication(applicationId, student);
    return Response.json({ applicationId: snap.id, ...app });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;
    const { app } = await getOwnApplication(applicationId, student);

    if (app.status !== "draft") {
      throw new ApiError(409, "This application has been submitted and can no longer be edited.");
    }

    const { personalInfo, academicInfo, courseInfo } = await request.json();
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (personalInfo) updates.personalInfo = personalInfo;
    if (academicInfo) updates.academicInfo = academicInfo;
    if (courseInfo) updates.courseInfo = courseInfo;

    await adminDb.collection("applications").doc(applicationId).update(updates);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;
    const { app } = await getOwnApplication(applicationId, student);

    if (app.status !== "draft") {
      throw new ApiError(409, "Submitted applications can't be deleted.");
    }

    await adminDb.collection("applications").doc(applicationId).delete();
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
