// api/universities — GET
// The catalogue, for the application form. Any signed-in user may read it.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { requireUser, toErrorResponse } from "@/lib/server/apiAuth";

export async function GET(request) {
  try {
    await requireUser(request);
    const snap = await adminDb.collection("universities").orderBy("name").get();
    const universities = snap.docs.map((d) => ({ universityId: d.id, ...d.data() }));
    return Response.json({ universities });
  } catch (error) {
    return toErrorResponse(error);
  }
}
