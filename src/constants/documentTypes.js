// constants/documentTypes.js
// Document categories and upload validation limits. The same limits appear in
// storage.rules — if either side changes, change both, or uploads that pass the
// form will bounce off the rules.

export const DOC_TYPES = {
  PASSPORT:     "passport",
  TRANSCRIPT:   "transcript",
  CERTIFICATE:  "certificate",
  ENGLISH_TEST: "english_test",
};

export const DOC_TYPE_LABELS = {
  passport:     "Passport Copy",
  transcript:   "Academic Transcripts",
  certificate:  "Certificates",
  english_test: "English Language Test",
};

// 5MB cap, PDF/JPG/PNG only. Note: browsers report both .jpg and .jpeg as
// image/jpeg, so three MIME types cover the four extensions the PRD lists.
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export const ALLOWED_FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
