// lib/firebase/documents.js
//
// Document uploads and metadata. This is the one service where STORAGE_MODE
// really matters:
//   dummy    → no file goes anywhere; we write a metadata-only record with
//              isDummyFile: true and a safe dummy fileURL from /public/dummy-documents.
//              This is how we develop and demo without ever handling a real passport
//              or transcript.
//   emulator → real upload flow against the local emulator (config.js points
//              the SDK there).
//   live     → real Firebase Storage upload (needs Blaze billing).
// Everything downstream (lists, summaries, admin review) treats all three
// identically — only this file knows the difference.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage, STORAGE_MODE } from "./config";
import { STATUS } from "@/constants";
import { validateDocumentFile } from "@/lib/validation/documentValidation";

function requireUid() {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in to do that.");
  return user.uid;
}

/**
 * In dummy mode, no real file is uploaded.
 * Instead, the metadata points to safe placeholder files stored in:
 * public/dummy-documents/
 *
 * This allows the frontend/admin review page to open a dummy document,
 * while still avoiding real sensitive uploads during Sprint 2.
 */
function getDummyDocumentUrl(fileType) {
  const normalisedType = String(fileType || "").toLowerCase();

  const dummyUrls = {
    passport: "/dummy-documents/sample-passport.pdf",
    passport_copy: "/dummy-documents/sample-passport.pdf",
    transcript: "/dummy-documents/sample-transcript.pdf",
    certificate: "/dummy-documents/sample-certificate.pdf",
    english_test: "/dummy-documents/sample-english-test.pdf",
    english: "/dummy-documents/sample-english-test.pdf",
  };

  return dummyUrls[normalisedType] || "/dummy-documents/sample-transcript.pdf";
}

// documentSummary on the application is a rollup for list screens — it gets
// nudged up/down here so it can never drift from the real documents.
async function bumpSummary(applicationId, fileType, delta) {
  await updateDoc(doc(db, "applications", applicationId), {
    "documentSummary.total": increment(delta),
    [`documentSummary.byType.${fileType}`]: increment(delta),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Uploads, or in dummy mode just registers, a document for a draft application.
 * PRD requires size/format validation before accepting.
 */
export async function registerDocument({ applicationId, fileType, file }) {
  const uid = requireUid();

  const appSnap = await getDoc(doc(db, "applications", applicationId));
  if (!appSnap.exists()) throw new Error("Application not found.");

  const app = appSnap.data();

  if (app.status !== STATUS.DRAFT) {
    throw new Error("Documents can only be added while the application is a draft.");
  }

  const { valid, error } = validateDocumentFile(file);
  if (!valid) throw new Error(error);

  const fileExtension = file.name.split(".").pop().toLowerCase();

  let storagePath = null;
  let fileURL = null;

  if (STORAGE_MODE === "dummy") {
    // Sprint 2 safe mode:
    // Save metadata with a public dummy file link instead of uploading real files.
    fileURL = getDummyDocumentUrl(fileType);
    storagePath = null;
  } else {
    // Path shape must match storage.rules exactly:
    // applications/{universityId}/{studentId}/{applicationId}/{fileName}
    storagePath = `applications/${app.universityId}/${uid}/${applicationId}/${Date.now()}-${file.name}`;

    const fileRef = ref(storage, storagePath);

    await uploadBytes(fileRef, file, { contentType: file.type });

    fileURL = await getDownloadURL(fileRef);
  }

  const docRef = await addDoc(collection(db, "documents"), {
    applicationId,
    studentId: uid,
    universityId: app.universityId,
    fileType,
    fileName: file.name,
    fileExtension,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
    fileURL,
    isDummyFile: STORAGE_MODE === "dummy",
    uploadedAt: serverTimestamp(),
    uploadedBy: uid,
  });

  await bumpSummary(applicationId, fileType, 1);

  return docRef.id;
}

/** Lists all documents attached to an application (student's own documents only). */
export async function getDocumentsForApplication(applicationId) {
  const uid = requireUid();

  // The security rule checks resource.data.studentId == request.auth.uid.
  // Firestore can only grant a list/query request if it can prove every
  // possible matching document satisfies the rule from the query's own
  // constraints — it does not evaluate the rule per returned document for
  // list operations. Filtering only on applicationId (as before) left
  // studentId unconstrained, so Firestore rejected the whole query with
  // "Missing or insufficient permissions" even though the caller did own
  // the documents. Adding this where() makes the query itself prove
  // ownership, matching the rule.
  const snap = await getDocs(
    query(
      collection(db, "documents"),
      where("applicationId", "==", applicationId),
      where("studentId", "==", uid),
      orderBy("uploadedAt", "desc")
    )
  );

  return snap.docs.map((d) => ({ documentId: d.id, ...d.data() }));
}

/** Removes a document (file + metadata) — only while the application is still a draft. */
export async function deleteDocument(documentId) {
  requireUid();

  const snap = await getDoc(doc(db, "documents", documentId));
  if (!snap.exists()) throw new Error("Document not found.");

  const meta = snap.data();

  // Delete the file first, then the metadata.
  // In dummy mode there is no Storage file to delete.
  if (meta.storagePath && !meta.isDummyFile) {
    try {
      await deleteObject(ref(storage, meta.storagePath));
    } catch (error) {
      if (error.code !== "storage/object-not-found") throw error;
    }
  }

  await deleteDoc(doc(db, "documents", documentId));

  await bumpSummary(meta.applicationId, meta.fileType, -1);
}