// constants/roles.js
// The only two roles in the system — the PRD explicitly has no Super Admin,
// and admin accounts are seeded, never self-registered. Values must match
// users/{uid}.role in Firestore and the checks in firestore.rules.

export const ROLES = {
  STUDENT: "student",
  ADMIN:   "university_admin",
};
