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
  sessionReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const syncServerSession = async (nextUser: User | null) => {
    if (!nextUser) {
      return;
    }

    const idToken = await nextUser.getIdToken();
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message =
        data && typeof data.error === "string" && data.error.trim()
          ? data.error
          : "Unable to create server session.";
      throw new Error(message);
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      setSessionReady(false);

      if (!nextUser) {
        setSessionReady(true);
        return;
      }

      // Avoid blocking app render on session sync.
      void syncServerSession(nextUser)
        .catch(() => {
          // Keep client auth state even if server session sync fails.
        })
        .finally(() => {
          setSessionReady(true);
        });
    });

    // Resolve redirect sign-in result in the background for popup fallback flows.
    void getRedirectResult(auth).catch(() => {
      // Final auth state is handled by onAuthStateChanged.
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      sessionReady,
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
    [loading, sessionReady, user]
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


