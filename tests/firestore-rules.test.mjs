// Firestore Security Rules tests — missing_documents workflow, draft lifecycle,
// and application create/update hardening (Sprint 3).
//
// Runs against the local Firestore emulator only (see firebase.json). Never touches
// the live uaams-1068e project — initializeTestEnvironment below points explicitly
// at 127.0.0.1:8080 with a "demo-*" project ID, which the emulator refuses to treat
// as a real project even if credentials were present.
//
// Run with: npm run test:rules  (emulator must already be running)

import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const rulesPath = fileURLToPath(new URL("../firestore.rules", import.meta.url));

const STUDENT_UID = "student-alice";
const OTHER_STUDENT_UID = "student-mallory";
const ADMIN_UID = "admin-carter";
const UNIVERSITY_ID = "univ-demo-1";
const APPLICATION_ID = "app-missing-docs-1";
const DRAFT_APPLICATION_ID = "app-draft-1";
const SUBMITTED_APPLICATION_ID = "app-submitted-1";

const DEFAULT_ADMIN_REVIEW = {
  reviewedBy: null,
  reviewedAt: null,
  latestDecisionMessage: "",
  internalNotesCount: 0,
};

const increment = firebase.firestore.FieldValue.increment;
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-uaams",
    firestore: {
      rules: readFileSync(rulesPath, "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

// Fresh application + user docs before every test, seeded with rules disabled,
// so each test's outcome only depends on the operation it performs.
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await db.collection("users").doc(STUDENT_UID).set({
      role: "student",
      assignedUniversityId: null,
    });
    await db.collection("users").doc(OTHER_STUDENT_UID).set({
      role: "student",
      assignedUniversityId: null,
    });
    await db.collection("users").doc(ADMIN_UID).set({
      role: "university_admin",
      assignedUniversityId: UNIVERSITY_ID,
    });

    await db.collection("applications").doc(SUBMITTED_APPLICATION_ID).set({
      studentId: STUDENT_UID,
      universityId: UNIVERSITY_ID,
      status: "submitted",
      documentSummary: {
        total: 0,
        byType: { passport: 0, transcript: 0, certificate: 0, english_test: 0 },
      },
      adminReview: DEFAULT_ADMIN_REVIEW,
      updatedAt: serverTimestamp(),
      submittedAt: serverTimestamp(),
      decidedAt: null,
    });

    await db.collection("applications").doc(APPLICATION_ID).set({
      studentId: STUDENT_UID,
      universityId: UNIVERSITY_ID,
      status: "missing_documents",
      documentSummary: {
        total: 0,
        byType: { passport: 0, transcript: 0, certificate: 0, english_test: 0 },
      },
      adminReview: {
        missingDocumentTypes: ["passport"],
        reviewedBy: null,
        reviewedAt: null,
        latestDecisionMessage: "",
        internalNotesCount: 0,
      },
      updatedAt: serverTimestamp(),
    });

    await db.collection("applications").doc(DRAFT_APPLICATION_ID).set({
      studentId: STUDENT_UID,
      universityId: UNIVERSITY_ID,
      status: "draft",
      personalInfo: { fullName: "Alice Draft", dateOfBirth: "2000-01-01", nationality: "Testland", passportNumber: "X1" },
      academicInfo: { highestQualification: "Bachelor", institution: "Test Uni", graduationYear: 2022, gpa: "3.5" },
      courseInfo: { universityId: UNIVERSITY_ID, courseName: "MSc Testing", intendedIntake: "September 2026" },
      documentSummary: {
        total: 0,
        byType: { passport: 0, transcript: 0, certificate: 0, english_test: 0 },
      },
      adminReview: {
        reviewedBy: null,
        reviewedAt: null,
        latestDecisionMessage: "",
        internalNotesCount: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      submittedAt: null,
      decidedAt: null,
    });
  });
});

test("1. PASS — owning student uploads a document metadata record for a requested type", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertSucceeds(
    alice.firestore().collection("documents").doc().set({
      applicationId: APPLICATION_ID,
      studentId: STUDENT_UID,
      universityId: UNIVERSITY_ID,
      uploadedBy: STUDENT_UID,
      fileType: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
    })
  );
});

test("2. FAIL — fileType not among the requested missingDocumentTypes", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertFails(
    alice.firestore().collection("documents").doc().set({
      applicationId: APPLICATION_ID,
      studentId: STUDENT_UID,
      universityId: UNIVERSITY_ID,
      uploadedBy: STUDENT_UID,
      fileType: "transcript", // only "passport" was requested
      fileName: "transcript.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
    })
  );
});

test("3. FAIL — a different student attaches a document to someone else's application", async () => {
  const mallory = testEnv.authenticatedContext(OTHER_STUDENT_UID);

  await assertFails(
    mallory.firestore().collection("documents").doc().set({
      applicationId: APPLICATION_ID, // belongs to STUDENT_UID, not mallory
      studentId: OTHER_STUDENT_UID,
      universityId: UNIVERSITY_ID,
      uploadedBy: OTHER_STUDENT_UID,
      fileType: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
    })
  );
});

test("4. PASS — the exact documentSummary bump registerDocument()/bumpSummary() perform", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);
  const appRef = alice.firestore().collection("applications").doc(APPLICATION_ID);

  await assertSucceeds(
    appRef.update({
      "documentSummary.total": increment(1),
      "documentSummary.byType.passport": increment(1),
      updatedAt: serverTimestamp(),
    })
  );

  let afterSnap;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    afterSnap = await context.firestore().collection("applications").doc(APPLICATION_ID).get();
  });
  const summary = afterSnap.data().documentSummary;
  assert.equal(summary.total, 1);
  assert.equal(summary.byType.passport, 1);
  assert.equal(summary.byType.transcript, 0);

  // Same shape, but a client-supplied timestamp instead of serverTimestamp() —
  // confirms updatedAt == request.time is actually enforced, not vacuously true.
  await assertFails(
    appRef.update({
      "documentSummary.total": increment(1),
      "documentSummary.byType.transcript": increment(1),
      updatedAt: firebase.firestore.Timestamp.now(),
    })
  );
});

test("5. FAIL — student tries to move status out of missing_documents directly", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertFails(
    alice.firestore().collection("applications").doc(APPLICATION_ID).update({
      status: "under_review",
      updatedAt: serverTimestamp(),
    })
  );
});

test("6. FAIL — arbitrary documentSummary manipulation", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);
  const appRef = alice.firestore().collection("applications").doc(APPLICATION_ID);

  // total jumps by more than the one real upload it should represent
  await assertFails(
    appRef.update({
      "documentSummary.total": increment(5),
      "documentSummary.byType.passport": increment(1),
      updatedAt: serverTimestamp(),
    })
  );

  // total is a plausible +1, but two byType counters move at once
  await assertFails(
    appRef.update({
      "documentSummary.total": increment(1),
      "documentSummary.byType.passport": increment(1),
      "documentSummary.byType.transcript": increment(1),
      updatedAt: serverTimestamp(),
    })
  );
});

test("7. FAIL — student tries to touch adminReview while bumping the summary", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertFails(
    alice.firestore().collection("applications").doc(APPLICATION_ID).update({
      "documentSummary.total": increment(1),
      "documentSummary.byType.passport": increment(1),
      "adminReview.latestDecisionMessage": "not allowed to write this",
      updatedAt: serverTimestamp(),
    })
  );
});

// ── Draft update rule (Sprint 3 close-out fix 2) ────────────────────────

test("8. PASS — owning student makes an ordinary legitimate draft edit", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertSucceeds(
    alice.firestore().collection("applications").doc(DRAFT_APPLICATION_ID).update({
      personalInfo: { fullName: "Alice Updated", dateOfBirth: "2000-01-01", nationality: "Testland", passportNumber: "X1" },
      courseInfo: { universityId: UNIVERSITY_ID, courseName: "MSc Testing (revised)", intendedIntake: "September 2026" },
      updatedAt: serverTimestamp(),
    })
  );
});

test("9. PASS — legitimate draft documentSummary bump works both ways (upload +1, delete -1)", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);
  const appRef = alice.firestore().collection("applications").doc(DRAFT_APPLICATION_ID);

  // registerDocument() while still draft: +1
  await assertSucceeds(
    appRef.update({
      "documentSummary.total": increment(1),
      "documentSummary.byType.passport": increment(1),
      updatedAt: serverTimestamp(),
    })
  );

  let afterUpload;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    afterUpload = await context.firestore().collection("applications").doc(DRAFT_APPLICATION_ID).get();
  });
  assert.equal(afterUpload.data().documentSummary.total, 1);
  assert.equal(afterUpload.data().documentSummary.byType.passport, 1);

  // deleteDocument() while still draft: -1, back to 0
  await assertSucceeds(
    appRef.update({
      "documentSummary.total": increment(-1),
      "documentSummary.byType.passport": increment(-1),
      updatedAt: serverTimestamp(),
    })
  );

  let afterDelete;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    afterDelete = await context.firestore().collection("applications").doc(DRAFT_APPLICATION_ID).get();
  });
  assert.equal(afterDelete.data().documentSummary.total, 0);
  assert.equal(afterDelete.data().documentSummary.byType.passport, 0);
});

test("10. FAIL — student cannot directly change draft -> submitted", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);
  const appRef = alice.firestore().collection("applications").doc(DRAFT_APPLICATION_ID);

  await assertFails(
    appRef.update({
      status: "submitted",
      updatedAt: serverTimestamp(),
    })
  );

  // The specific attack this rule closes: forging review/audit fields in the
  // very same write that flips status, so a fake decision rides along.
  await assertFails(
    appRef.update({
      status: "submitted",
      submittedAt: serverTimestamp(),
      "adminReview.latestDecisionMessage": "forged",
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("11. FAIL — student cannot set/change adminReview while draft", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertFails(
    alice.firestore().collection("applications").doc(DRAFT_APPLICATION_ID).update({
      "adminReview.latestDecisionMessage": "forged",
      updatedAt: serverTimestamp(),
    })
  );
});

test("12. FAIL — student cannot set/change decidedAt while draft", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertFails(
    alice.firestore().collection("applications").doc(DRAFT_APPLICATION_ID).update({
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("13. FAIL — student cannot set/change submittedAt while draft", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertFails(
    alice.firestore().collection("applications").doc(DRAFT_APPLICATION_ID).update({
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("14. FAIL — wrong student cannot update another student's draft", async () => {
  const mallory = testEnv.authenticatedContext(OTHER_STUDENT_UID);

  await assertFails(
    mallory.firestore().collection("applications").doc(DRAFT_APPLICATION_ID).update({
      personalInfo: { fullName: "Hijacked", dateOfBirth: "2000-01-01", nationality: "Testland", passportNumber: "X1" },
      updatedAt: serverTimestamp(),
    })
  );
});

// ── Security hardening (Sprint 3 final close-out review) ────────────────

test("15. PASS — legitimate student draft creation with the real createDraftApplication() shape", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertSucceeds(
    alice.firestore().collection("applications").doc().set({
      studentId: STUDENT_UID,
      studentName: "Alice Test",
      studentEmail: "alice@example.com",
      universityId: UNIVERSITY_ID,
      universityName: "Test University",
      status: "draft",
      personalInfo: {},
      academicInfo: {},
      courseInfo: {},
      documentSummary: {
        total: 0,
        byType: { passport: 0, transcript: 0, certificate: 0, english_test: 0 },
      },
      adminReview: DEFAULT_ADMIN_REVIEW,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      submittedAt: null,
      decidedAt: null,
    })
  );
});

test("16. FAIL — student cannot create a draft with spoofed adminReview/decidedAt", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  const baseDoc = {
    studentId: STUDENT_UID,
    studentName: "Alice Test",
    studentEmail: "alice@example.com",
    universityId: UNIVERSITY_ID,
    universityName: "Test University",
    status: "draft",
    personalInfo: {},
    academicInfo: {},
    courseInfo: {},
    documentSummary: {
      total: 0,
      byType: { passport: 0, transcript: 0, certificate: 0, english_test: 0 },
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAt: null,
    decidedAt: null,
  };

  // Spoofed decision message riding along on an otherwise-normal draft create.
  await assertFails(
    alice.firestore().collection("applications").doc().set({
      ...baseDoc,
      adminReview: { ...DEFAULT_ADMIN_REVIEW, latestDecisionMessage: "You have been offered a place!" },
    })
  );

  // Spoofed non-null decidedAt on a document whose status is still "draft".
  await assertFails(
    alice.firestore().collection("applications").doc().set({
      ...baseDoc,
      adminReview: DEFAULT_ADMIN_REVIEW,
      decidedAt: serverTimestamp(),
    })
  );
});

test("17. FAIL — student cannot create draft document metadata with a non-canonical fileType", async () => {
  const alice = testEnv.authenticatedContext(STUDENT_UID);

  await assertFails(
    alice.firestore().collection("documents").doc().set({
      applicationId: DRAFT_APPLICATION_ID,
      studentId: STUDENT_UID,
      universityId: UNIVERSITY_ID,
      uploadedBy: STUDENT_UID,
      fileType: "random_document",
      fileName: "random.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
    })
  );
});

test("18. FAIL — admin cannot directly change submitted -> offered via the client SDK", async () => {
  const admin = testEnv.authenticatedContext(ADMIN_UID);

  await assertFails(
    admin.firestore().collection("applications").doc(SUBMITTED_APPLICATION_ID).update({
      status: "offered",
      "adminReview.latestDecisionMessage": "Congratulations!",
      "adminReview.reviewedBy": ADMIN_UID,
      "adminReview.reviewedAt": serverTimestamp(),
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});
