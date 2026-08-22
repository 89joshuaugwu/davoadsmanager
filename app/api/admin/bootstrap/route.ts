import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

/** One-time bootstrap. Set SUPER_ADMIN_EMAIL in Vercel/local env to your own email. */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = await getAdminAuth().verifyIdToken(token);
    const email = decoded.email?.toLowerCase();
    if (!email || email !== process.env.SUPER_ADMIN_EMAIL?.toLowerCase()) return NextResponse.json({ error: "Only the configured super admin can bootstrap the platform." }, { status: 403 });
    const db = getAdminDb(); const profile = db.collection("users").doc(decoded.uid); const existing = await profile.get();
    if (existing.exists) return NextResponse.json({ ok: true, workspaceId: existing.data()?.workspaceId });
    const workspace = db.collection("workspaces").doc(); const now = Date.now(); const batch = db.batch();
    batch.set(workspace, { name: "Joshua's Ads Workspace", ownerId: decoded.uid, createdAt: now, updatedAt: now });
    batch.set(profile, { email, displayName: decoded.name || "Super Admin", role: "super_admin", workspaceId: workspace.id, active: true, createdAt: now, updatedAt: now });
    await batch.commit(); return NextResponse.json({ ok: true, workspaceId: workspace.id });
  } catch (error) { console.error("bootstrap", error); return NextResponse.json({ error: "Unable to bootstrap" }, { status: 500 }); }
}
