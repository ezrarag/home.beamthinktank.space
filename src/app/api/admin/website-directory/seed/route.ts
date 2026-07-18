import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { seedWebsiteDirectoryEntry } from "@/lib/server/firestoreWebsiteDirectory";
import { DEFAULT_HOMEPAGE_CARDS } from "@/lib/websiteDirectory";

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const actor = adminIdentity.email ?? adminIdentity.uid;
    const status = await Promise.all(
      DEFAULT_HOMEPAGE_CARDS.map(({ id, ...input }) =>
        seedWebsiteDirectoryEntry({
          idToken: adminIdentity.idToken,
          id,
          input,
          actor,
        }),
      ),
    );

    return NextResponse.json({ status, count: status.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed directory";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
