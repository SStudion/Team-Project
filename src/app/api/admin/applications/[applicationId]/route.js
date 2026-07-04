// api/admin/applications/[applicationId] — GET (admin)
// Full review payload in one response: the application, its documents, internal
// notes and decision history — everything the review screen renders.

import { requireAdmin, toErrorResponse } from "@/lib/server/apiAuth";
import { getApplicationReviewData } from "@/lib/server/adminApplicationService";

export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await params;
    const data = await getApplicationReviewData({ admin, applicationId });
    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
