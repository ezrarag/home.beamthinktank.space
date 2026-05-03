import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { createOrgNode, getAllOrgNodes, type OrgNode, type OrgNodeStatus, type OrgNodeTier } from "@/lib/server/firestoreOrgTree";

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

function normalizeAiProjection(value: unknown): OrgNode["aiProjection"] {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const summary = String(record.summary ?? "").trim();
  const estimatedMonthlyImpact = Number(record.estimatedMonthlyImpact ?? NaN);
  const generatedAt = String(record.generatedAt ?? "").trim();

  if (!summary || !Number.isFinite(estimatedMonthlyImpact) || !generatedAt) {
    return undefined;
  }

  return {
    summary,
    estimatedMonthlyImpact,
    generatedAt,
  };
}

function normalizeCreatePayload(body: Partial<OrgNode>): Omit<OrgNode, "id"> {
  const now = new Date().toISOString();

  return {
    parentId: typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : null,
    tier: isOrgNodeTier(body.tier) ? body.tier : "ngo-role",
    label: String(body.label ?? "").trim(),
    sublabel: String(body.sublabel ?? "").trim() || undefined,
    description: String(body.description ?? "").trim(),
    status: isOrgNodeStatus(body.status) ? body.status : "planned",
    filledBy: normalizeFilledBy(body.filledBy),
    ngoSlug: String(body.ngoSlug ?? "").trim() || undefined,
    ngoSiteUrl: String(body.ngoSiteUrl ?? "").trim() || undefined,
    media: normalizeMedia(body.media),
    aiProjection: normalizeAiProjection(body.aiProjection),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    publiclyVisible: typeof body.publiclyVisible === "boolean" ? body.publiclyVisible : true,
    createdAt: typeof body.createdAt === "string" && body.createdAt.trim() ? body.createdAt : now,
    updatedAt: now,
  };
}

export async function GET(request: NextRequest) {
  if (!hasBearerToken(request)) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  try {
    const adminIdentity = await requireAdminIdentity(request);
    const nodes = await getAllOrgNodes(adminIdentity.idToken);
    return NextResponse.json({ nodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load org nodes";
    const status = message.includes("Admin") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!hasBearerToken(request)) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  try {
    const adminIdentity = await requireAdminIdentity(request);
    const body = (await request.json()) as Partial<OrgNode>;
    const node = normalizeCreatePayload(body);

    if (!node.label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    const id = await createOrgNode(node, adminIdentity.idToken);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create org node";
    const status = message.includes("Admin") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
