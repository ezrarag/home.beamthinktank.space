import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { seedWebsiteDirectoryEntry } from "@/lib/server/firestoreWebsiteDirectory";
import { DEFAULT_WEBSITE_DIRECTORY_SEED } from "@/lib/websiteDirectory";

const DEFAULT_SEED_ID = "beam-home-site";

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const actor = adminIdentity.email ?? adminIdentity.uid;
    const status = await seedWebsiteDirectoryEntry({
      idToken: adminIdentity.idToken,
      id: DEFAULT_SEED_ID,
      input: DEFAULT_WEBSITE_DIRECTORY_SEED,
      actor,
    });

    return NextResponse.json({ status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed directory";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
