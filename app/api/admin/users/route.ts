import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin, writeAudit } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try { const admin = await requireSuperAdmin(request); const users = await getAdminDb().collection("users").orderBy("createdAt", "desc").get(); return NextResponse.json({ users: users.docs.map((item) => ({ id: item.id, ...item.data(), isCurrentUser: item.id === admin.id })) }); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request); const body = await request.json(); const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""; const password = typeof body.password === "string" ? body.password : ""; const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return NextResponse.json({ error: "Use a valid email and a password of at least 8 characters." }, { status: 400 });
    const authUser = await getAdminAuth().createUser({ email, password, displayName: displayName || email.split("@")[0] }); const db = getAdminDb(); const now = Date.now(); const workspace = db.collection("workspaces").doc(); const batch = db.batch();
    batch.set(workspace, { name: `${displayName || email.split("@")[0]}'s workspace`, ownerId: authUser.uid, createdAt: now, updatedAt: now }); batch.set(db.collection("users").doc(authUser.uid), { email, displayName: displayName || email.split("@")[0], role: "member", workspaceId: workspace.id, active: true, createdAt: now, updatedAt: now }); batch.set(db.collection("whitelistedUsers").doc(email), { addedAt: now, addedBy: admin.id }); await batch.commit();
    await writeAudit({ workspaceId: admin.workspaceId, actorId: admin.id, actorEmail: admin.email, action: "user_created", entityType: "user", entityId: authUser.uid, entityLabel: email, details: { workspaceId: workspace.id } }); return NextResponse.json({ ok: true });
  } catch (error) { const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""; const message = code === "auth/email-already-exists" ? "A user with this email already exists." : "Could not create user."; return NextResponse.json({ error: message }, { status: 400 }); }
}
