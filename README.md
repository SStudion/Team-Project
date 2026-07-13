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

Sprint 1 focused on building and testing a working MVP flow. Sprint 2 focused on turning that MVP into an integrated Proof of Concept — connecting the remaining frontend screens to live Firestore/API data and fixing the integration bugs that only surface once real auth, real rules and real queries are in play.

---

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Firebase Backend-as-a-Service |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Storage Strategy | Dummy metadata mode (`STORAGE_MODE=dummy`) for Sprint 1/2; Firebase Storage planned for a later sprint/live mode |
| Server/API Layer | Next.js API routes using Firebase Admin SDK |
| Email Flow | Simulated email mode via `emailLogs` records unless SMTP is configured |
| Build/Test | `npm run dev`, `npm run build`, `npm run lint` |

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

> **Kristina — please fill in your Sprint 2 work here, same format as above.** From what's visible in the repo so far:
- Provided an updated `POST`/`GET` handler for `/api/applications/[applicationId]/documents/route.js` (metadata registration for dummy/emulator/live document modes).
- Created the Firestore composite index required for the corrected document query (`applicationId` + `studentId` + `uploadedAt`).
- _(Add: any Firestore rules changes, additional API routes, or backend fixes made this sprint.)_

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

---

## Test Accounts

Use test/demo accounts only. Do not use real applicant data.

| Role | Email | Password | Purpose |
|---|---|---|---|
| Student | `test@yahoo.com` | `12345678` | Register, log in, create application, attach documents, view status/notifications |
| Admin | `admin.solent@uaams.dev` | `Test1234!` | Review submitted applications, view documents, update status, make decisions, add internal notes |

These are Sprint 1/2 demo accounts only, seeded for local testing and supervisor/client demos — not production credentials.

---

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

## Known Limitations (as of Sprint 2)

- Document upload uses dummy/metadata strategy — real Firebase Storage upload is a Sprint 3/client decision (billing dependent). No real passports, transcripts or identity documents should ever be uploaded during development/testing.
- Real SMTP email sending is not yet configured — `emailLogs` simulation is used and documented as such.
- Notification click-through and mark-as-read behaviour exists at the API level but needs a full manual click-test pass.
- Admin Students directory remains a placeholder — confirmed lower priority by the supervisor for Sprint 2.
- Security/RBAC rules are correct by code review, but not all scenarios have a recorded live click-test yet.
- Deployment to Vercel status to be confirmed.

---

## Sprint 3 Plan

- Final MVP polish and remaining UI edge cases;
- confirm real vs simulated Storage/SMTP with client;
- close remaining security/RBAC live-test gaps;
- stable Vercel deployment;
- full functional + UAT testing pass;
- finalise PID documentation and final presentation.

---

## Documentation

Supporting project documentation is kept in the `docs/` folder, including backend worklog, architecture notes, setup evidence and testing documentation. See `docs/README.md` for the documentation index.

---

## Current Build Status

```text
npm run build — passed
```

This confirms the current Sprint 2 integrated version compiles successfully after the frontend/backend integration fixes above.
