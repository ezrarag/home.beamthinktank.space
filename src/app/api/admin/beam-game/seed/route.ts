import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity, type AdminUserIdentity } from "@/lib/server/adminAuth";
import { buildBeamSeedData } from "@/lib/beamGameSeedData";
import { upsertBeamSeedData } from "@/lib/server/firestoreBeamGame";

function isDevNoAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function resolveAdminIdentity(request: NextRequest): Promise<AdminUserIdentity | null> {
  try {
    return await requireAdminIdentity(request);
  } catch (error) {
    if (!isDevNoAuthBypassEnabled()) throw error;
    const message = error instanceof Error ? error.message : "";
    const isAuthBlocker =
      message.includes("Missing Bearer token") ||
      message.includes("Missing Firebase ID token") ||
      message.includes("Invalid Firebase ID token") ||
      message.includes("api-key-not-valid") ||
      message.includes("NEXT_PUBLIC_FIREBASE_API_KEY");
    if (!isAuthBlocker) throw error;
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await resolveAdminIdentity(request);
    const payload = buildBeamSeedData();

    if (adminIdentity) {
      await upsertBeamSeedData({
        idToken: adminIdentity.idToken,
        regions: payload.regions,
        projects: payload.projects,
        actions: payload.actions,
        tasks: payload.tasks,
        assets: payload.assets,
      });
    }

    return NextResponse.json({
      status: "ok",
      persisted: Boolean(adminIdentity),
      mode: adminIdentity ? "firebase" : "dev-no-auth",
      counts: {
        regions: payload.regions.length,
        projects: payload.projects.length,
        actions: payload.actions.length,
        tasks: payload.tasks.length,
        assets: payload.assets.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed BEAM game data";
    const status =
      message.includes("Admin privileges") ||
      message.includes("Invalid Firebase ID token") ||
      message.includes("Missing Bearer token")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
