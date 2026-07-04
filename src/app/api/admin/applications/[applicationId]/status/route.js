// api/admin/applications/[applicationId]/status — PATCH (admin)
// Non-final status changes (in practice: picking an application up for review).
// Final decisions go through /decision so the message + audit intent is explicit.

import { requireAdmin, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { updateApplicationStatus } from "@/lib/server/decisionService";

export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await params;
    const { status } = await request.json();

    if (!status) throw new ApiError(400, "status is required.");

    const result = await updateApplicationStatus({ applicationId, admin, newStatus: status });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
