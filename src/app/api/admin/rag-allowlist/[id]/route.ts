import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { updateAllowlistEntryStatus } from "@/lib/server/firestoreRagAllowlist";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const body = (await request.json().catch(() => ({}))) as { active?: boolean };
    const { id } = await context.params;

    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active must be a boolean." }, { status: 400 });
    }

    await updateAllowlistEntryStatus(id, body.active, adminIdentity.idToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update ReadyAimGo client";
    const status = message.includes("Admin") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
