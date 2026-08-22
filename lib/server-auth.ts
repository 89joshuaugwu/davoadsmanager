import "server-only";
import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import type { AppUser } from "@/types";

export async function requireUser(request: NextRequest): Promise<AppUser> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("UNAUTHORIZED");
  const decoded = await getAdminAuth().verifyIdToken(token);
  const profile = await getAdminDb().collection("users").doc(decoded.uid).get();
  if (!profile.exists || profile.data()?.active === false) throw new Error("FORBIDDEN");
  return { id: decoded.uid, ...profile.data() } as AppUser;
}

export async function requireSuperAdmin(request: NextRequest) {
  const user = await requireUser(request);
  if (user.role !== "super_admin") throw new Error("FORBIDDEN");
  return user;
}

export async function writeAudit(input: Omit<import("@/types").AuditLog, "id" | "createdAt">) {
  await getAdminDb().collection("auditLogs").add({ ...input, createdAt: Date.now() });
}
