export type OrgNodeTier =
  | "national"
  | "regional"
  | "state"
  | "city-node"
  | "institution-cluster"
  | "ngo-division"
  | "ngo-role";

export type OrgNodeStatus = "vacant" | "filled" | "planned" | "forming" | "active";

export type OrgNodeMedia = {
  type: "video" | "youtube" | "audio";
  url: string;
  label: string;
  conceptTimestampMs?: number;
};

export type OrgNode = {
  id: string;
  parentId: string | null;
  tier: OrgNodeTier;
  label: string;
  sublabel?: string;
  description: string;
  status: OrgNodeStatus;
  filledBy?: {
    name: string;
    email?: string;
    since?: string;
  };
  ngoSlug?: string;
  ngoSiteUrl?: string;
  media?: OrgNodeMedia;
  aiProjection?: {
    summary: string;
    estimatedMonthlyImpact: number;
    generatedAt: string;
  };
  sortOrder: number;
  publiclyVisible: boolean;
  createdAt: string;
  updatedAt: string;
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

const ORG_NODES_COLLECTION = "orgNodes";

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
  return `projects/${getProjectId()}/databases/(default)/documents/${ORG_NODES_COLLECTION}/${id}`;
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

function slugifyOrgNodeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildOrgNodeId(node: Omit<OrgNode, "id">): string {
  const base = slugifyOrgNodeId(node.ngoSlug ?? node.label ?? node.tier) || "org-node";
  return `${Date.now()}-${base}`;
}

function normalizeOrgNode(node: OrgNode): OrgNode {
  return {
    ...node,
    parentId: node.parentId ?? null,
    sublabel: typeof node.sublabel === "string" && node.sublabel.trim() ? node.sublabel : undefined,
    filledBy:
      node.filledBy && node.filledBy.name?.trim()
        ? {
            name: node.filledBy.name.trim(),
            email: node.filledBy.email?.trim() || undefined,
            since: node.filledBy.since?.trim() || undefined,
          }
        : undefined,
    ngoSlug: node.ngoSlug?.trim() || undefined,
    ngoSiteUrl: node.ngoSiteUrl?.trim() || undefined,
    media:
      node.media && node.media.url?.trim() && node.media.label?.trim()
        ? {
            type: node.media.type,
            url: node.media.url.trim(),
            label: node.media.label.trim(),
            conceptTimestampMs:
              typeof node.media.conceptTimestampMs === "number" ? node.media.conceptTimestampMs : undefined,
          }
        : undefined,
    aiProjection:
      node.aiProjection && typeof node.aiProjection.estimatedMonthlyImpact === "number"
        ? {
            summary: node.aiProjection.summary.trim(),
            estimatedMonthlyImpact: node.aiProjection.estimatedMonthlyImpact,
            generatedAt: node.aiProjection.generatedAt,
          }
        : undefined,
  };
}

function toOrgNodeFields(node: OrgNode): Record<string, unknown> {
  return {
    parentId: node.parentId,
    tier: node.tier,
    label: node.label,
    sublabel: node.sublabel,
    description: node.description,
    status: node.status,
    filledBy: node.filledBy,
    ngoSlug: node.ngoSlug,
    ngoSiteUrl: node.ngoSiteUrl,
    media: node.media,
    aiProjection: node.aiProjection,
    sortOrder: node.sortOrder,
    publiclyVisible: node.publiclyVisible,
    createdAt: node.createdAt,
  };
}

function compareOrgNodes(left: OrgNode, right: OrgNode): number {
  const parentCompare = (left.parentId ?? "").localeCompare(right.parentId ?? "");
  if (parentCompare !== 0) return parentCompare;

  const sortOrderCompare = left.sortOrder - right.sortOrder;
  if (sortOrderCompare !== 0) return sortOrderCompare;

  return left.label.localeCompare(right.label);
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

async function readOrgNodeDocument(nodeId: string, idToken?: string): Promise<FirestoreDocument | null> {
  const response = await fetch(`${getBaseUrl()}/${ORG_NODES_COLLECTION}/${encodeURIComponent(nodeId)}`, {
    method: "GET",
    headers: getHeaders(idToken),
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read org node ${nodeId} (${response.status}): ${text}`);
  }

  return (await response.json()) as FirestoreDocument;
}

async function listOrgNodes(idToken?: string): Promise<OrgNode[]> {
  const rows: OrgNode[] = [];
  let nextPageToken = "";

  do {
    const endpoint = new URL(`${getBaseUrl()}/${ORG_NODES_COLLECTION}`);
    endpoint.searchParams.set("pageSize", "200");
    if (nextPageToken) endpoint.searchParams.set("pageToken", nextPageToken);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: getHeaders(idToken),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list org nodes (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as FirestoreListResponse;
    rows.push(
      ...(payload.documents ?? []).map((document) => normalizeOrgNode(fromFirestoreDocument<OrgNode>(document)))
    );
    nextPageToken = payload.nextPageToken ?? "";
  } while (nextPageToken);

  return rows.sort(compareOrgNodes);
}

async function runPublicOrgNodesQuery(): Promise<OrgNode[]> {
  const response = await fetch(`${getBaseUrl()}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: ORG_NODES_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: "publiclyVisible" },
            op: "EQUAL",
            value: { booleanValue: true },
          },
        },
        orderBy: [
          { field: { fieldPath: "sortOrder" }, direction: "ASCENDING" },
          { field: { fieldPath: "label" }, direction: "ASCENDING" },
        ],
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to query public org nodes (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as FirestoreRunQueryRow[];
  return payload
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map((document) => normalizeOrgNode(fromFirestoreDocument<OrgNode>(document)))
    .sort(compareOrgNodes);
}

function buildSeedNodes(): OrgNode[] {
  const now = new Date().toISOString();

  return [
    {
      id: "national-council",
      parentId: null,
      tier: "national",
      label: "National BEAM council",
      sublabel: "Multi-region coordination",
      description:
        "Cross-regional strategy, shared data standards, federated grant applications (federal NEA, NSF, HUD). Operates on autocatalytic kernel: region coordinators self-report, council responds to patterns not day-to-day operations.",
      status: "planned",
      sortOrder: 0,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "region-great-lakes",
      parentId: "national-council",
      tier: "regional",
      label: "Great Lakes regional coordinator",
      sublabel: "WI + IL + MI + OH + IN",
      description:
        "Coordinates the Great Lakes operating band across state teams, aligning resource sharing, reporting rhythms, and multi-state partner strategy.",
      status: "planned",
      sortOrder: 0,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "state-wisconsin",
      parentId: "region-great-lakes",
      tier: "state",
      label: "Wisconsin state BEAM team",
      sublabel: "Madison · Milwaukee · Oshkosh",
      description:
        "State-level leadership for Wisconsin, linking the city-node teams into one operating picture for expansion, staffing, and statewide funding strategy.",
      status: "planned",
      sortOrder: 0,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "city-milwaukee",
      parentId: "state-wisconsin",
      tier: "city-node",
      label: "Milwaukee city-node leadership",
      sublabel: "~35-mile radius",
      description:
        "Oversees all BEAM presence within greater Milwaukee — UWM, Marquette, MATC, MSOE, Cardinal Stritch, community partners. Coordinates with MPL and holds the civic anchor relationships at city scale.",
      status: "forming",
      sortOrder: 0,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cluster-uwm",
      parentId: "city-milwaukee",
      tier: "institution-cluster",
      label: "UWM NGO cluster",
      sublabel: "University of Wisconsin–Milwaukee",
      description:
        "All active BEAM NGOs at UWM share Bader Hall, the UWM Foundation relationship, and the shared home-beam Firebase project.",
      status: "forming",
      sortOrder: 0,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-choir",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Choir NGO",
      sublabel: "choir.beamthinktank.space",
      description:
        "The choral division of the UWM cluster, spanning repertoire support, conducting, performance, recording, and music education leadership.",
      status: "forming",
      ngoSlug: "choir",
      ngoSiteUrl: "https://choir.beamthinktank.space",
      sortOrder: 0,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-orchestra",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Orchestra NGO",
      sublabel: "orchestra.beamthinktank.space",
      description:
        "The orchestral division coordinating ensemble leadership, repertoire development, and institutional performance opportunities.",
      status: "forming",
      ngoSlug: "orchestra",
      ngoSiteUrl: "https://orchestra.beamthinktank.space",
      sortOrder: 1,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-finance",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Finance NGO",
      sublabel: "finance.beamthinktank.space",
      description:
        "The finance division supporting fiscal systems, capital planning, and the network's operational accountability infrastructure.",
      status: "active",
      ngoSlug: "finance",
      ngoSiteUrl: "https://finance.beamthinktank.space",
      sortOrder: 2,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-architecture",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Architecture NGO",
      sublabel: "architecture.beamthinktank.space",
      description:
        "The architecture division for spatial design, campus buildout, and civic planning work within the BEAM operating system.",
      status: "forming",
      ngoSlug: "architecture",
      ngoSiteUrl: "https://architecture.beamthinktank.space",
      sortOrder: 3,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-food",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Food NGO",
      sublabel: "food.beamthinktank.space",
      description:
        "The food division handling nourishment systems, culinary operations, and food-access programming in the UWM cluster.",
      status: "forming",
      ngoSlug: "food",
      ngoSiteUrl: "https://food.beamthinktank.space",
      sortOrder: 4,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-environment",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Environment NGO",
      sublabel: "environment.beamthinktank.space",
      description:
        "The environment division working on ecological stewardship, site systems, and environmental measurement inside the BEAM network.",
      status: "forming",
      ngoSlug: "environment",
      ngoSiteUrl: "https://environment.beamthinktank.space",
      sortOrder: 5,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-education",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Education NGO",
      sublabel: "education.beamthinktank.space",
      description:
        "The education division shaping pedagogy, student pipelines, and institutional teaching programs across the BEAM network.",
      status: "planned",
      ngoSlug: "education",
      ngoSiteUrl: "https://education.beamthinktank.space",
      sortOrder: 6,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-transportation",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Transportation NGO",
      sublabel: "transportation.beamthinktank.space",
      description:
        "The transportation division for mobility systems, access planning, and public-infrastructure coordination.",
      status: "forming",
      ngoSlug: "transportation",
      ngoSiteUrl: "https://transportation.beamthinktank.space",
      sortOrder: 7,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-forge",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Forge NGO",
      sublabel: "forge.beamthinktank.space",
      description:
        "The forge division for fabrication, prototyping, and physical production systems that support BEAM programs.",
      status: "forming",
      ngoSlug: "forge",
      ngoSiteUrl: "https://forge.beamthinktank.space",
      sortOrder: 8,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ngo-grounds",
      parentId: "cluster-uwm",
      tier: "ngo-division",
      label: "Grounds NGO",
      sublabel: "grounds.beamthinktank.space",
      description:
        "The grounds division responsible for site stewardship, campus presence, and the lived public environment of BEAM spaces.",
      status: "forming",
      ngoSlug: "grounds",
      ngoSiteUrl: "https://grounds.beamthinktank.space",
      sortOrder: 9,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "choir-director",
      parentId: "ngo-choir",
      tier: "ngo-role",
      label: "Choir NGO director",
      description: "Oversees all five tracks and the repertoire & support function.",
      status: "filled",
      filledBy: { name: "Ezra Haugabrooks" },
      sortOrder: 0,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "choir-repertoire-lead",
      parentId: "ngo-choir",
      tier: "ngo-role",
      label: "Institutional repertoire & support lead",
      description:
        "Activates BEAM support structure around faculty productions. Runs recruitment pipeline (middle school → graduate), scholarship fundraising, and community participant integration for productions like Aguilar opera and Zinck ensemble work.",
      status: "vacant",
      sortOrder: 1,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "choir-composition-lead",
      parentId: "ngo-choir",
      tier: "ngo-role",
      label: "Composition & arrangement lead",
      description:
        "Score IP, arrangement commissions, repertoire library. Robert Danner — candidate.",
      status: "vacant",
      sortOrder: 2,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "choir-vocal-lead",
      parentId: "ngo-choir",
      tier: "ngo-role",
      label: "Vocal performance lead",
      description:
        "Leads choral vocal coaching, soloist preparation, and ensemble readiness across BEAM choir productions.",
      status: "vacant",
      sortOrder: 3,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "choir-conducting-lead",
      parentId: "ngo-choir",
      tier: "ngo-role",
      label: "Choral conducting lead",
      description:
        "Builds conducting capacity for rehearsals and performances, increasing the number of productions the choir division can sustain.",
      status: "vacant",
      sortOrder: 4,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "choir-recording-lead",
      parentId: "ngo-choir",
      tier: "ngo-role",
      label: "Recording & production lead",
      description:
        "Owns capture, editing, and release workflows for choir media, live sessions, and production-ready assets.",
      status: "vacant",
      sortOrder: 5,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "choir-education-lead",
      parentId: "ngo-choir",
      tier: "ngo-role",
      label: "Music education lead",
      description:
        "Develops the student learning pipeline and external education partnerships that turn participation into long-run enrollment and scholarship outcomes.",
      status: "vacant",
      sortOrder: 6,
      publiclyVisible: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function getPublicOrgNodes(): Promise<OrgNode[]> {
  const nodes = await runPublicOrgNodesQuery();
  return nodes.filter((node) => node.publiclyVisible);
}

export async function getOrgNodeById(nodeId: string, idToken?: string): Promise<OrgNode | null> {
  const document = await readOrgNodeDocument(nodeId, idToken);
  if (!document) return null;
  return normalizeOrgNode(fromFirestoreDocument<OrgNode>(document));
}

export async function getAllOrgNodes(idToken: string): Promise<OrgNode[]> {
  return listOrgNodes(idToken);
}

export async function createOrgNode(node: Omit<OrgNode, "id">, idToken: string): Promise<string> {
  const id = buildOrgNodeId(node);
  const normalized = normalizeOrgNode({ ...node, id });

  await commitWrites(idToken, [
    {
      update: {
        name: getDocumentName(id),
        fields: toFirestoreFields(toOrgNodeFields(normalized)),
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

export async function updateOrgNode(
  nodeId: string,
  updates: Partial<OrgNode>,
  idToken: string
): Promise<void> {
  const existingDocument = await readOrgNodeDocument(nodeId, idToken);
  if (!existingDocument) {
    throw new Error(`Org node not found: ${nodeId}`);
  }

  const existing = normalizeOrgNode(fromFirestoreDocument<OrgNode>(existingDocument));
  const nextNode = normalizeOrgNode({
    ...existing,
    ...updates,
    id: nodeId,
  });

  const fields = toOrgNodeFields(nextNode);

  await commitWrites(idToken, [
    {
      update: {
        name: getDocumentName(nodeId),
        fields: toFirestoreFields(fields),
      },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: { exists: true },
    },
    {
      transform: {
        document: getDocumentName(nodeId),
        fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      },
    },
  ]);
}

export async function seedOrgTreeIfEmpty(idToken: string): Promise<void> {
  const existing = await listOrgNodes(idToken);
  if (existing.length > 0) return;

  const seedNodes = buildSeedNodes();
  const writes: unknown[] = [];

  for (const node of seedNodes) {
    writes.push({
      update: {
        name: getDocumentName(node.id),
        fields: toFirestoreFields(toOrgNodeFields(node)),
      },
      currentDocument: { exists: false },
    });
    writes.push({
      transform: {
        document: getDocumentName(node.id),
        fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      },
    });
  }

  await commitWrites(idToken, writes);
}
