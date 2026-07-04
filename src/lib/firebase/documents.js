// lib/firebase/documents.js
//
// Document uploads and metadata. This is the one service where STORAGE_MODE
// really matters:
//   dummy    → no file goes anywhere; we write a metadata-only record with
//              isDummyFile: true. This is how we develop and demo without ever
//              handling a real passport or transcript.
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

// documentSummary on the application is a rollup for list screens — it gets
// nudged up/down here so it can never drift from the real documents.
async function bumpSummary(applicationId, fileType, delta) {
  await updateDoc(doc(db, "applications", applicationId), {
    "documentSummary.total": increment(delta),
    [`documentSummary.byType.${fileType}`]: increment(delta),
    updatedAt: serverTimestamp(),
  });
}

/** Uploads (or, in dummy mode, just registers) a document for a draft application — PRD requires size/format validation before accepting. */
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

  if (STORAGE_MODE !== "dummy") {
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

/** Lists all documents attached to an application. */
export async function getDocumentsForApplication(applicationId) {
  const snap = await getDocs(
    query(
      collection(db, "documents"),
      where("applicationId", "==", applicationId),
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

  // Delete the file first, then the metadata — if the Storage delete fails we
  // still have the record pointing at the orphan, rather than the reverse.
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
