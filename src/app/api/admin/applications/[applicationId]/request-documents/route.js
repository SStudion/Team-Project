// api/admin/applications/[applicationId]/request-documents — POST (admin)
//
// Sprint 3 — missing document workflow (client decision D-03/D-04/D-09).
// Moves an application from submitted/under_review to missing_documents,
// telling the student which document(s) are needed, without touching any of
// the data they already submitted.
//
// Authenticates the university admin and delegates the missing-documents
// transition to requestMissingDocuments in decisionService.js.
//
// Note: firestore.rules updates belong to the separate Firestore rules task.

import { requireAdmin, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { requestMissingDocuments } from "@/lib/server/decisionService";

export async function POST(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await params;
    const { missingDocumentTypes, message = "" } = await request.json();

    if (!applicationId) throw new ApiError(400, "applicationId is required.");

    const result = await requestMissingDocuments({
      applicationId,
      admin,
      missingDocumentTypes,
      message,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
