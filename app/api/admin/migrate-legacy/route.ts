import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin, writeAudit } from "@/lib/server-auth";

const collections = ["gmailAccounts", "businessAccounts", "adsAccounts", "dailyEntries", "transactions", "cards"];

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request); const db = getAdminDb(); const result: Record<string, number> = {};
    for (const name of collections) {
      const snapshot = await db.collection(name).get(); const legacy = snapshot.docs.filter((item) => !item.data().workspaceId); result[name] = legacy.length;
      for (let offset = 0; offset < legacy.length; offset += 400) { const batch = db.batch(); legacy.slice(offset, offset + 400).forEach((item) => batch.update(item.ref, { workspaceId: admin.workspaceId, ownerId: admin.id, migratedAt: Date.now() })); await batch.commit(); }
    }
    await writeAudit({ workspaceId: admin.workspaceId, actorId: admin.id, actorEmail: admin.email, action: "legacy_data_migrated", entityType: "workspace", entityId: admin.workspaceId, entityLabel: "Initial workspace", details: result });
    return NextResponse.json({ ok: true, migrated: result });
  } catch (error) { const message = error instanceof Error && ["UNAUTHORIZED", "FORBIDDEN"].includes(error.message) ? "Forbidden" : "Migration failed"; return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 }); }
}
