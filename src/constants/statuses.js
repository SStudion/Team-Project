// constants/statuses.js
// The application lifecycle. These five strings are the agreed contract with
// Firestore and the security rules — do not rename them casually; the rules
// compare against these exact values.
//
// draft -> submitted -> under_review -> offered | rejected
// "offered" IS the positive outcome; there's no separate "accepted" status.

export const STATUS = {
  DRAFT:        "draft",
  SUBMITTED:    "submitted",
  UNDER_REVIEW: "under_review",
  OFFERED:      "offered",
  REJECTED:     "rejected",
};

// Human-readable labels for each status (used in UI badges)
export const STATUS_LABELS = {
  draft:        "Draft",
  submitted:    "Submitted",
  under_review: "Under Review",
  offered:      "Offered",
  rejected:     "Rejected",
};

// Tailwind colour classes for each status badge
export const STATUS_STYLES = {
  draft:        "bg-gray-100 text-gray-600",
  submitted:    "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  offered:      "bg-green-100 text-green-700",
  rejected:     "bg-red-100 text-red-700",
};

// Which transitions each role is allowed to make. The rules enforce this
// server-side; having the same map here lets the UI disable invalid options
// instead of letting users hit permission errors.
export const STUDENT_ALLOWED_TRANSITIONS = {
  draft: ["submitted"],
};

export const ADMIN_ALLOWED_TRANSITIONS = {
  submitted:    ["under_review", "offered", "rejected"],
  under_review: ["offered", "rejected"],
};

// Statuses that end the lifecycle — once here, nothing moves again.
export const FINAL_STATUSES = [STATUS.OFFERED, STATUS.REJECTED];
