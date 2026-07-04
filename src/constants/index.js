// ─────────────────────────────────────────────────────────
// constants/index.js
//
// Barrel file. The values used to live in here directly; they're now split
// into roles / statuses / documentTypes so each area has one obvious home,
// but everything is re-exported from here so existing imports
// (`import { STATUS } from "@/constants"`) keep working untouched.
// ─────────────────────────────────────────────────────────

export { ROLES } from "./roles";

export {
  STATUS,
  STATUS_LABELS,
  STATUS_STYLES,
  STUDENT_ALLOWED_TRANSITIONS,
  ADMIN_ALLOWED_TRANSITIONS,
  FINAL_STATUSES,
} from "./statuses";

export {
  DOC_TYPES,
  DOC_TYPE_LABELS,
  REQUIRED_DOC_TYPES,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_FILE_EXTENSIONS,
} from "./documentTypes";

// Study levels — used in registration + application form
export const STUDY_LEVELS = ["Bachelor", "Master", "PhD"];

// App routes — never hardcode paths in components
export const ROUTES = {
  HOME:               "/",
  LOGIN:              "/login",
  REGISTER:           "/register",
  STUDENT_DASHBOARD:  "/dashboard",
  STUDENT_APPS:       "/applications",
  NEW_APPLICATION:    "/applications/new",
  ADMIN_DASHBOARD:  "/admin-dashboard",
  ADMIN_APPS:        "/admin-applications",
};
