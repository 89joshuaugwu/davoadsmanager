"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { isEmailWhitelisted } from "@/lib/firestore-helpers";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Set true when a sign-in attempt succeeded with Firebase Auth but failed the whitelist check. */
  accessDenied: boolean;
  signOutUser: () => Promise<void>;
  clearAccessDenied: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  accessDenied: false,
  signOutUser: async () => {},
  clearAccessDenied: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        const whitelisted = await isEmailWhitelisted(firebaseUser.email);
        if (whitelisted) {
          setUser(firebaseUser);
          setAccessDenied(false);
        } else {
          setUser(null);
          setAccessDenied(true);
          await signOut(auth);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
  };

  const clearAccessDenied = () => setAccessDenied(false);

  return (
    <AuthContext.Provider value={{ user, loading, accessDenied, signOutUser, clearAccessDenied }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
