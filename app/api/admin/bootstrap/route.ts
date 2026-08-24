import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

function isConfiguredSuperAdmin(email?: string) {
  if (!email) return false;
  const normalised = email.toLowerCase();
  return [process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_EMAIL2]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase() === normalised);
}

async function verifiedConfiguredUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = await getAdminAuth().verifyIdToken(token);
  return isConfiguredSuperAdmin(decoded.email) ? decoded : null;
}

/** Lets the login flow retain a configured, not-yet-bootstrapped super admin. */
export async function GET(request: NextRequest) {
  try { return NextResponse.json({ allowed: Boolean(await verifiedConfiguredUser(request)) }); }
  catch { return NextResponse.json({ allowed: false }); }
}

/**
 * Bootstrap one or two configured super admins. The second super admin joins the
 * first super admin's workspace so both see the same operational records.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = await verifiedConfiguredUser(request);
    if (!decoded?.email) return NextResponse.json({ error: "Only a configured super admin can bootstrap the platform." }, { status: 403 });
    const db = getAdminDb(); const email = decoded.email.toLowerCase(); const now = Date.now();
    const existingSuper = await db.collection("users").where("role", "==", "super_admin").limit(1).get();
    const existingProfile = await db.collection("users").doc(decoded.uid).get();
    const workspaceId = existingSuper.docs[0]?.data().workspaceId || existingProfile.data()?.workspaceId || db.collection("workspaces").doc().id;
    const batch = db.batch();
    if (existingSuper.empty && !existingProfile.exists) batch.set(db.collection("workspaces").doc(workspaceId), { name: "DavoPay Ads Workspace", ownerId: decoded.uid, createdAt: now, updatedAt: now });
    batch.set(db.collection("users").doc(decoded.uid), { email, displayName: decoded.name || email.split("@")[0], role: "super_admin", workspaceId, active: true, createdAt: existingProfile.data()?.createdAt || now, updatedAt: now }, { merge: true });
    batch.set(db.collection("whitelistedUsers").doc(email), { addedAt: now, addedBy: decoded.uid });
    await batch.commit();
    return NextResponse.json({ ok: true, workspaceId });
  } catch (error) { console.error("bootstrap", error); return NextResponse.json({ error: "Unable to bootstrap" }, { status: 500 }); }
}
