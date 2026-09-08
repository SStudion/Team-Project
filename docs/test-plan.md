# UAAMS Test Plan

## Test: Student Registration (Auth + Firestore)

**Date:** 3 July 2026
**Tested by:** Kristina

**Steps:**
1. Filled in the /register form with test data
2. Submitted the form

**Expected:** Firebase Auth account created + matching profile document created in Firestore `users` collection

**Result:** ✅ Pass (after fixing an issue below)

**Issue found:** Firestore rejected the profile write with "Missing or insufficient permissions," even though the Auth account was created successfully every time.

**Root cause:** The `firestore.rules` file in the project folder was correct, but had never actually been deployed to the live Firebase project — Firestore was still enforcing an older, stricter default-deny ruleset.

**Fix:** Published the correct rules via Firebase Console → Firestore Database → Rules → Publish.

**Screenshot:** `06-firestore-user-created.png`

## Test: Student Login

**Date:** 3 July 2026
**Tested by:** Kristina

**Steps:**
1. Registered a test account via /register
2. Signed in via /login with the same credentials

**Expected:** Firebase authenticates the user and redirects to /dashboard, showing that user's real name and data

**Result:** ✅ Pass

**Note:** Login form was previously a Sprint 1 placeholder (showed an alert instead of calling Firebase). Wired up `loginUser()` in `auth.js` following the same pattern as `registerUser()`.