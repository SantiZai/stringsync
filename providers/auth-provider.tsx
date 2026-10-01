"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types";

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfile?.();
      unsubProfile = undefined;
      setFirebaseUser(user);

      if (!user) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          setAppUser(snap.exists() ? ({ uid: user.uid, ...snap.data() } as AppUser) : null);
          setLoading(false);
        },
        () => {
          setAppUser(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, appUser, loading, logout: () => signOut(auth) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);