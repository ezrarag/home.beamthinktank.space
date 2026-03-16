import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity, type AdminUserIdentity } from "@/lib/server/adminAuth";
import { BEAM_TAXONOMY } from "@/lib/beamTaxonomy";
import { normalizeActionWeight, isBeamActionType } from "@/lib/beamGame";
import { generateBeamActionArtifacts } from "@/lib/server/beamActionAi";
import { createBeamActionAndTasks } from "@/lib/server/firestoreBeamGame";
import type { BeamAction, BeamTask } from "@/types/beamGame";

interface CreateActionInput {
  regionId?: string;
  projectId?: string;
  assetId?: string;
  actionType?: string;
  weight?: number;
  summaryRaw?: string;
  mediaIds?: string[];
  visibility?: "public" | "private";
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

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
    const body = (await request.json()) as CreateActionInput;

    const regionId = String(body.regionId ?? "").trim();
    const actionType = String(body.actionType ?? "").trim();
    const summaryRaw = String(body.summaryRaw ?? "").trim();
    const visibility = body.visibility === "private" ? "private" : "public";

    if (!regionId) return badRequest("regionId is required.");
    if (!actionType) return badRequest("actionType is required.");
    if (!summaryRaw) return badRequest("summaryRaw is required.");
    if (!isBeamActionType(actionType, BEAM_TAXONOMY)) {
      return badRequest("actionType must be in docs/beam-taxonomy.json.");
    }

    const now = new Date().toISOString();
    const actionId = randomUUID();

    const ai = await generateBeamActionArtifacts({
      summaryRaw,
      actionType,
      regionId,
      projectId: body.projectId,
      assetId: body.assetId,
    });

    const action: BeamAction = {
      id: actionId,
      regionId,
      projectId: body.projectId?.trim() || undefined,
      assetId: body.assetId?.trim() || undefined,
      actorUserId: adminIdentity?.uid ?? "dev-local",
      actionType,
      timestamp: now,
      weight: normalizeActionWeight(Number(body.weight ?? 3)),
      summaryRaw,
      mediaIds: Array.isArray(body.mediaIds) ? body.mediaIds.map(String) : [],
      aiSummary: ai.aiSummary,
      aiTasks: ai.aiTasks,
      aiRolesNeeded: ai.aiRolesNeeded,
      visibility,
    };

    const tasks: BeamTask[] = ai.aiTasks.map((task) => ({
      id: randomUUID(),
      projectId: action.projectId,
      regionId: action.regionId,
      assetId: action.assetId,
      title: task.title,
      description: task.description,
      requiredRoleTags: task.requiredRoleTags,
      commitment: task.commitment,
      status: "open",
      createdFromActionId: action.id,
    }));

    if (adminIdentity) {
      await createBeamActionAndTasks({
        idToken: adminIdentity.idToken,
        action,
        tasks,
      });
    }

    return NextResponse.json({
      id: action.id,
      aiSummary: action.aiSummary,
      aiTasksCount: tasks.length,
      aiRolesNeeded: action.aiRolesNeeded,
      persisted: Boolean(adminIdentity),
      mode: adminIdentity ? "firebase" : "dev-no-auth",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create action";
    const status =
      message.includes("Admin privileges") ||
      message.includes("Invalid Firebase ID token") ||
      message.includes("Missing Bearer token")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
