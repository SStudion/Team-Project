# UAAMS — University Administration & Application Management System

**Module:** QHO635 / COM617 Industrial Consulting Project
**Client:** SStudio — Shiv Raj Banjade
**Supervisor:** Dr Omer Celebi

UAAMS is a web application designed to support the university application process from student registration through to admin review and final decision. Students can register, log in, submit university applications, track their application status and receive notifications. University administrators can view applications assigned to their university, review applicant details, update application status, make final decisions and record internal admin notes.

---

## Team Roles

| Team Member | Main Responsibility |
|---|---|
| **Ana-Maria** | Project Lead and Frontend Development — Next.js/React UI, student/admin screens, frontend Firebase integration |
| **Kristina** | Backend/Firebase Development — Firebase setup, Firestore data structure, rules, API routes, Admin SDK integration, backend debugging and testing support |
| **Patryk** | Testing — test plan, test cases and validation |
| **Sylwia** | Report/PID Documentation — project report, user stories and written portfolio content |

---

## Project Purpose

The project addresses the need for a structured digital application system where:

- students can submit university applications online;
- documents can be requested and tracked;
- university administrators can review applications in one place;
- application status updates are visible to students;
- decisions are recorded with an audit trail;
- notifications and email logs support communication between the university and applicant.

Sprint 1 focused on building and testing a working MVP flow. Sprint 2 focused on turning that MVP into an integrated Proof of Concept — connecting the remaining frontend screens to live Firestore/API data and fixing the integration bugs that only surface once real auth, real rules and real queries are in play. Sprint 3 completed the backend and security work needed to close out the MVP for internal handover: the missing-documents review workflow, the Firestore/Storage rules hardening that followed from testing it, and a final integration pass across the whole project (see "Sprint 3 Backend & Integration — Final Version 04" below).

---

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Firebase Backend-as-a-Service |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Storage Strategy | Firebase Storage security rules are written and published; the application remains in dummy metadata mode for this handover. Live mode can be enabled later after configuration and live-mode verification. |
| Server/API Layer | Next.js API routes using Firebase Admin SDK |
| Email Flow | Simulated email mode via `emailLogs` records unless SMTP is configured |
| Build/Test | `npm run dev`, `npm run lint`, `npm run build`, `npm run test:rules` |

---

## Repository Structure

```text
UAAMS/
├── docs/                  # Project documentation and evidence
├── public/                # Static assets
├── src/                   # Next.js application source
│   ├── app/               # App Router pages and API routes
│   ├── components/        # Reusable UI components
│   ├── constants/         # Shared constants/status labels
│   ├── context/           # Auth context
│   ├── hooks/             # React hooks
│   └── lib/               # Firebase/client/server utilities
├── .env.example           # Safe environment variable template
├── firestore.rules        # Firestore security rules
├── storage.rules          # Firebase Storage rules
├── package.json
├── package-lock.json
└── README.md
```

---

## Sprint 1 Status

Sprint 1 delivered the main student/admin MVP journey, integrated and tested locally.

### Confirmed Working (Sprint 1)

| Feature | Status |
|---|---|
| Student registration | Working |
| Student login/sign out | Working |
| Role-based redirect | Working |
| Student dashboard | Working |
| Student application submission | Working |
| My Applications page | Working |
| Student application detail/status page | Working |
| Admin login | Working |
| Admin dashboard | Working |
| Admin applications list | Working |
| Admin review page | Working |
| Status update to Under Review | Working |
| Final decision: Offered / Rejected | Working |
| Internal admin notes | Working |
| Student notifications | Working |
| Student decision/message display | Working |
| Final decision protection | Working |
| Production build | Passed |

---

## Sprint 1 Integration Summary

### Frontend Integration Completed by Ana-Maria

- Firebase Auth connected to Login, Register and Sign Out;
- role-based redirect after login (student → `/dashboard`, admin → `/admin-dashboard`);
- Student Dashboard, My Applications, New Application form connected to Firestore;
- Application detail/status page connected to real application data;
- Universities dropdown connected to the Firestore `universities` collection;
- mock data removed from the main student/admin flow;
- Admin Dashboard, Applications list and Review page connected to backend/API data;
- Save Decision and Save Notes connected to the admin review interface;
- Admin Students placeholder page created for a later sprint;
- consistent student/admin UI structure using Next.js, React and Tailwind CSS.

### Backend/Firebase Integration Completed by Kristina

- Firebase project setup and configuration;
- Firebase Authentication testing for student and admin users;
- Firestore database setup and collections planning;
- Firestore security rules and Firebase Storage rules;
- Firebase Admin SDK server-side setup and protected API routes;
- application submission and review backend logic;
- admin application list/dashboard count APIs, status update API, decision API, internal notes API;
- notification creation after admin decisions/status updates;
- simulated email logging flow;
- backend debugging during frontend integration;
- production build verification.

---

## Sprint 2 Status

Sprint 2 moved the project from "the main flow works" to an integrated Proof of Concept, with a focus on document handling, permission correctness, and fixing the bugs that only appear once the frontend runs against real Firebase Auth sessions and real Firestore Security Rules — not mock data.

### Confirmed Working (Sprint 2)

| Feature | Status |
|---|---|
| Document upload (dummy mode) | Working |
| Document list on student application detail page | Working — fixed (was silently blocked by Firestore rules) |
| Document list on admin review page | Working — fixed (was silently failing to load) |
| Open/view document link (student + admin) | Working — fixed (link was non-functional) |
| Admin review page — application load on first render | Working — fixed (auth-timing race condition) |
| `decisionHistory` audit trail | Working |
| `emailLogs` simulated delivery | Working |
| `notifications` on submit/status change | Working |
| Draft application edit lock after submission | Working |
| Admin cross-university access block | Verified in code |
| Production build | Passed |

### Frontend Integration Completed by Ana-Maria (Sprint 2)

- Finalised the student application detail page (`/applications/[id]`), including the document list section, connected to live Firestore data via `getDocumentsForApplication()`.
- Finalised the admin application review page (`/admin-applications/[id]`), including documents, notes, and the decision/status controls.
- **Fixed an auth-timing bug** on the admin review page: it was calling the authenticated fetch before Firebase Auth had finished restoring the session, so the request failed with `"No authenticated Firebase user found"` on first load. Fixed by gating the fetch on `AuthContext`'s `loading` state, and surfaced the real error in the UI instead of swallowing it in `console.error`.
- **Fixed a Firestore permissions bug** blocking the document list: `getDocumentsForApplication()` queried `documents` filtered only by `applicationId`, but `firestore.rules` requires `resource.data.studentId == request.auth.uid`. Firestore rejects `list` queries when the rule's field isn't also a query constraint, so the read was denied with `"Missing or insufficient permissions"` even for the student's own documents. Fixed by adding a `where("studentId", "==", uid)` clause, which required creating a new Firestore composite index (`applicationId` ASC + `studentId` ASC + `uploadedAt` DESC).
- **Fixed the document "open/view" link** on both the student and admin pages: the anchor tag's attributes (`href`, `target`, `rel`) were written outside the opening `<a>` tag, so the link never actually had an `href` — clicking it did nothing. Also corrected the `isDummyFile` condition, which was hiding the link specifically in the project's current storage mode (`STORAGE_MODE=dummy`).
- Reviewed and fixed a syntax error in `documents/route.js` (missing template-literal backticks around a computed Firestore field key) that was breaking the dev build.
- Fixed the student notifications system: the `/notifications` page existed as a UI shell but wasn't displaying any data — connected it to the `notifications` collection so records now render for the logged-in student.
- Fixed draft application handling on the New Application form: incomplete applications weren't being saved as drafts if the student didn't finish the flow — now the application saves as a draft along the way, can be deleted, and can be reopened and continued later.

### Backend/Firebase Integration Completed by Kristina (Sprint 2)

- Provided an updated `POST`/`GET` handler for `/api/applications/[applicationId]/documents/route.js` (metadata registration for dummy/emulator/live document modes).
- Created the Firestore composite index required for the corrected document query (`applicationId` + `studentId` + `uploadedAt`).

---

## Tested MVP Flow

The following end-to-end flow has been manually tested:

```text
Student registers/logs in
→ Student submits an application
→ Student attaches documents (dummy mode) and can view them
→ Student sees application in My Applications
→ Admin logs in
→ Admin sees application in dashboard/list
→ Admin opens review page, sees documents and can open them
→ Admin changes status to Under Review
→ Admin makes final decision: Offered or Rejected
→ Student receives notification
→ Student sees decision/message on application page
→ Admin internal notes can be saved
```

A production build was also tested successfully using:

```bash
npm run build
```

---

## Sprint 1 + 2 Testing Evidence

| Area | Result |
|---|---|
| Student registration | Passed |
| Student login | Passed |
| Student dashboard loading | Passed |
| New application creation | Passed |
| My Applications page | Passed |
| Student application detail/status page | Passed |
| Document upload (dummy mode) | Passed |
| Document list — student view | Passed (fixed Sprint 2) |
| Document list — admin view | Passed (fixed Sprint 2) |
| Document open/view link | Passed (fixed Sprint 2) |
| Admin login | Passed |
| Admin dashboard loading | Passed |
| Admin application list | Passed |
| Admin application review page | Passed (fixed Sprint 2) |
| Status update to Under Review | Passed |
| Final decision: Offered | Passed |
| Final decision: Rejected | Passed |
| Internal admin notes | Passed |
| Student notification after admin update | Passed |
| Student decision/message display | Passed |
| Final decision protection | Passed |
| `npm run build` production build | Passed |

Screenshots and screen recordings are stored separately for Sprint reporting and referenced in the PID/portfolio documentation.

---

## Important Fixes Completed During Integration

**Sprint 1:**
- Admin API calls updated to use Firebase ID token authentication through `authFetch()`.
- Admin dashboard/applications pages connected to protected backend API routes.
- Firestore query/index blockers resolved by simplifying server-side queries and sorting/filtering the small demo dataset safely.
- Status update payload mismatch fixed so Under Review status saves correctly.
- Decision history and internal notes write failures fixed with safe fallback values for admin name fields.
- Final decision protection improved so applications with a final decision cannot be changed casually.

**Sprint 2:**
- Auth-timing race condition on the admin review page (see above).
- Firestore permissions/query mismatch blocking document reads (see above).
- Broken document open/view link on student and admin pages (see above).
- Syntax error in `documents/route.js` blocking the dev build (see above).

---

## Sprint 3 Backend & Integration — Final Version 04

Sprint 3 completed the backend and security work needed to close out the MVP:
the missing-documents review workflow, the Firestore/Storage security rules
hardening that followed from testing it, and a final integration pass across
the whole project. This is the last backend/security work before internal
team handover.

### Missing-documents workflow

- **Admin request for missing documents**: `submitted`/`under_review` ->
  `missing_documents`, with the requested document types and admin message
  stored, and a notification/audit/email event created for the student.
- **Firestore security for missing-document uploads**: owner, application,
  university and requested-document-type enforcement; only a narrowly-scoped
  `documentSummary` change is permitted; direct status manipulation is denied.
- **Student missing-document resubmission**: ownership, status and
  requested-current-upload validation (an older document from before the
  request was made cannot satisfy it), `missing_documents` -> `under_review`,
  with student-attributed audit history.
- **Missing-document email/log behaviour**: simulated honestly when SMTP
  isn't configured (same `emailLogs` convention as every other email event),
  and no external email is sent on a student resubmission.
- **`decisionHistory` actor-role attribution**: history records now
  distinguish a `university_admin`-driven decision from a `student`-driven
  resubmission.

### Admin Students & API hardening

- **Admin Students** is backed by real data, not a placeholder: `requireAdmin`
  supplies the university scope from the authenticated admin's own profile
  (never from browser input), and the student directory is derived from the
  admin's own scoped application data.
- **Direct API abuse hardening**: wrong role, wrong owner, wrong university,
  wrong document type, wrong status, and repeat/duplicate submissions are all
  rejected server-side — not just hidden by the UI.

### Final integration close-out

- `missing_documents` applications now appear correctly in the admin list and
  status counts.
- Draft applications persist correctly across the New Application wizard, and
  the university selected for a draft is locked once the draft exists.
- Personal and Academic Info steps in the New Application wizard are now
  validated before continuing, matching the existing Course-step pattern.
- The "Submitted" date shown to admins now reflects the real submission time
  (`submittedAt`), not the draft's original creation time.
- Previously-saved internal admin notes are now displayed back to the admin,
  not just accepted and hidden.
- Repeat/duplicate submission attempts are rejected server-side (409).
- The admin decision/status-change flow and its audit trail now commit
  atomically, so a status change and its `decisionHistory`/notification
  record can't end up out of sync.
- Student and admin portals now guard against a signed-in user of the wrong
  role rendering the other portal's pages.
- Full-project ESLint cleanup (see Final Verification below).
- Resolved a Next.js production-build requirement around `useSearchParams`
  on the admin applications list and the New Application wizard.
- Resolved a mismatch between the committed Storage rules and what was
  published to the live Firebase project.

---

## Final Verification — Version 04

| Check | Result |
|---|---|
| ESLint (`npm run lint`) | Pass — 0 errors, 0 warnings |
| Production build (`npm run build`) | Pass |
| Firestore Security Rules — Firebase Emulator Suite | Pass — 18/18 tests |
| Local `firestore.rules` vs published rules | Match |
| Firebase Storage rules | Pass — published and aligned with repository rules |
| Final source audit | Pass — no functional blocker found |

The application still runs in dummy/document-metadata Storage mode
(`NEXT_PUBLIC_STORAGE_MODE=dummy`) and SMTP email delivery remains simulated
via `emailLogs` — both are deliberate, documented choices for this handover,
not defects. The supporting code/configuration is prepared, but enabling
either for a real deployment would still require configuration and live
verification.

---

## Firebase / Firestore Setup Notes

Main Firestore collections used in the current MVP:

```text
users
universities
applications
documents
notifications
internalNotes
decisionHistory
emailLogs
```

### Firestore Composite Indexes Required

| Collection | Fields (in order) | Used by |
|---|---|---|
| `applications` | `studentId` ASC, `createdAt` DESC | Student dashboard / My Applications |
| `notifications` | `userId` ASC, `createdAt` DESC | Notifications page |
| `documents` | `applicationId` ASC, `uploadedAt` DESC | (superseded — see below) |
| `documents` | `applicationId` ASC, `studentId` ASC, `uploadedAt` DESC | Student document list (added Sprint 2 — required to match `firestore.rules`) |

---

## Environment Setup

Create a local environment file by copying `.env.example` to `.env.local`, then fill in the Firebase values.

### Firebase Client SDK Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These are intentionally prefixed with `NEXT_PUBLIC_` because the browser client needs them. Access is protected by Firebase Authentication, Firestore rules and backend API checks.

### Firebase Admin SDK Variables

Server-only — must never use the `NEXT_PUBLIC_` prefix:

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=""
```

The Admin SDK bypasses Firestore security rules, so these credentials must never be committed to GitHub.

### SMTP / Email Variables

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

When SMTP is empty, the system writes `emailLogs` records with simulated delivery status.

### Document Storage Mode

```env
NEXT_PUBLIC_STORAGE_MODE=dummy
```

| Mode | Meaning |
|---|---|
| `dummy` | Metadata-only document records; no real file upload |
| `emulator` | Upload flow against local Firebase emulator |
| `live` | Real Firebase Storage upload; requires suitable Firebase billing/setup |

---

## Running the Project Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run lint     # linting
npm run build    # production build
npm run start    # start production build locally
```

## Security Notes

Before committing or pushing to GitHub, confirm the following are **not** included:

```text
node_modules/
.next/
.env
.env.local
.env*.local
Firebase service account JSON files
private key files
```

The repository should keep: `.env.example`, `firestore.rules`, `storage.rules`, `src/`, `public/`, `docs/`, `package.json`, `package-lock.json`, `README.md`.

The `.gitignore` protects local/private files, especially Firebase Admin SDK credentials and environment files.

---

## Known Limitations (Version 04)

- Document upload uses the dummy/metadata strategy — real Firebase Storage upload remains a team/client decision (billing dependent), even though the Storage security rules for it are already written and published. No real passports, transcripts or identity documents should ever be uploaded during development/testing.
- Real SMTP email sending is not yet configured — `emailLogs` simulation is used and documented as such, including for the Sprint 3 missing-documents email event.
- Notification click-through and mark-as-read behaviour exists at the API level but needs a full manual click-test pass.
- Security/RBAC coverage now includes an automated Firestore Security Rules suite (18/18 passing) and server-side rejection of wrong-role/owner/university/type/status/repeat requests, but a full manual UAT pass across every scenario has not been separately recorded.
- Deployment to Vercel status to be confirmed.

---

## Production Readiness Considerations

Items genuinely still open beyond this internal Version 04 handover:

- Confirm with the team/client whether to switch on real Firebase Storage
  uploads and real SMTP delivery, or keep both simulated for the demo/handover.
- Confirm and complete a stable Vercel (or equivalent) deployment.
- Run a full manual functional + UAT pass across every scenario, complementing
  the automated Firestore Rules suite and source audit already completed.
- Finalise PID documentation and the final presentation.

---

## Documentation

Supporting project documentation is kept in the `docs/` folder, including backend worklog, architecture notes, setup evidence and testing documentation. See `docs/README.md` for the documentation index.

---

## Current Build Status

```text
npm run lint  — passed (0 errors, 0 warnings)
npm run build — passed
```

This is the final Version 04 state: full lint clean, production build passing,
the Firestore Security Rules suite passing 18/18, local rules matching what's
published to Firebase, and Storage rules published — see "Final Verification
— Version 04" above for the complete summary.
