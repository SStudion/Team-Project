// api/admin/applications — GET (admin)
// The dashboard list: this university's applications, optional ?status= filter,
// cursor pagination via ?cursor= and ?pageSize=. Never returns drafts.

import { requireAdmin, toErrorResponse } from "@/lib/server/apiAuth";
import { listAssignedApplications } from "@/lib/server/adminApplicationService";

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    const url = new URL(request.url);

    const result = await listAssignedApplications({
      admin,
      status: url.searchParams.get("status"),
      pageSize: url.searchParams.get("pageSize"),
      cursor: url.searchParams.get("cursor"),
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
