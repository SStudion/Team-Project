# Backend Worklog — UAAMS

**Project:** University Administration & Application Management System (UAAMS)
**Module:** QHO635 / COM617 Industrial Consulting Project
**Client:** SStudio (Shiv Raj Banjade) · **Supervisor:** Dr Omer Celebi
**Backend lead:** Kristina — Firebase / Firestore / Authentication / Storage

This file is my running log of backend work, kept in the shared GitHub repository so the whole team can follow progress. I keep rough notes here; Sylwia turns these into the formal PID. I add a new dated entry per work session, newest at the top.

---

## Entry — Session 1 (Firebase setup foundation)

**Date:** 30 June 2026 -> 01 July 2026
**Author:** Kristina
**Sprint:** 1
**Firebase project ID:** `uaams-1068e`

### My goal tonight
Set up the Firebase backend foundation for UAAMS and align the planned data structure with the frontend so both sides match. Tonight is setup and planning only — Security Rules, the live collections, and frontend integration come in a later session.

### Done tonight
- [x] I created the Firebase project (`uaams-1068e`)
- [x] I enabled Authentication (Email/Password)
- [x] I created the Firestore Database (region: europe-west2 / London, Standard edition, production mode)
- [ ] I reached the Firebase Storage step, but it now requires the paid Blaze plan — **paused for team/client authorisation** (see Decisions to be made)
- [ ] I drafted the five Firestore collections as a plan (not yet created live — the team needs to agree the design first):
  - [ ] users
  - [ ] universities
  - [ ] applications
  - [ ] documents
  - [ ] notifications
- [x] I took setup screenshots as evidence
- [ ] I wrote the short backend architecture note (in progress — separate document)
- [ ] I committed and pushed the backend documents to the shared repository (to be done once the frontend base is in place)

### Decisions already in place
- **Authentication:** Email/Password only (per PRD). I did not add Google sign-in, so that every account goes through the registration form and accepts the privacy policy — this supports our GDPR consent requirement.
- **No Super Admin role:** University Admins are pre-created / seeded (per PRD).
- **Data region:** I placed Firestore in **europe-west2 (London)** so the client's personal data is stored in the EU, in line with GDPR.
- **Database mode:** I started Firestore in **production mode** rather than test mode, so the client's data is locked down by default.
- **Backend approach:** Firebase Backend-as-a-Service — no separate Express server unless clearly needed later.
- **Analytics:** I skipped Google Analytics at setup so it would not link to a personal account; it can be enabled later if the client wants usage data.

### How we are collaborating in GitHub (container structure)
Following the supervisor's advice, the team is working from **one shared GitHub repository as our project container**, rather than separate disconnected frontend and backend repos. The plan is that the frontend goes in as the base project and I add the Firebase/backend setup and documentation into the same repository, so the root structure stays clean and integration is straightforward later. (This isn't a new decision from tonight — it reflects the shared-container approach we discussed with the supervisor.)

### Decisions to be made (team / supervisor / client)
- **Firebase Storage / Blaze billing:** Storage now requires the pay-as-you-go Blaze plan. Our expected usage sits inside the free tier (so likely GBP 0), but Blaze needs a billing card linked to the project. I did not upgrade on my own — this is a billing decision for a real client and needs the team's and supervisor's agreement first. See the open questions for Dr Omer.
- **Live collections:** I will not create the five collections until we agree the final data design as a team.

### Next / what I still need
- Team decision on the Blaze/Storage billing question before I enable Storage.
- Team agreement on the data structure before I create the live collections.
- Once the frontend base is in the repository, I will push my backend documents.

### For the team
- **Sylwia (Report / PID):** the decisions and GDPR notes above are ready for you to use in the PID — please review and pull in what you need.
- **Patryk (Testing):** the authentication and application flow are the areas I will hand to you for the test plan once they are wired up.
- **Ana-Maria (Frontend):** the planned data structure is aligned with the frontend; I'll confirm the final field names with you before we create anything live.

### Evidence captured (screenshots)
- `authentication_enabled.jpeg` — Email/Password enabled, Google deliberately not added
- `Firestore_Database_created.jpeg` — Firestore database created
- `gdpr_region_aplied.jpeg` — Firestore location confirmed as europe-west2 (GDPR)
- `storage_upgrade_client_authorisation_requested.jpeg` — Storage requires Blaze; paused for authorisation

---

*A presentation (PPTX) version of this log has been shared in the team Discord channel; this Markdown version is committed to the shared GitHub repository.*
