import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { addToAllowlist, listAllowlistEntries } from "@/lib/server/firestoreRagAllowlist";

function slugifyClientName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const entries = await listAllowlistEntries(adminIdentity.idToken);
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ReadyAimGo allowlist";
    const status = message.includes("Admin") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const body = (await request.json()) as {
      email?: string;
      clientName?: string;
      clientSlug?: string;
      notes?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const clientName = body.clientName?.trim() ?? "";
    const clientSlug = (body.clientSlug?.trim() || slugifyClientName(clientName)).toLowerCase();
    const notes = body.notes?.trim() ?? "";

    if (!email || !clientName || !clientSlug) {
      return NextResponse.json({ error: "Email, client name, and client slug are required." }, { status: 400 });
    }

    const entry = await addToAllowlist(
      {
        email,
        clientName,
        clientSlug,
        addedBy: adminIdentity.email ?? adminIdentity.uid,
        notes,
      },
      adminIdentity.idToken
    );

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add ReadyAimGo client";
    const status = message.includes("Admin") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
