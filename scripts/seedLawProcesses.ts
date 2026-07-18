export {};

import { execSync } from "node:child_process";

type BeamProcessStageStatus = "complete" | "active" | "idle";

type BeamProcess = {
  title: string;
  domain: "library" | "grounds" | "architecture" | "forge" | "band" | "other" | "law" | "grants";
  linkedEntityId?: string;
  linkedEntityType?: string;
  stages: Array<{
    id: string;
    label: string;
    status: BeamProcessStageStatus;
    owner: string;
    note: string;
    updatedAt: string;
  }>;
  funding?: {
    targetUsd: number;
    raisedUsd: number;
    label: string;
    deadlineDate?: string;
  };
  createdAt: string;
  updatedAt: string;
};

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

const now = new Date().toISOString();

const beamProcesses: BeamProcess[] = [
  {
    title: "BEAM 501(c)(3) Filing",
    domain: "law",
    stages: [
      {
        id: "identified",
        label: "Identified",
        status: "complete",
        owner: "TBD",
        note: "501(c)(3) filing target identified.",
        updatedAt: now,
      },
      {
        id: "assigned",
        label: "Assigned",
        status: "active",
        owner: "DeTania",
        note: "Assigned to legal team lead DeTania.",
        updatedAt: now,
      },
      {
        id: "filed-drafting",
        label: "Filed/Drafting",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "under-review",
        label: "Under Review",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "resolved",
        label: "Resolved",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    title: "BEAM Trademark Registration",
    domain: "law",
    stages: [
      {
        id: "identified",
        label: "Identified",
        status: "complete",
        owner: "TBD",
        note: "Trademark protection requirements assessed.",
        updatedAt: now,
      },
      {
        id: "assigned",
        label: "Assigned",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "filed-drafting",
        label: "Filed/Drafting",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "under-review",
        label: "Under Review",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "resolved",
        label: "Resolved",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    title: "Multi-State Foreign Entity + Charitable Solicitation Registration",
    domain: "law",
    stages: [
      {
        id: "identified",
        label: "Identified",
        status: "complete",
        owner: "TBD",
        note: "required per-state as BEAM expands beyond Florida/Wisconsin",
        updatedAt: now,
      },
      {
        id: "assigned",
        label: "Assigned",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "filed-drafting",
        label: "Filed/Drafting",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "under-review",
        label: "Under Review",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
      {
        id: "resolved",
        label: "Resolved",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

function slugifyProcessId(value: string): string {
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

function getAccessToken(): string {
  const cliToken = process.argv[2]?.trim();
  const envToken =
    process.env.FIREBASE_ID_TOKEN?.trim() ||
    process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim() ||
    process.env.GCLOUD_ACCESS_TOKEN?.trim() ||
    process.env.FIREBASE_ACCESS_TOKEN?.trim();

  if (cliToken || envToken) {
    return cliToken || envToken || "";
  }

  try {
    return execSync("gcloud auth print-access-token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(
      "No Google access token found. Run `gcloud auth login` first, pass one as the first CLI arg, or set FIREBASE_ID_TOKEN."
    );
  }
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function getDocumentName(id: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/beamProcesses/${id}`;
}

// Check if string is ISO Date string
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

async function commitWrites(accessToken: string, writes: unknown[]): Promise<void> {
  const response = await fetch(`${getBaseUrl()}:commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore write failed (${response.status}): ${text}`);
  }
}

async function seed() {
  const accessToken = getAccessToken();

  for (const process of beamProcesses) {
    const id = slugifyProcessId(process.title);
    const fields = toFirestoreFields(process);

    await commitWrites(accessToken, [
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

    console.log(`Seeded beam process: ${process.title}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
