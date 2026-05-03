import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { generateOrgNodeProjection } from "@/lib/server/orgTreeProjection";

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
    const { nodeId } = await context.params;
    const projection = await generateOrgNodeProjection(nodeId, adminIdentity.idToken);
    return NextResponse.json({ projection });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate org node projection";
    const status =
      message.includes("Admin") || message.includes("Invalid Firebase ID token")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
