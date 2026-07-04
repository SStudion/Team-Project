// api/applications/[applicationId]/documents — POST register, GET list (student)
//
// Registration here is metadata-based: in live/emulator mode the browser
// uploads the file to Storage directly (the client SDK is the right tool for
// multipart file transfer) and then registers the metadata; in dummy mode
// there's no file at all. Either way this route validates and records — it
// never receives file bytes itself.

import { adminDb } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent, toErrorResponse, ApiError } from "@/lib/server/apiAuth";

const ALLOWED_TYPES = ["passport", "transcript", "certificate", "english_test"];
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

async function getOwnDraft(applicationId, student) {
  const snap = await adminDb.collection("applications").doc(applicationId).get();
  if (!snap.exists) throw new ApiError(404, "Application not found.");
  const app = snap.data();
  if (app.studentId !== student.uid) throw new ApiError(403, "This application isn't yours.");
  return app;
}

export async function POST(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;
    const app = await getOwnDraft(applicationId, student);

    if (app.status !== "draft") {
      throw new ApiError(409, "Documents can only be added while the application is a draft.");
    }

    const { fileType, fileName, mimeType, fileSize, storagePath = null, fileURL = null, isDummyFile = true } = await request.json();

    // Same validation the form and storage.rules apply — checked a third time
    // because this route can be called without either.
    if (!ALLOWED_TYPES.includes(fileType)) throw new ApiError(400, "Unknown document type.");
    const extension = (fileName || "").split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension) || !ALLOWED_MIME.includes(mimeType)) {
      throw new ApiError(400, "Only PDF, JPG, JPEG or PNG files are accepted.");
    }
    if (!fileSize || fileSize > MAX_BYTES) {
      throw new ApiError(400, "File is too large — the maximum size is 5MB.");
    }

    const ref = await adminDb.collection("documents").add({
      applicationId,
      studentId: student.uid,
      universityId: app.universityId,
      fileType,
      fileName,
      fileExtension: extension,
      mimeType,
      fileSize,
      storagePath,
      fileURL,
      isDummyFile,
      uploadedAt: FieldValue.serverTimestamp(),
      uploadedBy: student.uid,
    });

    // Keep the application's documentSummary rollup in step.
    await adminDb.collection("applications").doc(applicationId).update({
      "documentSummary.total": FieldValue.increment(1),
      [`documentSummary.byType.${fileType}`]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ documentId: ref.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request, { params }) {
  try {
    const student = await requireStudent(request);
    const { applicationId } = await params;
    await getOwnDraft(applicationId, student); // ownership check; any status may list

    const snap = await adminDb
      .collection("documents")
      .where("applicationId", "==", applicationId)
      .orderBy("uploadedAt", "desc")
      .get();

    return Response.json({ documents: snap.docs.map((d) => ({ documentId: d.id, ...d.data() })) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
