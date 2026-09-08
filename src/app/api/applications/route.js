// api/applications — POST create draft, GET my applications (student)

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent, toErrorResponse, ApiError } from "@/lib/server/apiAuth";

export async function POST(request) {
  try {
    const student = await requireStudent(request);
    const { universityId, personalInfo = {}, academicInfo = {}, courseInfo = {} } = await request.json();

    if (!universityId) throw new ApiError(400, "universityId is required.");

    const uniSnap = await adminDb.collection("universities").doc(universityId).get();
    if (!uniSnap.exists) throw new ApiError(404, "University not found.");

    // Same shape the client service creates — one contract, two entry points.
    const ref = await adminDb.collection("applications").add({
      studentId: student.uid,
      studentName: student.profile.fullName,
      studentEmail: student.profile.email,
      universityId,
      universityName: uniSnap.data().name,
      status: "draft",
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      submittedAt: null,
      decidedAt: null,
    });

    return Response.json({ applicationId: ref.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request) {
  try {
    const student = await requireStudent(request);
    const snap = await adminDb
      .collection("applications")
      .where("studentId", "==", student.uid)
      .orderBy("createdAt", "desc")
      .get();

    const applications = snap.docs.map((d) => ({ applicationId: d.id, ...d.data() }));
    return Response.json({ applications });
  } catch (error) {
    return toErrorResponse(error);
  }
}
