// api/admin/applications/counts — GET (admin)
// Per-status counts for the dashboard stat cards.

import { requireAdmin, toErrorResponse } from "@/lib/server/apiAuth";
import { getApplicationCounts } from "@/lib/server/adminApplicationService";

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    const counts = await getApplicationCounts({ admin });
    return Response.json(counts);
  } catch (error) {
    return toErrorResponse(error);
  }
}
