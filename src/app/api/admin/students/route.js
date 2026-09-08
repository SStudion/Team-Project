// api/admin/students — GET (admin)
// Distinct students who've applied to the admin's university, derived from
// their applications — there's no separate "students" collection, see
// adminStudentService.js for why.

import { requireAdmin, toErrorResponse } from "@/lib/server/apiAuth";
import { listUniversityStudents } from "@/lib/server/adminStudentService";

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    const result = await listUniversityStudents({ admin });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
