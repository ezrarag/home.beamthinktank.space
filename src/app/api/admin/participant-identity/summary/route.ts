import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { fetchParticipantIdentitySummary } from "@/lib/server/firestoreParticipantIdentity";

export async function GET(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const summary = await fetchParticipantIdentitySummary({
      idToken: adminIdentity.idToken,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load participant identity summary";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
