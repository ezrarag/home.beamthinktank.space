import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { getAllNodes, slugifyNodeId, updateNode, type BeamNode } from "@/lib/server/firestoreNodes";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const { id } = await context.params;
    const node = (await getAllNodes(adminIdentity.idToken)).find((entry) => entry.id === slugifyNodeId(id)) ?? null;
    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }
    return NextResponse.json({ node });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load node";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const { id } = await context.params;
    const normalizedId = slugifyNodeId(id);
    const body = (await request.json()) as Partial<BeamNode>;
    const existing = (await getAllNodes(adminIdentity.idToken)).find((node) => node.id === normalizedId);

    if (!existing) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    await updateNode(
      normalizedId,
      {
        ...existing,
        ...body,
        id: normalizedId,
        anchorInstitution: body.anchorInstitution ?? existing.anchorInstitution,
        coordinator: body.coordinator === undefined ? existing.coordinator : body.coordinator,
        focusSectors: Array.isArray(body.focusSectors) ? body.focusSectors.map(String) : existing.focusSectors,
        coordinates: Array.isArray(body.coordinates)
          ? [Number(body.coordinates[0]), Number(body.coordinates[1])]
          : existing.coordinates,
        activationChecklist: body.activationChecklist ?? existing.activationChecklist,
      },
      adminIdentity.idToken
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update node";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
