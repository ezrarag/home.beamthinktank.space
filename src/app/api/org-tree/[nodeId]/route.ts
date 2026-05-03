import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { getOrgNodeById, updateOrgNode, type OrgNode, type OrgNodeStatus, type OrgNodeTier } from "@/lib/server/firestoreOrgTree";
import { generateOrgNodeProjection } from "@/lib/server/orgTreeProjection";

interface RouteContext {
  params: Promise<{ nodeId: string }>;
}

const ORG_NODE_TIERS: OrgNodeTier[] = [
  "national",
  "regional",
  "state",
  "city-node",
  "institution-cluster",
  "ngo-division",
  "ngo-role",
];

const ORG_NODE_STATUSES: OrgNodeStatus[] = ["vacant", "filled", "planned", "forming", "active"];

function hasBearerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return Boolean(authHeader?.startsWith("Bearer ") && authHeader.slice("Bearer ".length).trim());
}

function hasOwn(body: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function isOrgNodeTier(value: unknown): value is OrgNodeTier {
  return typeof value === "string" && ORG_NODE_TIERS.includes(value as OrgNodeTier);
}

function isOrgNodeStatus(value: unknown): value is OrgNodeStatus {
  return typeof value === "string" && ORG_NODE_STATUSES.includes(value as OrgNodeStatus);
}

function normalizeFilledBy(value: unknown): OrgNode["filledBy"] {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const name = String(record.name ?? "").trim();
  if (!name) return undefined;

  return {
    name,
    email: String(record.email ?? "").trim() || undefined,
    since: String(record.since ?? "").trim() || undefined,
  };
}

function normalizeMedia(value: unknown): OrgNode["media"] {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const type = record.type;
  const url = String(record.url ?? "").trim();
  const label = String(record.label ?? "").trim();

  if ((type !== "video" && type !== "youtube" && type !== "audio") || !url || !label) {
    return undefined;
  }

  return {
    type,
    url,
    label,
    conceptTimestampMs:
      typeof record.conceptTimestampMs === "number"
        ? record.conceptTimestampMs
        : Number.isFinite(Number(record.conceptTimestampMs))
          ? Number(record.conceptTimestampMs)
          : undefined,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!hasBearerToken(request)) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  try {
    const adminIdentity = await requireAdminIdentity(request);
    const { nodeId } = await context.params;
    const existing = await getOrgNodeById(nodeId, adminIdentity.idToken);

    if (!existing) {
      return NextResponse.json({ error: "Org node not found" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<OrgNode>;
    const updates: Partial<OrgNode> = {};

    if (hasOwn(body, "parentId")) {
      updates.parentId = typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : null;
    }

    if (hasOwn(body, "tier") && isOrgNodeTier(body.tier)) {
      updates.tier = body.tier;
    }

    if (hasOwn(body, "label")) {
      updates.label = String(body.label ?? "").trim();
    }

    if (hasOwn(body, "sublabel")) {
      updates.sublabel = String(body.sublabel ?? "").trim() || undefined;
    }

    if (hasOwn(body, "description")) {
      updates.description = String(body.description ?? "").trim();
    }

    if (hasOwn(body, "status") && isOrgNodeStatus(body.status)) {
      updates.status = body.status;
    }

    if (hasOwn(body, "filledBy")) {
      updates.filledBy = normalizeFilledBy(body.filledBy);
    }

    if (hasOwn(body, "ngoSlug")) {
      updates.ngoSlug = String(body.ngoSlug ?? "").trim() || undefined;
    }

    if (hasOwn(body, "ngoSiteUrl")) {
      updates.ngoSiteUrl = String(body.ngoSiteUrl ?? "").trim() || undefined;
    }

    if (hasOwn(body, "media")) {
      updates.media = normalizeMedia(body.media);
    }

    if (hasOwn(body, "sortOrder")) {
      updates.sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : existing.sortOrder;
    }

    if (hasOwn(body, "publiclyVisible")) {
      updates.publiclyVisible = Boolean(body.publiclyVisible);
    }

    if (hasOwn(body, "aiProjection")) {
      updates.aiProjection =
        body.aiProjection &&
        typeof body.aiProjection === "object" &&
        typeof body.aiProjection.summary === "string" &&
        Number.isFinite(Number(body.aiProjection.estimatedMonthlyImpact)) &&
        typeof body.aiProjection.generatedAt === "string"
          ? {
              summary: body.aiProjection.summary.trim(),
              estimatedMonthlyImpact: Number(body.aiProjection.estimatedMonthlyImpact),
              generatedAt: body.aiProjection.generatedAt,
            }
          : undefined;
    }

    if ((updates.status ?? existing.status) === "vacant" && !hasOwn(body, "filledBy")) {
      updates.filledBy = undefined;
    }

    await updateOrgNode(nodeId, updates, adminIdentity.idToken);

    const nextStatus = updates.status ?? existing.status;
    if (existing.status === "vacant" && nextStatus === "filled") {
      try {
        await generateOrgNodeProjection(nodeId, adminIdentity.idToken);
      } catch (projectionError) {
        console.error("Failed to auto-generate org node projection", projectionError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update org node";
    const status = message.includes("Admin") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
