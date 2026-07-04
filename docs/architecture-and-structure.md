# UAAMS — Root Structure & Architecture

**Project:** University Administration & Application Management System (UAAMS)
**Module:** QHO635 / COM617 Industrial Consulting Project
**Author:** Kristina (Backend) · **Sprint:** 1
**Status:** Proposal for team confirmation before backend build begins

This document proposes the shared repository structure and explains the backend architecture. It is deliberately focused on the root tree and how the system fits together. Team hand-offs, open questions, and the purpose of the project documents are communicated separately in the team channel.

---

## 1. Proposed repository structure

The team works from **one shared GitHub repository** as the project container (the supervisor's advice), rather than separate frontend and backend repos. The tree below shows what **exists now** (Ana-Maria's Next.js frontend), what was **added tonight**, and what is **to be added** as the backend and documentation grow. Ana-Maria's existing frontend is not changed by any of this — the additions sit alongside it.

```
Team-Project/                        # shared GitHub repo (the project container)
│
├── src/                             # Next.js app (Ana-Maria) — EXISTS NOW
│   ├── app/                         # route groups
│   │   ├── (auth)/                  # login, register
│   │   ├── (student)/               # dashboard, applications, new application
│   │   └── (admin)/                 # admin-dashboard, admin-applications, [id] review
│   ├── components/                  # common / student / admin UI
│   ├── context/
│   │   └── AuthContext.jsx          # currently mocked auth
│   ├── constants/
│   │   └── index.js                 # single source of truth: statuses, roles, routes
│   ├── mock/
│   │   └── data.js                  # TEMPORARY mock data — removed once Firestore is connected
│   └── lib/
│       ├── utils.js
│       └── firebase/                # backend services layer (Kristina)
│           ├── config.js            # Firebase SDK init — started (Ana-Maria), commented out
│           ├── auth.js              # login, register, logout             [to be added]
│           ├── users.js             # read / create user documents         [to be added]
│           ├── applications.js      # submit / review / offer / reject     [to be added]
│           ├── documents.js         # upload + list document metadata      [to be added]
│           └── notifications.js     # read / mark notifications            [to be added]
│
├── firestore.rules                  # Firestore security rules             [to be added]
├── storage.rules                    # Storage security rules               [to be added]
├── .env.example                     # Firebase config key names (no secrets)[to be added]
├── .gitignore                       # ignores node_modules, .next, .env.local
├── README.md                        # project overview + setup instructions
│
└── docs/                            # documentation (Kristina + Sylwia + Patryk)
    ├── data-contract.md             # agreed Firestore structure            [to be added]
    ├── architecture-and-structure.md# this document
    ├── backend-worklog.md           # dated backend progress log            [added tonight]
    ├── setup-evidence/              # setup screenshots                     [added tonight]
    └── test-plan.md                 # test plan (Patryk)                    [to be added]
```

---

## 2. Why the structure looks this way (architecture)

UAAMS uses **Firebase as a Backend-as-a-Service (BaaS)**. This is the key architectural choice and it shapes the whole tree.

In a traditional app (like some previous student projects), the backend is a set of custom API route files that sit between the frontend and the database. UAAMS deliberately does **not** work that way — per the PRD, there is no separate Express server unless one is clearly needed later. Instead, the Next.js frontend talks **directly** to Firebase (Authentication, Firestore, Storage) through the Firebase SDK.

Because there is no custom API layer, the "structure" of the backend lives in three places instead:

- **The data contract** — the agreed shape of the Firestore collections (`docs/data-contract.md`). This is the equivalent of an API specification: it defines exactly what every document looks like, so the frontend and backend stay aligned.
- **The services layer** (`src/lib/firebase/`) — small files that group all the Firestore/Auth/Storage calls by area (auth, users, applications, documents, notifications). This is where the backend logic visibly lives in the repository.
- **The security rules** (`firestore.rules`, `storage.rules`) — committed as real files in the repo. These enforce who can read and write what, which is how authorisation and GDPR access-control are handled in a Firebase project (rather than in server code).

This is why the repository can look simpler than an API-based project while still being well-structured: the structure has moved into the data contract, the services layer, and the security rules.

### Data residency (GDPR)
Firestore is created in **europe-west2 (London)**, so the client's personal data is stored in the EU. This is a permanent choice made deliberately for a real UK/EU client.

---

## 3. Application actions & state changes

User actions in the app (a student submitting an application, an admin moving it to review, offering or rejecting a place, uploading a document, marking a notification as read) are **not** separate files or folders. Each action is a **function in the services layer that updates a document in Firestore.**

The possible states of an application are the `status` values already defined in the frontend's `constants/index.js` and are the single source of truth for both sides:

- `draft` — started but not submitted
- `submitted` — sent by the student
- `under_review` — being assessed by the admin
- `offered` — a place is offered (the "accept" outcome)
- `rejected` — declined

So, for example, an admin "offering a place" is the function `offerApplication()` in `applications.js`, which sets `status` to `offered`, writes the `decisionMessage`, and creates a notification. There is no separate "accepted" status — `offered` is that outcome.

**Scope note:** in the current design the offer/reject decision is made on the **whole application**, not on each individual document. If per-document review is wanted (for example, an admin marking each transcript or passport as verified), that would be an addition to agree with the client — it is not part of the design as it stands.

### Proposed data-model additions (to confirm with the team)
Two additions come directly from the PRD and are worth agreeing before the collections are built. They are data-model items, so they live inside the data contract rather than as folders in the tree:

- **Decision history** — the PRD states decision history is logged. Proposed as a record of each status change (who, from/to, message, when) so the application has an audit trail. This also supports GDPR traceability.
- **Email logs** — the PRD states email logs are stored in Firestore. Proposed as a small `emailLogs` collection recording each email's type, recipient, delivery status and any error.

---

## 4. What this means for the build

Once the team confirms this structure and the data contract, the backend is built into the same repository:

1. The five Firestore collections are created to match the agreed data contract.
2. The services layer (`src/lib/firebase/`) is filled in so the frontend can call real data instead of mock data.
3. Security rules are written and committed so students and admins can only access what they are permitted to.
4. Storage is enabled once the billing decision is agreed, and document uploads are wired to it.

Nothing in Ana-Maria's existing frontend needs to change to accommodate this — the additions sit alongside it, and the mock data is only removed once the real data is connected.
