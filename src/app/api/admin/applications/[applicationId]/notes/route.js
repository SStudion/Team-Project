// api/admin/applications/[applicationId]/notes — GET, POST (admin)
// Internal notes: admin-only commentary. Students have no route to this data —
// matching the internalNotes collection rules exactly.

import { requireAdmin, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { addInternalNote, getInternalNotes } from "@/lib/server/adminApplicationService";

export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await params;
    const notes = await getInternalNotes({ admin, applicationId });
    return Response.json({ internalNotes: notes });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await params;
    const { noteText } = await request.json();

    if (!noteText) throw new ApiError(400, "noteText is required.");

    const noteId = await addInternalNote({ admin, applicationId, noteText });
    return Response.json({ noteId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
