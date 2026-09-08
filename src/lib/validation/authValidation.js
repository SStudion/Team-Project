// lib/validation/authValidation.js
// Registration form validation. Mirrors the PRD's registration fields: name,
// email, password, nationality, level of study, privacy policy acceptance.

import { STUDY_LEVELS } from "@/constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates the registration form per PRD registration requirements — returns { valid, errors } keyed by field name. */
export function validateRegistration({ fullName, email, password, nationality, intendedLevelOfStudy, privacyPolicyAccepted }) {
  const errors = {};

  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = "Please enter your full name.";
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  const passwordError = checkPasswordStrength(password);
  if (passwordError) errors.password = passwordError;

  if (!nationality || nationality.trim() === "") {
    errors.nationality = "Please enter your nationality.";
  }

  if (!STUDY_LEVELS.includes(intendedLevelOfStudy)) {
    errors.intendedLevelOfStudy = "Please select your intended level of study.";
  }

  // Consent has to be an explicit tick, every time — this is the GDPR reason
  // we don't offer Google sign-in at all.
  if (privacyPolicyAccepted !== true) {
    errors.privacyPolicyAccepted = "You must accept the privacy policy to register.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Password strength: 8+ chars with at least one letter and one number. Returns an error message or null. */
export function checkPasswordStrength(password) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
