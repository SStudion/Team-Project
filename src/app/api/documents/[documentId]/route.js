// api/documents/[documentId] — GET metadata, DELETE (student or admin read; student delete)

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, toErrorResponse, ApiError } from "@/lib/server/apiAuth";
import { logPermissionViolation } from "@/lib/server/auditLogger";

async function getDocument(documentId) {
  const snap = await adminDb.collection("documents").doc(documentId).get();
  if (!snap.exists) throw new ApiError(404, "Document not found.");
  return { documentId: snap.id, ...snap.data() };
}

export async function GET(request, { params }) {
  try {
    const caller = await requireUser(request);
    const { documentId } = await params;
    const docMeta = await getDocument(documentId);

    // Mirrors firestore.rules: the owning student, or an admin of the
    // document's university. Anyone else is a logged violation.
    const isOwner = caller.profile.role === "student" && docMeta.studentId === caller.uid;
    const isScopedAdmin =
      caller.profile.role === "university_admin" &&
      caller.profile.assignedUniversityId === docMeta.universityId;

    if (!isOwner && !isScopedAdmin) {
      await logPermissionViolation(caller.uid, `Blocked document metadata access: ${documentId}`);
      throw new ApiError(403, "You don't have access to this document.");
    }

    return Response.json(docMeta);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const caller = await requireUser(request);
    const { documentId } = await params;
    const docMeta = await getDocument(documentId);

    if (caller.profile.role !== "student" || docMeta.studentId !== caller.uid) {
      await logPermissionViolation(caller.uid, `Blocked document delete: ${documentId}`);
      throw new ApiError(403, "Only the owning student can remove a document.");
    }

    const appSnap = await adminDb.collection("applications").doc(docMeta.applicationId).get();
    if (appSnap.exists && appSnap.data().status !== "draft") {
      throw new ApiError(409, "Documents can't be removed after submission.");
    }

    // Metadata first here (opposite order to the client service) because the
    // Admin SDK is also what cleans up Storage in live mode — done via the
    // storagePath if one exists.
    await adminDb.collection("documents").doc(documentId).delete();

    await adminDb.collection("applications").doc(docMeta.applicationId).update({
      "documentSummary.total": FieldValue.increment(-1),
      [`documentSummary.byType.${docMeta.fileType}`]: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
