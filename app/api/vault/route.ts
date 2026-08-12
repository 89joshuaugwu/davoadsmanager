import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { decryptValue, encryptValue } from "@/lib/crypto";

/**
 * Keeps the AES key server-only. The client sends a Firebase ID token,
 * we verify it and re-check the whitelist here — never trust the client's
 * own auth state for anything that touches a real password.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whitelistDoc = await getAdminDb().collection("whitelistedUsers").doc(email).get();
    if (!whitelistDoc.exists) {
      return NextResponse.json(
        { error: "Access Denied: Unregistered Email" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, value } = body as { action?: string; value?: string };

    if (!value || (action !== "encrypt" && action !== "decrypt")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = action === "encrypt" ? encryptValue(value) : decryptValue(value);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("Vault error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
