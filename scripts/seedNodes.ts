type NodeStage = 0 | 1 | 2 | 3 | 4;
type NodeStatus = "identified" | "forming" | "activating" | "active" | "established";

type SeedNode = {
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
  activatedAt: string | null;
};

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

const nodes: SeedNode[] = [
  {
    city: "Milwaukee",
    state: "WI",
    stage: 3,
    status: "active",
    publiclyVisible: true,
    coordinates: [-87.9065, 43.0389],
    anchorInstitution: { name: "UW-Milwaukee (target)", confirmedAt: null },
    focusSectors: ["real-estate", "music", "engineering", "housing", "education"],
    coordinator: null,
    memberCount: 0,
    activationChecklist: {
      anchorConfirmed: false,
      minNGOsReached: true,
      legalStructure: false,
      coordinatorActive: true,
      toolsTested: false,
    },
    publicSummary: "The Milwaukee node is actively forming across real estate, music, engineering, and education sectors.",
    activatedAt: null,
  },
  {
    city: "Atlanta",
    state: "GA",
    stage: 3,
    status: "active",
    publiclyVisible: true,
    coordinates: [-84.388, 33.749],
    anchorInstitution: { name: "Georgia State / Morehouse / Spelman (target)", confirmedAt: null },
    focusSectors: ["civic-tech", "housing", "education", "health"],
    coordinator: null,
    memberCount: 0,
    activationChecklist: {
      anchorConfirmed: false,
      minNGOsReached: true,
      legalStructure: false,
      coordinatorActive: true,
      toolsTested: false,
    },
    publicSummary: "The Atlanta node spans civic technology, housing advocacy, education, and community health.",
    activatedAt: null,
  },
  {
    city: "Madison",
    state: "WI",
    stage: 2,
    status: "activating",
    publiclyVisible: true,
    coordinates: [-89.4012, 43.0731],
    anchorInstitution: { name: "UW-Madison (proximity)", confirmedAt: null },
    focusSectors: ["policy", "education"],
    coordinator: null,
    memberCount: 0,
    activationChecklist: {
      anchorConfirmed: false,
      minNGOsReached: false,
      legalStructure: false,
      coordinatorActive: false,
      toolsTested: false,
    },
    publicSummary: "The Madison node is forming. Express interest to be notified when it activates.",
    activatedAt: null,
  },
  {
    city: "Orlando",
    state: "FL",
    stage: 0,
    status: "identified",
    publiclyVisible: false,
    coordinates: [-81.3792, 28.5383],
    anchorInstitution: { name: "UCF — University of Central Florida (target)", confirmedAt: null },
    focusSectors: [],
    coordinator: null,
    memberCount: 0,
    activationChecklist: {
      anchorConfirmed: false,
      minNGOsReached: false,
      legalStructure: false,
      coordinatorActive: false,
      toolsTested: false,
    },
    publicSummary: "",
    activatedAt: null,
  },
];

function slugifyNodeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.");
  }
  return projectId;
}

function getIdToken(): string {
  const cliToken = process.argv[2]?.trim();
  const envToken = process.env.FIREBASE_ID_TOKEN?.trim();
  const idToken = cliToken || envToken || "";
  if (!idToken) {
    throw new Error("Pass a Firebase ID token as the first CLI arg or FIREBASE_ID_TOKEN env var.");
  }
  return idToken;
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function getDocumentName(id: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/nodes/${id}`;
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
  if (typeof value === "number") return { integerValue: String(Math.trunc(value)) };
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

async function commitWrites(idToken: string, writes: unknown[]): Promise<void> {
  const response = await fetch(`${getBaseUrl()}:commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore write failed (${response.status}): ${text}`);
  }
}

async function seed() {
  const idToken = getIdToken();

  for (const node of nodes) {
    const id = slugifyNodeId(node.city);
    const fields = toFirestoreFields({
      ...node,
      createdAt: new Date().toISOString(),
    });

    await commitWrites(idToken, [
      {
        update: {
          name: getDocumentName(id),
          fields,
        },
      },
      {
        transform: {
          document: getDocumentName(id),
          fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
        },
      },
    ]);

    console.log(`Seeded node: ${id}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
