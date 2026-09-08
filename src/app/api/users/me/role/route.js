// api/users/me/role — GET
// Just the role string — route guards use this without pulling the whole profile.

import { requireUser, toErrorResponse } from "@/lib/server/apiAuth";

export async function GET(request) {
  try {
    const { profile } = await requireUser(request);
    return Response.json({ role: profile.role });
  } catch (error) {
    return toErrorResponse(error);
  }
}
