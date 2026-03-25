import { NextRequest, NextResponse } from "next/server";
import { buildInitialParticipantIdentitySeed } from "@/lib/participantIdentity";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { upsertParticipantIdentitySeedData } from "@/lib/server/firestoreParticipantIdentity";

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const payload = buildInitialParticipantIdentitySeed();
    const result = await upsertParticipantIdentitySeedData({
      idToken: adminIdentity.idToken,
      organizations: payload.organizations,
      cohorts: payload.cohorts,
    });

    return NextResponse.json({
      status: "ok",
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed participant identity data";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
