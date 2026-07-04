// lib/server/firebaseAdmin.js
//
// ⚠️ SERVER ONLY — never import this from a client component. The Admin SDK
// credentials bypass every security rule; if this ever reaches the browser
// bundle the whole authorisation model is gone. Import it exclusively from
// API routes and other files in lib/server/.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Same hot-reload guard as the client config — admin apps also refuse to
// initialise twice.
const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // The key arrives from .env.local with literal \n sequences — they have
        // to become real newlines or cert() rejects it.
        privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
