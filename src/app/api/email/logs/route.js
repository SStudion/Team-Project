// api/email/logs — GET (admin)
// The email evidence trail. emailLogs has no client access in firestore.rules,
// so this route is the only way to see it — and it filters to the admin's own
// university's applications.

import { requireAdmin, toErrorResponse } from "@/lib/server/apiAuth";
import { getEmailLogs } from "@/lib/server/adminApplicationService";

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    const url = new URL(request.url);
    const logs = await getEmailLogs({ admin, applicationId: url.searchParams.get("applicationId") });
    return Response.json({ emailLogs: logs });
  } catch (error) {
    return toErrorResponse(error);
  }
}
