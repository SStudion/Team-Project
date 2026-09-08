// api/admin/applications/[applicationId]/decision — POST (admin)
//
// The final offer/reject call. One request fans out into the full PRD decision
// flow: application updated, decisionHistory record written, student notified
// in-app, decision email sent (or simulated) — all server-side, all atomic in
// intent, none of it spoofable from a browser.

import { requireAdmin, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { saveFinalDecision } from "@/lib/server/decisionService";

export async function POST(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await params;
    const { decision, decisionMessage = "" } = await request.json();

    if (!decision) throw new ApiError(400, "decision is required ('offered' or 'rejected').");

    const result = await saveFinalDecision({ applicationId, admin, decision, decisionMessage });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
