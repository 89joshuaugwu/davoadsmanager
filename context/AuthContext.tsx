"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { isEmailWhitelisted } from "@/lib/firestore-helpers";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Set true when a sign-in attempt succeeded with Firebase Auth but failed the whitelist check. */
  accessDenied: boolean;
  profile: AppUser | null;
  signOutUser: () => Promise<void>;
  clearAccessDenied: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  accessDenied: false,
  profile: null,
  signOutUser: async () => {},
  clearAccessDenied: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [profile, setProfile] = useState<AppUser | null>(null);

  useEffect(() => {
    let unsubscribeProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile();
      if (firebaseUser?.email) {
        const whitelisted = await isEmailWhitelisted(firebaseUser.email);
        if (whitelisted) {
          setUser(firebaseUser);
          setAccessDenied(false);
          unsubscribeProfile = onSnapshot(doc(db, "users", firebaseUser.uid), (snapshot) => setProfile(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AppUser) : null));
        } else {
          setUser(null);
          setProfile(null);
          setAccessDenied(true);
          await signOut(auth);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => { unsubscribe(); unsubscribeProfile(); };
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
  };

  const clearAccessDenied = () => setAccessDenied(false);

  return (
    <AuthContext.Provider value={{ user, loading, accessDenied, profile, signOutUser, clearAccessDenied }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
