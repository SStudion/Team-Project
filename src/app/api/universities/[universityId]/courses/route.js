// api/universities/[universityId]/courses — GET
// Courses are an embedded array on the university doc (see data contract), so
// this is a read of the parent with a projection, not a collection query.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { requireUser, toErrorResponse, ApiError } from "@/lib/server/apiAuth";

export async function GET(request, { params }) {
  try {
    await requireUser(request);
    const { universityId } = await params;

    const snap = await adminDb.collection("universities").doc(universityId).get();
    if (!snap.exists) throw new ApiError(404, "University not found.");

    return Response.json({ courses: snap.data().courses || [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
