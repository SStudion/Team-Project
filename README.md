# UAAMS — University Administration & Application Management System

**Module:** QHO635 / COM617 Industrial Consulting Project
**Client:** SStudio (Shiv Raj Banjade) · **Supervisor:** Dr Omer Celebi

A web application that manages the university application process end-to-end. Students register, submit applications, upload documents and track their status; university admins review applications for their university and offer or reject a place.

## Team
| Member | Area |
|---|---|
| Ana-Maria | Frontend — Next.js / React UI |
| Kristina | Backend — Firebase (Auth, Firestore, Storage) |
| Sylwia | Report / PID / documentation |
| Patryk | Testing — test plan and test cases |

## Tech stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Firebase Backend-as-a-Service — Authentication, Firestore, Storage
- **Data region:** europe-west2 (London) — EU data residency for GDPR

## Repository structure
This is one shared repository (the project container). The frontend and backend live together so they can be integrated cleanly.

- `src/` — the Next.js application (frontend)
- `docs/` — project documentation (see `docs/README.md`)

## Status
Sprint 1 — setup and planning. The Firebase backend foundation is created; the data structure is being agreed by the team before the collections are built. See `docs/` for detailed progress and the proposed architecture.
