// constants/statuses.js
// The application lifecycle. These strings are the agreed contract with
// Firestore and the security rules — do not rename them casually; the rules
// compare against these exact values.
//
// draft -> submitted -> under_review -> offered | rejected
// "offered" IS the positive outcome; there's no separate "accepted" status.
//
// missing_documents is a Sprint 3 addition (client decision D-03/D-04, see
// docs/data-contract.md history) — a side branch off submitted/under_review,
// not a new terminal step:
//   submitted | under_review -> missing_documents -> under_review
// The client was explicit that a missing document must never cause an
// outright rejection, and that the student may complete just the missing
// document(s) without editing anything else already submitted. Requesting
// documents is an admin-only transition (mirrors offered/rejected — goes
// through the server, not a raw client write); returning to under_review
// once the student has uploaded is also server-side, not a status the
// student writes directly, to keep one audit trail for every transition
// instead of a special case. See decisionService.js (backend, Kristina) for
// where both of those need to be implemented — this file only defines the
// shared vocabulary the frontend and backend both read from.

export const STATUS = {
  DRAFT:              "draft",
  SUBMITTED:          "submitted",
  UNDER_REVIEW:       "under_review",
  MISSING_DOCUMENTS:  "missing_documents",
  OFFERED:            "offered",
  REJECTED:           "rejected",
};

// Human-readable labels for each status (used in UI badges)
export const STATUS_LABELS = {
  draft:              "Draft",
  submitted:           "Submitted",
  under_review:        "Under Review",
  missing_documents:   "Missing Documents",
  offered:             "Offered",
  rejected:            "Rejected",
};

// Tailwind colour classes for each status badge
export const STATUS_STYLES = {
  draft:              "bg-gray-100 text-gray-600",
  submitted:           "bg-blue-100 text-blue-700",
  under_review:        "bg-amber-100 text-amber-700",
  missing_documents:   "bg-orange-100 text-orange-700",
  offered:             "bg-green-100 text-green-700",
  rejected:            "bg-red-100 text-red-700",
};

// Which transitions each role is allowed to make. The rules enforce this
// server-side; having the same map here lets the UI disable invalid options
// instead of letting users hit permission errors.
//
// The student never appears as the mover for missing_documents -> under_review
// on purpose — that resubmission is triggered by the student's action (an
// upload) but applied server-side (see /api/applications/[id]/resubmit,
// currently a stub), the same way draft -> submitted is the one exception
// that already goes straight from the client today.
export const STUDENT_ALLOWED_TRANSITIONS = {
  draft: ["submitted"],
};

export const ADMIN_ALLOWED_TRANSITIONS = {
  submitted:    ["under_review", "offered", "rejected", "missing_documents"],
  under_review: ["offered", "rejected", "missing_documents"],
};

// Statuses that end the lifecycle — once here, nothing moves again.
export const FINAL_STATUSES = [STATUS.OFFERED, STATUS.REJECTED];
