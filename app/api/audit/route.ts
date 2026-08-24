import { NextRequest, NextResponse } from "next/server";
import { requireUser, writeAudit } from "@/lib/server-auth";

const entityTypes = new Set(["gmailAccount", "businessAccount", "adsAccount", "dailyEntry", "card", "transaction", "dailyRevenue"]);

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const body = await request.json();
    if (typeof body.action !== "string" || typeof body.entityId !== "string" || !entityTypes.has(body.entityType)) return NextResponse.json({ error: "Invalid audit event." }, { status: 400 });
    await writeAudit({ workspaceId: actor.workspaceId, actorId: actor.id, actorEmail: actor.email, action: body.action.slice(0, 80), entityType: body.entityType, entityId: body.entityId, entityLabel: typeof body.entityLabel === "string" ? body.entityLabel.slice(0, 160) : undefined, details: typeof body.details === "object" && body.details ? body.details : undefined });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to record activity." }, { status: 401 }); }
}
