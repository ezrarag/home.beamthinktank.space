import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { getAllOrgNodes, seedOrgTreeIfEmpty } from "@/lib/server/firestoreOrgTree";

interface RouteContext {
  params: Promise<{ nodeId: string }>;
}

function hasBearerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return Boolean(authHeader?.startsWith("Bearer ") && authHeader.slice("Bearer ".length).trim());
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasBearerToken(request)) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  try {
    const adminIdentity = await requireAdminIdentity(request);
    await context.params;

    const before = await getAllOrgNodes(adminIdentity.idToken);
    await seedOrgTreeIfEmpty(adminIdentity.idToken);
    const after = await getAllOrgNodes(adminIdentity.idToken);

    if (before.length > 0) {
      return NextResponse.json({
        seeded: false,
        message: "Org tree already contains data. Seed was skipped.",
      });
    }

    return NextResponse.json({
      seeded: after.length > 0,
      message: after.length > 0 ? "Initial org tree seeded." : "Seed completed without creating nodes.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed org tree";
    const status = message.includes("Admin") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
