// api/universities/[universityId] — GET one university

import { adminDb } from "@/lib/server/firebaseAdmin";
import { requireUser, toErrorResponse, ApiError } from "@/lib/server/apiAuth";

export async function GET(request, { params }) {
  try {
    await requireUser(request);
    const { universityId } = await params; // Next.js 16: params is async

    const snap = await adminDb.collection("universities").doc(universityId).get();
    if (!snap.exists) throw new ApiError(404, "University not found.");

    return Response.json({ universityId: snap.id, ...snap.data() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
