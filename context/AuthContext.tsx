"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { isEmailWhitelisted } from "@/lib/firestore-helpers";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
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
  /** A Super Admin may inspect a member workspace; member accounts always stay in their own workspace. */
  viewedWorkspaceId: string | null;
  workspaceUsers: AppUser[];
  setViewedWorkspaceId: (workspaceId: string | null) => void;
  isReadOnlyView: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  accessDenied: false,
  profile: null,
  signOutUser: async () => {},
  clearAccessDenied: () => {},
  viewedWorkspaceId: null,
  workspaceUsers: [],
  setViewedWorkspaceId: () => {},
  isReadOnlyView: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [viewedWorkspaceId, setViewedWorkspaceIdState] = useState<string | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    let unsubscribeProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile();
      if (firebaseUser?.email) {
        const whitelisted = await isEmailWhitelisted(firebaseUser.email);
        const token = await firebaseUser.getIdToken();
        const bootstrap = !whitelisted ? await fetch("/api/admin/bootstrap", { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : { allowed: false }).catch(() => ({ allowed: false })) : { allowed: false };
        if (whitelisted || bootstrap.allowed) {
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

  useEffect(() => {
    if (profile?.role !== "super_admin") { setWorkspaceUsers([]); return; }
    return onSnapshot(query(collection(db, "users"), where("active", "==", true)), (snapshot) => {
      setWorkspaceUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AppUser)).sort((a, b) => a.displayName.localeCompare(b.displayName)));
    });
  }, [profile?.role]);

  const setViewedWorkspaceId = (workspaceId: string | null) => {
    const next = profile?.role === "super_admin" ? workspaceId : null;
    setViewedWorkspaceIdState(next);
  };
  const isReadOnlyView = !!viewedWorkspaceId && viewedWorkspaceId !== profile?.workspaceId;

  const signOutUser = async () => {
    await signOut(auth);
  };

  const clearAccessDenied = () => setAccessDenied(false);

  return (
    <AuthContext.Provider value={{ user, loading, accessDenied, profile, signOutUser, clearAccessDenied, viewedWorkspaceId, workspaceUsers, setViewedWorkspaceId, isReadOnlyView }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
