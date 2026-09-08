// lib/validation/documentValidation.js
// File checks before anything is uploaded or registered. Same limits as
// storage.rules — this copy gives the user a friendly message up front, the
// rules copy makes the limit impossible to bypass.

import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_FILE_EXTENSIONS,
} from "@/constants";

/** Validates an upload candidate (type + 5MB size per PRD) — returns { valid, error }. */
export function validateDocumentFile(file) {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const extension = (file.name.split(".").pop() || "").toLowerCase();

  // Check both the extension and the MIME type — a .pdf named .jpg fails one
  // or the other, and either way it's not getting in.
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension) || !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Only PDF, JPG, JPEG or PNG files are accepted.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "File is too large — the maximum size is 5MB.",
    };
  }

  return { valid: true, error: null };
}
