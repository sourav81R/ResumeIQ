"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "firebase/auth";

import { getFirebaseAuth, googleProvider } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncServerSession = async (nextUser: User | null) => {
    if (!nextUser) {
      return;
    }

    const idToken = await nextUser.getIdToken();
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        // Resolve redirect sign-in result when returning from Google auth page.
        await getRedirectResult(auth);
      } catch {
        // Ignore here; final auth state is handled below.
      }

      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        setUser(nextUser);

        try {
          await syncServerSession(nextUser);
        } catch {
          // Keep client auth state even if server session sync fails.
        }

        setLoading(false);
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        const auth = getFirebaseAuth();
        try {
          const credential = await signInWithPopup(auth, googleProvider);
          await syncServerSession(credential.user);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || "");
          const shouldFallbackToRedirect =
            message.includes("auth/popup-blocked") ||
            message.includes("auth/cancelled-popup-request") ||
            message.includes("auth/operation-not-supported-in-this-environment");

          if (shouldFallbackToRedirect) {
            await signInWithRedirect(auth, googleProvider);
            return;
          }

          throw error;
        }
      },
      signInWithEmailPassword: async (email: string, password: string) => {
        const auth = getFirebaseAuth();
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await syncServerSession(credential.user);
      },
      registerWithEmailPassword: async (email: string, password: string) => {
        const auth = getFirebaseAuth();
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await syncServerSession(credential.user);
      },
      signOutUser: async () => {
        const auth = getFirebaseAuth();
        await fetch("/api/auth/logout", { method: "POST" });
        await signOut(auth);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}


