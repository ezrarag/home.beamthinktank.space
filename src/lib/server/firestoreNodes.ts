import { beamHotspots, type BeamHotspot } from "@/constants/beamHotspots";

export type NodeStage = 0 | 1 | 2 | 3 | 4;
export type NodeStatus = "identified" | "forming" | "activating" | "active" | "established";

export type BeamNode = {
  id: string;
  city: string;
  state: string;
  stage: NodeStage;
  status: NodeStatus;
  publiclyVisible: boolean;
  coordinates: [number, number];
  anchorInstitution: {
    name: string;
    url?: string;
    confirmedAt: string | null;
  };
  focusSectors: string[];
  coordinator: {
    name: string;
    email: string;
  } | null;
  memberCount: number;
  activationChecklist: {
    anchorConfirmed: boolean;
    minNGOsReached: boolean;
    legalStructure: boolean;
    coordinatorActive: boolean;
    toolsTested: boolean;
  };
  publicSummary: string;
  createdAt: string;
  activatedAt: string | null;
};

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

type FirestoreRunQueryRow = {
  document?: FirestoreDocument;
};

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return projectId;
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function getDocumentName(id: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/nodes/${id}`;
}

function getHeaders(idToken?: string): HeadersInit {
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") {
    return isIsoDateString(value) ? { timestampValue: value } : { stringValue: value };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, innerValue] of Object.entries(value as Record<string, unknown>)) {
      fields[key] = toFirestoreValue(innerValue);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(value: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, innerValue] of Object.entries(value)) {
    fields[key] = toFirestoreValue(innerValue);
  }
  return fields;
}

function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((item) => fromFirestoreValue(item));
  }
  if ("mapValue" in value) {
    const output: Record<string, unknown> = {};
    for (const [key, innerValue] of Object.entries(value.mapValue.fields ?? {})) {
      output[key] = fromFirestoreValue(innerValue);
    }
    return output;
  }
  return null;
}

function fromFirestoreDocument<T extends { id: string }>(document: FirestoreDocument): T {
  const id = document.name.split("/").pop() ?? "";
  const output: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(document.fields ?? {})) {
    output[key] = fromFirestoreValue(value);
  }
  return output as T;
}

function slugifyNodeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hotspotToBeamNode(hotspot: BeamHotspot): BeamNode {
  return {
    id: hotspot.regionKey,
    city: hotspot.city,
    state: hotspot.state,
    stage: hotspot.stage,
    status: hotspot.status,
    publiclyVisible: hotspot.publiclyVisible,
    coordinates: hotspot.coordinates,
    anchorInstitution: {
      name: hotspot.city === "Milwaukee"
        ? "UW-Milwaukee (target)"
        : hotspot.city === "Atlanta"
          ? "Georgia State / Morehouse / Spelman (target)"
          : hotspot.city === "Madison"
            ? "UW-Madison (proximity)"
            : "UCF — University of Central Florida (target)",
      confirmedAt: null,
    },
    focusSectors: hotspot.topTags,
    coordinator: null,
    memberCount: 0,
    activationChecklist: {
      anchorConfirmed: false,
      minNGOsReached: hotspot.city === "Milwaukee" || hotspot.city === "Atlanta",
      legalStructure: false,
      coordinatorActive: hotspot.city === "Milwaukee" || hotspot.city === "Atlanta",
      toolsTested: false,
    },
    publicSummary: hotspot.publicSummary,
    createdAt: new Date(0).toISOString(),
    activatedAt: hotspot.stage >= 3 ? null : null,
  };
}

function fallbackNodes(): BeamNode[] {
  return beamHotspots.map(hotspotToBeamNode);
}

async function commitWrites(idToken: string, writes: unknown[]): Promise<void> {
  const response = await fetch(`${getBaseUrl()}:commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ writes }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore write failed (${response.status}): ${text}`);
  }
}

async function readNodeDocument(nodeId: string, idToken?: string): Promise<FirestoreDocument | null> {
  const response = await fetch(`${getBaseUrl()}/nodes/${encodeURIComponent(nodeId)}`, {
    method: "GET",
    headers: getHeaders(idToken),
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read node ${nodeId} (${response.status}): ${text}`);
  }

  return (await response.json()) as FirestoreDocument;
}

async function listNodes(idToken?: string): Promise<BeamNode[]> {
  const rows: BeamNode[] = [];
  let nextPageToken = "";

  do {
    const endpoint = new URL(`${getBaseUrl()}/nodes`);
    endpoint.searchParams.set("pageSize", "200");
    if (nextPageToken) endpoint.searchParams.set("pageToken", nextPageToken);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: getHeaders(idToken),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list nodes (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as FirestoreListResponse;
    rows.push(...(payload.documents ?? []).map((document) => fromFirestoreDocument<BeamNode>(document)));
    nextPageToken = payload.nextPageToken ?? "";
  } while (nextPageToken);

  return rows;
}

async function runPublicNodesQuery(): Promise<BeamNode[]> {
  const response = await fetch(`${getBaseUrl()}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "nodes" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "publiclyVisible" },
            op: "EQUAL",
            value: { booleanValue: true },
          },
        },
        orderBy: [{ field: { fieldPath: "city" }, direction: "ASCENDING" }],
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to query public nodes (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as FirestoreRunQueryRow[];
  return payload
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map((document) => fromFirestoreDocument<BeamNode>(document));
}

export async function getPublicNodes(): Promise<BeamNode[]> {
  try {
    const nodes = await runPublicNodesQuery();
    if (nodes.length > 0) {
      return nodes.filter((node) => node.publiclyVisible);
    }
  } catch {
    // Fall through to static fallback for local development and pre-seed environments.
  }

  return fallbackNodes().filter((node) => node.publiclyVisible);
}

export async function getNode(nodeId: string): Promise<BeamNode | null> {
  const normalizedId = slugifyNodeId(nodeId);

  try {
    const document = await readNodeDocument(normalizedId);
    if (!document) {
      const fallback = fallbackNodes().find((node) => node.id === normalizedId && node.publiclyVisible);
      return fallback ?? null;
    }
    const node = fromFirestoreDocument<BeamNode>(document);
    return node.publiclyVisible ? node : null;
  } catch {
    const fallback = fallbackNodes().find((node) => node.id === normalizedId && node.publiclyVisible);
    return fallback ?? null;
  }
}

export async function getAllNodes(idToken: string): Promise<BeamNode[]> {
  const nodes = await listNodes(idToken);
  return nodes.length > 0 ? nodes : fallbackNodes();
}

export async function updateNode(nodeId: string, updates: Partial<BeamNode>, idToken: string): Promise<void> {
  const normalizedId = slugifyNodeId(nodeId);
  const existingDocument = await readNodeDocument(normalizedId, idToken);
  if (!existingDocument) {
    throw new Error(`Node not found: ${normalizedId}`);
  }

  const existing = fromFirestoreDocument<BeamNode>(existingDocument);
  const nextNode: BeamNode = {
    ...existing,
    ...updates,
    id: normalizedId,
  };

  const fields = {
    city: nextNode.city,
    state: nextNode.state,
    stage: nextNode.stage,
    status: nextNode.status,
    publiclyVisible: nextNode.publiclyVisible,
    coordinates: nextNode.coordinates,
    anchorInstitution: nextNode.anchorInstitution,
    focusSectors: nextNode.focusSectors,
    coordinator: nextNode.coordinator,
    memberCount: nextNode.memberCount,
    activationChecklist: nextNode.activationChecklist,
    publicSummary: nextNode.publicSummary,
    createdAt: nextNode.createdAt,
    activatedAt: nextNode.activatedAt,
  };

  await commitWrites(idToken, [
    {
      update: {
        name: getDocumentName(normalizedId),
        fields: toFirestoreFields(fields),
      },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: { exists: true },
    },
    {
      transform: {
        document: getDocumentName(normalizedId),
        fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      },
    },
  ]);
}

export async function createNode(node: Omit<BeamNode, "id">, idToken: string): Promise<string> {
  const id = slugifyNodeId(node.city);
  const fields = {
    city: node.city,
    state: node.state,
    stage: node.stage,
    status: node.status,
    publiclyVisible: node.publiclyVisible,
    coordinates: node.coordinates,
    anchorInstitution: node.anchorInstitution,
    focusSectors: node.focusSectors,
    coordinator: node.coordinator,
    memberCount: node.memberCount,
    activationChecklist: node.activationChecklist,
    publicSummary: node.publicSummary,
    createdAt: node.createdAt,
    activatedAt: node.activatedAt,
  };

  await commitWrites(idToken, [
    {
      update: {
        name: getDocumentName(id),
        fields: toFirestoreFields(fields),
      },
      currentDocument: { exists: false },
    },
    {
      transform: {
        document: getDocumentName(id),
        fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      },
    },
  ]);

  return id;
}

export { slugifyNodeId };
