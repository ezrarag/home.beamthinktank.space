import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { createNode, getAllNodes, type BeamNode } from "@/lib/server/firestoreNodes";

export async function GET(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const nodes = await getAllNodes(adminIdentity.idToken);
    return NextResponse.json({ nodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load nodes";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const body = (await request.json()) as Partial<BeamNode>;

    const id = await createNode(
      {
        city: String(body.city ?? "").trim(),
        state: String(body.state ?? "").trim(),
        stage: Number(body.stage ?? 0) as BeamNode["stage"],
        status: String(body.status ?? "identified") as BeamNode["status"],
        publiclyVisible: Boolean(body.publiclyVisible),
        coordinates: Array.isArray(body.coordinates) ? [Number(body.coordinates[0]), Number(body.coordinates[1])] : [0, 0],
        anchorInstitution: {
          name: String(body.anchorInstitution?.name ?? "").trim(),
          url: body.anchorInstitution?.url?.trim() || undefined,
          confirmedAt: body.anchorInstitution?.confirmedAt ?? null,
        },
        focusSectors: Array.isArray(body.focusSectors) ? body.focusSectors.map(String) : [],
        coordinator: body.coordinator
          ? {
              name: String(body.coordinator.name ?? "").trim(),
              email: String(body.coordinator.email ?? "").trim(),
            }
          : null,
        memberCount: Number(body.memberCount ?? 0),
        activationChecklist: {
          anchorConfirmed: Boolean(body.activationChecklist?.anchorConfirmed),
          minNGOsReached: Boolean(body.activationChecklist?.minNGOsReached),
          legalStructure: Boolean(body.activationChecklist?.legalStructure),
          coordinatorActive: Boolean(body.activationChecklist?.coordinatorActive),
          toolsTested: Boolean(body.activationChecklist?.toolsTested),
        },
        publicSummary: String(body.publicSummary ?? "").trim(),
        createdAt: new Date().toISOString(),
        activatedAt: body.activatedAt ?? null,
      },
      adminIdentity.idToken
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create node";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
