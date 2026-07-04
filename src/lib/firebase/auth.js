// lib/firebase/auth.js
//
// Everything account-related: register, login, logout, password reset, email
// verification. Registration is student-only by design — admin accounts are
// seeded server-side, so there is deliberately no code path here that could
// create an admin.

import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import { ROLES } from "@/constants";

// Firebase error codes are cryptic ("auth/invalid-credential"), so I translate
// the common ones into messages the forms can show directly.
const FRIENDLY_ERRORS = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-credential":   "Email or password is incorrect.",
  "auth/invalid-email":        "That email address doesn't look valid.",
  "auth/weak-password":        "Password is too weak — use at least 8 characters.",
  "auth/too-many-requests":    "Too many attempts. Please wait a moment and try again.",
  "auth/user-not-found":       "No account found with this email.",
  "auth/network-request-failed": "Network problem — check your connection and try again.",
};

function friendly(error) {
  return new Error(FRIENDLY_ERRORS[error.code] || "Something went wrong. Please try again.");
}

/**
 * Registers a student user in Firebase Auth, then creates their Firestore
 * profile document. If profile creation fails, the Auth user is deleted so we
 * do not leave an orphaned login without a profile.
 */
export async function registerUser({ fullName, email, password, nationality, intendedLevelOfStudy }) {
  let credential;

  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Registration error:", error);
    throw friendly(error);
  }

  const user = credential.user;

  try {
    console.log("Writing to users/", user.uid, "| currently signed in as:", auth.currentUser?.uid);
    await setDoc(doc(db, "users", user.uid), {
      role: "student",
      fullName,
      nationality,
      intendedLevelOfStudy,
      privacyPolicyAccepted: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Firestore profile write error:", error);
    try {
      await deleteUser(user);
    } catch {
      // If cleanup fails, the main error below still explains what failed.
    }

    throw new Error(
      "Your account was created, but we could not save your profile. Please try registering again."
    );
  }

  return user;
}

/** Signs a user in with email/password and returns the Auth user. */
export async function loginUser(email, password) {
  let credential;

  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Login error:", error);
    throw friendly(error);
  }

  return credential.user;
}

/** Registers a student account (email/password + profile doc + verification email) — registration flow per PRD auth requirements. */
export async function registerStudent({ fullName, email, password, nationality, intendedLevelOfStudy, privacyPolicyAccepted }) {
  // The form validates too, but consent is a legal requirement, not a UX nicety —
  // so it's re-checked here where it can't be skipped.
  if (!privacyPolicyAccepted) {
    throw new Error("You must accept the privacy policy to register.");
  }

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw friendly(error);
  }

  const uid = credential.user.uid;

  // The users doc must satisfy the security rules: role "student" and
  // privacyPolicyAccepted true, or the write is refused.
  await setDoc(doc(db, "users", uid), {
    uid,
    role: ROLES.STUDENT,
    fullName,
    email,
    nationality,
    intendedLevelOfStudy,
    assignedUniversityId: null,
    emailVerified: false,
    privacyPolicyAccepted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  // Verification email per PRD auth requirements. If this fails we don't fail
  // the whole registration — the user can re-request from the login screen.
  try {
    await sendEmailVerification(credential.user);
  } catch {
    // logged server-side when the user next authenticates; registration stands
  }

  return credential.user;
}

/** Signs a user in and stamps lastLoginAt on their profile. */
export async function login(email, password) {
  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw friendly(error);
  }

  const uid = credential.user.uid;

  // Mirror emailVerified into the profile doc while we're here — Firestore
  // rules and admin views read the doc, not the Auth token.
  await updateDoc(doc(db, "users", uid), {
    lastLoginAt: serverTimestamp(),
    emailVerified: credential.user.emailVerified,
    updatedAt: serverTimestamp(),
  });

  return credential.user;
}

/** Signs the current user out. */
export async function logout() {
  await signOut(auth);
}

/** Sends a password reset email — PRD requires self-service reset. */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw friendly(error);
  }
}

/** Re-sends the verification email for the signed-in user. */
export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error("You need to be signed in to do that.");
  await sendEmailVerification(auth.currentUser);
}

/** Subscribes to auth state changes — AuthContext uses this to replace the Sprint 1 mock. */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
