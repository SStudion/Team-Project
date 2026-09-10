// lib/validation/applicationValidation.js
//
// Submission gate. Per PRD 4.2.3 an application needs complete personal,
// academic and course information before it can be submitted — this runs
// before the draft → submitted flip and returns per-field errors the form
// can render next to each input.

// Each entry: [section, field, label shown to the user]
const REQUIRED_FIELDS = [
  ["personalInfo", "fullName",       "Full name"],
  ["personalInfo", "dateOfBirth",    "Date of birth"],
  ["personalInfo", "nationality",    "Nationality"],
  ["personalInfo", "passportNumber", "Passport number"],
  ["academicInfo", "highestQualification", "Highest qualification"],
  ["academicInfo", "institution",    "Institution"],
  ["academicInfo", "graduationYear", "Graduation year"],
  ["academicInfo", "gpa",            "GPA / grade"],
  ["courseInfo",   "courseName",     "Course"],
  ["courseInfo",   "intendedIntake", "Intended intake"],
];

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `value` is a well-formed "YYYY-MM-DD" date (exactly a 4-digit
 * year — rejects overflowed native <input type="date"> values like
 * "72006-03-11"), corresponds to a real calendar date, and isn't in the future.
 */
export function isValidDob(value) {
  if (typeof value !== "string" || !DOB_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealCalendarDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isRealCalendarDate) return false;

  return date.getTime() <= Date.now();
}

/** Validates an application for submission per PRD 4.2.3 — returns { valid, errors } with one message per missing field. */
export function validateApplicationForSubmit(application) {
  const errors = {};

  for (const [section, field, label] of REQUIRED_FIELDS) {
    const value = application?.[section]?.[field];
    if (isEmpty(value)) {
      errors[`${section}.${field}`] = `${label} is required.`;
    }
  }

  // Date of birth gets a sanity check on top of presence — the native
  // <input type="date"> lets an overflowed year like "72006-03-11" through
  // on some browsers, and that shouldn't pass silently.
  if (!errors["personalInfo.dateOfBirth"] && !isValidDob(application?.personalInfo?.dateOfBirth)) {
    errors["personalInfo.dateOfBirth"] = "Enter a valid date of birth (not in the future).";
  }

  // Graduation year gets a sanity check on top of presence — "20222" passing
  // silently would look bad in an admin review.
  const year = Number(application?.academicInfo?.graduationYear);
  if (!errors["academicInfo.graduationYear"] && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1)) {
    errors["academicInfo.graduationYear"] = "Graduation year doesn't look right.";
  }

  if (isEmpty(application?.universityId)) {
    errors["universityId"] = "A university must be selected.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
