// api/admin/applications/search — GET ?q= (admin)
// Search by student name (prefix match) or exact application ID, scoped to the
// admin's university.

import { requireAdmin, toErrorResponse } from "@/lib/server/apiAuth";
import { searchApplications } from "@/lib/server/adminApplicationService";

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    const url = new URL(request.url);
    const result = await searchApplications({ admin, term: url.searchParams.get("q") });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
