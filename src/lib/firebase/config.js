// lib/firebase/config.js
//
// Firebase SDK initialisation. All values come from .env.local (see .env.example
// for the key names) — nothing is hardcoded here, so the same code runs against
// any Firebase project without edits.

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// The getApps() guard matters in Next.js — hot reload re-runs this module, and
// initialising twice throws.
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// One flag controls the whole document strategy: dummy | emulator | live.
// The documents service branches on this; here we just point the SDK at the
// local emulator when asked.
export const STORAGE_MODE = process.env.NEXT_PUBLIC_STORAGE_MODE || "dummy";

if (STORAGE_MODE === "emulator" && typeof window !== "undefined" && !storage._emulatorConnected) {
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  storage._emulatorConnected = true;
}

export default app;
