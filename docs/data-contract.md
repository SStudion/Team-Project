# Data Contract — Firestore Collections (UAAMS)

**Status:** Agreed design for Sprint 2 build (supersedes my early five-collection draft)
**Owner:** Kristina (backend) — but this is a contract, so neither side changes a field name without telling the other
**Region:** europe-west2 (London) — set at project creation, deliberately, for GDPR data residency

This document is the source of truth for what every Firestore document looks like. The
frontend builds against these exact shapes and the security rules enforce access around
them. My earlier draft schema (five collections, with a `programs` collection and an
`accepted` status) is superseded by this version — after going through the PRD properly
and looking at what the admin dashboard actually has to query, the model grew to eight
collections and `offered` replaced `accepted` as the positive outcome, matching the
status values already agreed in `src/constants`.

A few conventions before the collections themselves:

- All timestamps are Firestore `Timestamp` values, not ISO strings. The frontend
  formats them for display; nothing stores pre-formatted dates.
- Document IDs are Firestore auto-IDs unless I say otherwise (`users` is the exception).
- Firestore has no joins, so I denormalise deliberately in a few places. Every time I
  copy a field between collections I've noted why — it's always because a screen needs
  it in one query.

---

## 1. `users/{uid}`

One document per authenticated account. The document ID **is** the Firebase Auth UID —
that way security rules can check `request.auth.uid == userId` directly with no lookup.

```js
{
  uid: "…",                       // same as the doc ID, kept in the doc for convenience
  role: "student",                // "student" | "university_admin" — nothing else exists
  fullName: "Anna Smith",
  email: "anna.smith@email.com",
  nationality: "Romanian",        // null for admins
  intendedLevelOfStudy: "Master", // "Bachelor" | "Master" | "PhD" — null for admins
  assignedUniversityId: null,     // null for students; set (server-side) for admins
  emailVerified: false,           // mirrored from Firebase Auth after verification
  privacyPolicyAccepted: true,    // must be true at registration — see note below
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt: Timestamp
}
```

Why some of these exist:

- **`role`** lives here as a plain field rather than a Firebase custom claim. I went
  back and forth on this — claims are the "proper" way for bigger systems, but a field
  is readable by both client code and security rules with no token refresh headaches,
  and with exactly two roles it does the job. Registration can only ever create a
  `student`; admin accounts are seeded server-side per the PRD (no self-service admin
  signup, and no Super Admin role at all).
- **`privacyPolicyAccepted`** is the reason we don't offer Google sign-in. Every
  account has to come through our registration form so this consent is explicitly
  captured — that's a GDPR decision, not a missing feature.
- **`assignedUniversityId`** is what scopes an admin to their own university. The
  security rules read this field to decide which applications an admin can see, so it
  is server-managed — a user can never write it on their own document.
- **`lastLoginAt`** is there for basic account activity evidence; it gets touched at
  login and nothing else depends on it.

---

## 2. `universities/{universityId}`

The catalogue students apply to. Read-only from the client — seeding and edits happen
server-side, because letting any signed-in user edit the course catalogue would be
silly.

```js
{
  universityId: "…",
  name: "Southampton Solent University",
  code: "SSU",                    // short internal code, handy for admin UI and seeds
  country: "United Kingdom",
  adminUserIds: ["<uid>", …],     // which admin accounts belong to this university
  courses: [                      // embedded array — NOT a separate collection
    {
      courseId: "ssu-msc-cs",
      courseName: "MSc Computer Science",
      level: "Master",            // matches intendedLevelOfStudy values
      intakes: ["September 2026", "January 2027"]
    },
    …
  ]
}
```

**Why courses are embedded and not their own collection:** the only screen that needs
courses is the application form, and it needs *all* of a university's courses at once
to fill a dropdown. One university read gives the whole list. A separate `courses`
collection would mean an extra query per university for zero benefit — we never search
across courses independently, and the catalogue is small and changes rarely. If the
client ever wants hundreds of courses per university with their own admin UI, that's
the point to split it out, not before.

---

## 3. `applications/{applicationId}`

The centre of the whole system. Top-level collection, one document per application.

```js
{
  applicationId: "…",
  studentId: "<uid>",
  studentName: "Anna Smith",       // denormalised — see below
  studentEmail: "anna.smith@email.com",
  universityId: "…",
  universityName: "Southampton Solent University",  // denormalised too
  status: "draft",                 // draft | submitted | under_review | offered | rejected
  personalInfo: {
    fullName, dateOfBirth, nationality, passportNumber
  },
  academicInfo: {
    highestQualification, institution, graduationYear, gpa
  },
  courseInfo: {
    courseId, courseName, level, intendedIntake
  },
  documentSummary: {               // small rollup so lists don't need a documents query
    total: 3,
    byType: { passport: 1, transcript: 1, certificate: 1, english_test: 0 }
  },
  adminReview: {
    reviewedBy: "<admin uid>" | null,
    reviewedAt: Timestamp | null,
    latestDecisionMessage: "",     // the message the student IS allowed to see
    internalNotesCount: 0          // count only — the notes themselves live elsewhere
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  submittedAt: Timestamp | null,
  decidedAt: Timestamp | null
}
```

The decisions worth defending here:

- **Top-level, not nested under `users`.** The admin dashboard runs queries like
  "all `submitted` applications for my university" across every student. Firestore
  can't query across subcollections of different parents, so nesting under users would
  break the single most important admin query. A `studentId` field on a top-level
  collection turns it into one indexed `where` clause.
- **`studentName`, `studentEmail`, `universityName` are copied in on purpose.** The
  admin list page shows name + university per row and supports search by student name.
  Without denormalisation every row would need an extra `users` read and a
  `universities` read — with it, the list is one query. The trade-off is that a name
  change needs a sync, which I accept because names change rarely and applications are
  short-lived documents.
- **`documentSummary`** exists so the list screens can show "3 documents uploaded"
  without querying the `documents` collection per application. It's updated by the
  document service whenever a file is added or removed.
- **`adminReview.latestDecisionMessage` vs internal notes.** This one matters: the
  decision message is written *for the student* and is safe on a document the student
  can read. Internal notes are private admin commentary and are NOT on this document at
  all — see `internalNotes` below for why. Only the count is mirrored here, so the
  admin UI can show "2 notes" in a list without another query, and a count leaks
  nothing sensitive.
- **`submittedAt` / `decidedAt`** are separate from `updatedAt` because the PRD wants a
  timeline (draft → submitted → decided) and `updatedAt` gets touched by every edit,
  so it can't serve as either milestone.

Status lifecycle (values must match `src/constants` exactly):
`draft` → `submitted` → `under_review` → `offered` | `rejected`.
Students control the first arrow, admins control the rest. There's no separate
"accepted" — `offered` is the positive terminal state.

---

## 4. `documents/{documentId}`

Metadata for every uploaded file. The binary itself lives in Firebase Storage (or
nowhere, in dummy mode) — Firestore only ever holds metadata.

```js
{
  documentId: "…",
  applicationId: "…",
  studentId: "<uid>",
  universityId: "…",              // copied from the application — scopes admin access
  fileType: "passport",           // passport | transcript | certificate | english_test
  fileName: "passport-scan.pdf",
  fileExtension: "pdf",
  mimeType: "application/pdf",
  fileSize: 482133,               // bytes — validated ≤ 5MB before accepting
  storagePath: "applications/…",  // null when isDummyFile is true
  fileURL: "https://…",           // null when isDummyFile is true
  isDummyFile: false,
  uploadedAt: Timestamp,
  uploadedBy: "<uid>"
}
```

Two things to note:

- **Top-level rather than a subcollection of `applications`.** My first draft nested
  documents under each application. I changed it for two reasons: the admin review
  screen and the security rules both need to scope documents by `universityId`, which
  is much cleaner when the field sits right on the document in a top-level collection;
  and it keeps all eight collections following one consistent pattern (everything
  top-level, linked by ID fields) instead of one special case.
- **`isDummyFile`** is the field that makes the whole dummy-document strategy work.
  During development and demos we never upload real passports or transcripts —
  a dummy document is a metadata-only record (`storagePath`/`fileURL` null) that
  behaves identically everywhere else in the system. Real Storage uploads and dummy
  records coexist; the `NEXT_PUBLIC_STORAGE_MODE` env flag decides which path the
  upload service takes. This was a deliberate GDPR/safety decision, not a shortcut.

---

## 5. `internalNotes/{noteId}`

Private admin commentary on applications. **Top-level collection, and this is the one
place where the "why not a subcollection?" question really matters.**

```js
{
  noteId: "…",
  applicationId: "…",
  universityId: "…",
  noteText: "Strong candidate, awaiting reference.",
  createdBy: "<admin uid>",
  createdByName: "Dr. James Carter",
  visibility: "admin_only",       // constant today; future-proofing for shared notes
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

If notes were a subcollection of `applications`, or worse a field on the application
document, then any rule that lets a student read their own application risks exposing
the notes with it — one sloppy rule edit and private admin commentary about a student
is readable by that student. Keeping notes in their own top-level collection means
student access is denied by *default* (no rule grants students anything here at all)
rather than denied by a carefully-maintained exception. Students never see these;
admins only see notes for their own university. The application document carries only
`internalNotesCount`, which is harmless.

---

## 6. `decisionHistory/{decisionId}`

An append-only audit trail of every status change. One record per transition.

```js
{
  decisionId: "…",
  applicationId: "…",
  universityId: "…",
  studentId: "<uid>",
  previousStatus: "under_review",
  newStatus: "offered",
  decisionMessage: "We are pleased to offer you a place…",
  decidedBy: "<admin uid>",
  decidedByName: "Dr. James Carter",
  decidedByRole: "university_admin",  // "university_admin" | "student"
  emailTriggered: true,           // did this transition fire an email?
  notificationCreated: true,      // …and an in-app notification?
  createdAt: Timestamp
}
```

`decidedByRole` is `"university_admin"` for every admin-triggered transition (pickup, offer,
reject, missing-document request) and `"student"` for the one student-triggered transition —
resubmitting after uploading requested missing documents (missing_documents -> under_review).

**Written only by server code (the decision service), never directly from the client.**
The point of an audit trail is that it can't be quietly edited — if the browser could
write here, an admin's client-side bug (or a malicious request) could rewrite history.
The Admin SDK bypasses security rules, so the rules simply grant no client write access
and the API route does the writing. `emailTriggered` / `notificationCreated` are
recorded so a failed email is visible in the trail rather than silently lost.

---

## 7. `notifications/{notificationId}`

In-app notifications, one per event per user.

```js
{
  notificationId: "…",
  userId: "<uid>",                // who sees it
  applicationId: "…",             // what it's about (nullable for account-level events)
  type: "status_update",          // registration | submission | status_update | offer | rejection
  title: "Application update",
  message: "Your application to Solent is now under review.",
  readStatus: false,
  createdAt: Timestamp,
  readAt: Timestamp | null
}
```

Created by server code alongside decisions/submissions. The only thing a user can do
from the client is mark their own notifications read — the rules allow exactly that
(`readStatus` and `readAt`, nothing else) so a buggy or hostile client can't rewrite
notification text after the fact.

---

## 8. `emailLogs/{emailLogId}`

A record of every email the system attempted, whether or not it went out.

```js
{
  emailLogId: "…",
  userId: "<uid>",
  applicationId: "…" | null,
  recipientEmail: "anna.smith@email.com",
  emailType: "offer",             // registration | verification | submission | status_update | offer | rejection
  subject: "Your application decision",
  htmlTemplateName: "offer-email",
  deliveryStatus: "sent",         // pending | sent | failed | simulated
  errorMessage: null,             // populated when deliveryStatus is "failed"
  createdAt: Timestamp,
  sentAt: Timestamp | null
}
```

Server-write-only, same reasoning as `decisionHistory` — logs you can edit from a
browser aren't logs. The `simulated` status is important for us specifically: when SMTP
isn't configured (which is true for most of development), the email service still
writes a full log entry with `deliveryStatus: "simulated"` instead of sending. That
means we can demo the entire decision → email flow to the client and supervisor with
zero SMTP setup, and the evidence trail looks exactly like production minus delivery.

---

## 9. `systemLogs/{logId}` — server-side only

Not part of the client-facing contract, listing it here so it isn't a surprise when it
appears in the console. The audit logger writes auth failures, permission violations
and email errors here:

```js
{ type: "auth_failure", userId: "<uid>" | null, message: "…", createdAt: Timestamp }
```

No client access in either direction.

---

## Things to reconcile with the frontend (for Ana-Maria)

The frontend mock data was written before this contract was finalised, so a few names
differ. None of these are big, but they need a deliberate pass rather than discovering
them one runtime error at a time:

| Frontend mock today | This contract | Note |
|---|---|---|
| `intendedLevel` on user | `intendedLevelOfStudy` | rename |
| `universityId` on user | `assignedUniversityId` | rename — clearer that it's admin-only |
| `adminNotes` (string on application) | `internalNotes` collection | moved for security — see §5 |
| `decisionMessage` (string on application) | `adminReview.latestDecisionMessage` | moved into the review block |
| `id` on universities | `universityId` | and docs gain `code`, `country`, `courses[]` |
| notifications: `message` only | + `type`, `title`, `applicationId`, `readAt` | additive |
| documents: 4 fields | full metadata set (§4) | additive |
| ISO string dates | Firestore Timestamps | `formatDate()` in `lib/utils` needs a tweak |

I'd rather we rename the mock data to match this contract than the other way round,
since the rules and services are built against these names — but that's a conversation,
not a decree.
