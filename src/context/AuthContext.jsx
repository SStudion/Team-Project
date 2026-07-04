"use client";
// context/AuthContext.jsx
//
// Provides auth state globally via React Context.
// Reads Firebase Auth state and merges profile fields from Firestore users/{uid}.
//
// WHAT THIS GIVES EVERY COMPONENT:
//   const { user, role, loading } = useAuth();

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { ROLES } from "@/constants";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : {};

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || profile.email || "",
          fullName:
            profile.fullName ||
            firebaseUser.displayName ||
            firebaseUser.email ||
            "Student",
          role: profile.role || null,
          ...profile,
        });
      } catch {
        // Fallback keeps the app usable even if profile read fails.
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          fullName: firebaseUser.displayName || firebaseUser.email || "Student",
          role: null,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const role = user?.role ?? null;
  const isStudent = role === ROLES.STUDENT;
  const isAdmin   = role === ROLES.ADMIN;

  return (
    <AuthContext.Provider value={{ user, role, loading, isStudent, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — always use this, never useContext(AuthContext) directly
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
