# UAAMS — University Administration & Application Management System



**Module:** QHO635 / COM617 Industrial Consulting Project  

**Client:** SStudio — Shiv Raj Banjade  

**Supervisor:** Dr Omer Celebi  



UAAMS is a web application designed to support the university application process from student registration through to admin review and final decision. Students can register, log in, submit university applications, track their application status and receive notifications. University administrators can view applications assigned to their university, review applicant details, update application status, make final decisions and record internal admin notes.



\---



## Team Roles



| Team Member | Main Responsibility |

|---|---|

| **Ana-Maria** | Project Lead and Frontend Development — Next.js/React UI, student/admin screens, frontend Firebase integration |

| **Kristina** | Backend/Firebase Development — Firebase setup, Firestore data structure, rules, API routes, Admin SDK integration, backend debugging and testing support |

| **Patryk** | Testing — test plan, test cases and validation of Sprint 1 flow |

| **Sylwia** | Report/PID Documentation — project report, user stories and written portfolio content |



\---



## Project Purpose



The project addresses the need for a structured digital application system where:



\- students can submit university applications online;

\- documents can be requested and tracked;

\- university administrators can review applications in one place;

\- application status updates are visible to students;

\- decisions are recorded with an audit trail;

\- notifications and email logs support communication between the university and applicant.



For Sprint 1, the focus is on building and testing a working MVP flow rather than full production deployment.



\---



## Tech Stack



| Area | Technology |

|---|---|

| Frontend | Next.js 16, React, Tailwind CSS |

| Backend | Firebase Backend-as-a-Service |

| Authentication | Firebase Authentication |

| Database | Cloud Firestore |

| Storage Strategy | Dummy metadata mode for Sprint 1; Firebase Storage planned for later sprint/live mode |

| Server/API Layer | Next.js API routes using Firebase Admin SDK |

| Email Flow | Simulated email mode via `emailLogs` records unless SMTP is configured |

| Build/Test | `npm run dev`, `npm run build`, `npm run lint` |



\---



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

Sprint 1 has progressed beyond initial setup. The main student/admin MVP journey has been integrated and tested locally.

### Confirmed Working

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

Sprint 1 focused on turning the planned UAAMS concept into a working integrated MVP. The frontend screens were connected to Firebase and the backend/API layer was tested against Firebase Auth and Firestore data.

### Frontend Integration Completed by Ana-Maria

Ana-Maria completed the main frontend connection work, including:

- Firebase Auth connected to Login, Register and Sign Out;
- role-based redirect after login:
  - student users redirect to `/dashboard`;
  - admin users redirect to `/admin-dashboard`;
- Student Dashboard connected to Firebase data;
- My Applications page connected to Firestore;
- New Application form connected to Firestore;
- Application detail/status page connected to real application data;
- Universities dropdown connected to the Firestore `universities` collection;
- mock data removed from the main student/admin flow;
- Admin Dashboard connected to backend/API data;
- Admin Applications list connected to backend/API data;
- Admin Application Review page connected to backend/API data;
- Save Decision and Save Notes connected to the admin review interface;
- Admin Students placeholder page created for a later sprint;
- consistent student/admin UI structure using Next.js, React and Tailwind CSS.

### Backend/Firebase Integration Completed by Kristina

Kristina completed the Firebase/backend setup and integration support, including:

- Firebase project setup and configuration;
- Firebase Authentication testing for student and admin users;
- Firestore database setup and collections planning;
- Firestore university records added for testing;
- admin test account configured with role and assigned university;
- Firestore security rules and Firebase Storage rules;
- Firebase Admin SDK server-side setup;
- protected API routes for student/admin operations;
- application submission and review backend logic;
- admin application list and dashboard count APIs;
- application status update API;
- final offer/rejection decision API;
- internal admin notes API;
- notification creation after admin decisions/status updates;
- simulated email logging flow;
- backend debugging during frontend integration;
- production build verification.

---

## Tested MVP Flow

The following end-to-end flow has been manually tested:

```text
Student registers/logs in
→ Student submits an application
→ Student sees application in My Applications
→ Admin logs in
→ Admin sees application in dashboard/list
→ Admin opens review page
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

## Sprint 1 Testing Evidence

The following areas were manually tested during Sprint 1 integration:

| Area | Result |
|---|---|
| Student registration | Passed |
| Student login | Passed |
| Student dashboard loading | Passed |
| New application creation | Passed |
| My Applications page | Passed |
| Student application detail/status page | Passed |
| Admin login | Passed |
| Admin dashboard loading | Passed |
| Admin application list | Passed |
| Admin application review page | Passed |
| Status update to Under Review | Passed |
| Final decision: Offered | Passed |
| Final decision: Rejected | Passed |
| Internal admin notes | Passed |
| Student notification after admin update | Passed |
| Student decision/message display | Passed |
| Final decision protection | Passed |
| `npm run build` production build | Passed |

Testing evidence screenshots are stored separately for Sprint 1 reporting and can be referenced in the PID/portfolio documentation.

---

## Important Fixes Completed During Integration

During Sprint 1 integration and testing, several blockers were fixed:

- Admin API calls were updated to use Firebase ID token authentication through `authFetch()`.
- Admin dashboard and applications pages were connected to protected backend API routes.
- Admin applications list loading was fixed after backend/API authentication was corrected.
- Firestore query/index blockers were resolved for Sprint 1 testing by simplifying server-side queries and sorting/filtering the small demo dataset safely.
- Admin review page loading was fixed.
- Status update payload mismatch was fixed so Under Review status saves correctly.
- Decision history write failure was fixed by adding safe fallback values for admin name fields.
- Internal notes write failure was fixed by adding safe fallback values for `createdByName`.
- Final decision protection was improved so applications with a final decision cannot be changed casually.
- The frontend now shows a clearer message when a final decision cannot be changed:

```text
This application already has a final decision. Further changes require academic representative review.
```

---

## Firebase / Firestore Setup Notes

The current Firebase setup supports:

- student and admin authentication;
- role-based access using user profiles;
- university assignment for admin users;
- application records linked to students and universities;
- status changes and final decisions;
- internal admin notes;
- decision history;
- notifications;
- simulated email logs.

Main Firestore collections used/planned in the current MVP include:

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

---

## Environment Setup

Create a local environment file by copying:

```bash
.env.example
```

to:

```bash
.env.local
```

Then fill in the Firebase values.

### Firebase Client SDK Variables

These values are used by the browser Firebase client SDK:

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

These are server-only and must never use the `NEXT_PUBLIC_` prefix:

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=""
```

The Admin SDK bypasses Firestore security rules, so these credentials must never be committed to GitHub.

### SMTP / Email Variables

For Sprint 1, email can run in simulated mode by leaving SMTP values empty:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

When SMTP is empty, the system writes `emailLogs` records with simulated delivery status. This allows the full decision-to-email workflow to be demonstrated without a real email provider.

### Document Storage Mode

Sprint 1 uses dummy document mode:

```env
NEXT_PUBLIC_STORAGE_MODE=dummy
```

Available modes:

| Mode | Meaning |
|---|---|
| `dummy` | Metadata-only document records; no real file upload |
| `emulator` | Upload flow against local Firebase emulator |
| `live` | Real Firebase Storage upload; requires suitable Firebase billing/setup |

---

## Running the Project Locally

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run linting:

```bash
npm run lint
```

Build production version:

```bash
npm run build
```

Start production build locally:

```bash
npm run start
```

---

## Test Accounts

Use test/demo accounts only. Do not use real applicant data.

Example local testing accounts can be created through the Register page. Admin test accounts must be configured in Firebase Authentication and Firestore with the correct role/university assignment.

Suggested testing flow:

| Role | Purpose |
|---|---|
| Student test account | Register, log in, create application, view status/notifications |
| Admin test account | Review submitted applications, update status, make decisions, add internal notes |

---

## Security Notes

Before committing or pushing to GitHub, confirm the following files/folders are not included:

```text
node_modules/
.next/
.env
.env.local
.env*.local
Firebase service account JSON files
private key files
```

The repository should keep:

```text
.env.example
firestore.rules
storage.rules
src/
public/
docs/
package.json
package-lock.json
README.md
```

The `.gitignore` protects local/private files, especially Firebase Admin SDK credentials and environment files.

---

## Known Sprint 1 Limitations

These are not blockers for the Sprint 1 MVP but should be documented for future work:

- Document upload is currently represented through dummy/metadata strategy and is planned for Sprint 2 or later.
- No real passports, transcripts or identity documents should be uploaded during development/testing.
- Notifications display correctly, but click-through and mark-as-read behaviour can be improved.
- Admin students page currently exists as a placeholder for later student directory functionality.
- Final decision changes are correctly blocked by the backend, but future UX could disable final decision buttons after Offered/Rejected status.
- More formal testing evidence should be collected by the testing lead.
- Deployment is not yet finalised; the current focus is local Sprint 1 MVP testing.

---

## Sprint 2 Plan

Planned Sprint 2 work:

- implement or extend document upload workflow using dummy metadata, emulator or Firebase Storage depending on billing decision;
- improve notification click-through and read/unread behaviour;
- improve admin student directory;
- improve decision message display for students;
- add more validation and user-friendly error handling;
- expand test cases and testing evidence;
- refine dashboard data and status summaries;
- continue PID/report documentation.

---

## Sprint 3 Plan

Planned Sprint 3 work:

- final polish and bug fixing;
- full end-to-end testing;
- prepare demo scenario;
- prepare presentation/pitch;
- finalise portfolio/report evidence;
- review security and repository cleanup;
- prepare final deployment/submission version.

---

## Documentation

Supporting project documentation is kept in the `docs/` folder, including backend worklog, architecture notes, setup evidence and testing documentation.

See:

```text
docs/README.md
```

for the documentation index.

---

## Current Build Status

Latest local build result:

```text
npm run build — passed
```

This confirms that the current Sprint 1 integrated version compiles successfully after frontend/backend integration fixes.