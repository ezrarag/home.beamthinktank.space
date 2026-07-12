export {};

import { execSync } from "node:child_process";

type BeamAssetStage = "SIGNAL" | "CLAIM" | "ACCESS" | "STABILIZE" | "ACTIVATE" | "SECURE" | "TRANSFER";

type BeamAsset = {
  name: string;
  address: string;
  regionId: string;
  ownerName: string;
  acquisitionStage: BeamAssetStage;
  condition: "unknown" | "poor" | "fair" | "good" | "excellent";
  operatorNarrative: string;
  primaryUseCases: string[];
  scores: {
    capacity: number;
    impact: number;
    stability: number;
    revenue: number;
    partner: number;
  };
  stageHistory: Array<{
    stage: BeamAssetStage;
    timestamp: string;
    note: string;
  }>;
  linkedProjectIds: string[];
  linkedActionIds: string[];
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

const acquisitionSites: BeamAsset[] = [
  {
    name: "Milwaukee Public Museum — 800 W. Wells St.",
    address: "800 W. Wells St., Milwaukee, WI 53233",
    regionId: "milwaukee-wi",
    ownerName: "Milwaukee County",
    acquisitionStage: "SIGNAL",
    condition: "good",
    operatorNarrative:
      "417,000 sq ft county-owned building vacating in 2027 as MPM relocates to 1310 N. 6th St. Includes Soref Dome Theater and Atrium (18,000+ sq ft). Milwaukee County Economic Development RFP dropping mid-2026. Adaptive reuse explicitly on the table alongside demolition. BEAM target: 24-hour fabrication, library, performance space on ground floor with residential above — modeled on MPL bond-financed hybrid precedent. Contact: Heather Reindl, heather.reindl@milwaukeecountywi.gov. Allies: Tammy Taylor (SARUP, UWM), Chia Youyee Vang (UWM Vice Chancellor).",
    primaryUseCases: ["fabrication", "performance", "education", "housing", "library"],
    scores: { capacity: 5, impact: 5, stability: 3, revenue: 4, partner: 4 },
    stageHistory: [
      {
        stage: "SIGNAL",
        timestamp: now,
        note: "Pre-RFP intro letter to Heather Reindl sent June 2026. Tammy Taylor flagged as acquisition ally. Chia Vang conversation initiated.",
      },
    ],
    linkedProjectIds: [],
    linkedActionIds: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    name: "Milwaukee Public Library — Bond-Financed Hybrid Model",
    address: "814 W. Wisconsin Ave., Milwaukee, WI 53233",
    regionId: "milwaukee-wi",
    ownerName: "City of Milwaukee / MPL",
    acquisitionStage: "ACTIVATE",
    condition: "excellent",
    operatorNarrative:
      "MPL has already executed bond-financed library+housing mixed-use buildings with city support. This is the primary precedent model for BEAM's acquisition strategy — civic anchor on ground floor, residential above, city bond financing. Partnership target for BEAM as anchor tenant or co-developer on future sites.",
    primaryUseCases: ["library", "housing", "education", "community"],
    scores: { capacity: 4, impact: 5, stability: 5, revenue: 3, partner: 5 },
    stageHistory: [
      {
        stage: "ACTIVATE",
        timestamp: now,
        note: "Existing MPL model. Emily Vieyra and Melissa Howard are MPL contacts. Established precedent for bond financing + civic anchor + residential.",
      },
    ],
    linkedProjectIds: [],
    linkedActionIds: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    name: "Central United Methodist Church",
    address: "639 N. 25th St., Milwaukee, WI 53233",
    regionId: "milwaukee-wi",
    ownerName: "Central United Methodist Church",
    acquisitionStage: "ACCESS",
    condition: "fair",
    operatorNarrative:
      "Active pilot project with Rev. Viviane Thomas-Breitfeld. Potential BEAM anchor for music, community gathering, and neighborhood services. Architecture NGO has early design work started. Access established — next stage is stabilize and develop full activation plan.",
    primaryUseCases: ["music", "community", "education", "performance"],
    scores: { capacity: 3, impact: 4, stability: 4, revenue: 2, partner: 5 },
    stageHistory: [
      {
        stage: "ACCESS",
        timestamp: now,
        note: "Pilot project active with Rev. Viviane Thomas-Breitfeld. Architecture.beamthinktank.space has this as a pre-seeded project.",
      },
    ],
    linkedProjectIds: ["arch-central-umc"],
    linkedActionIds: [],
    createdAt: now,
    updatedAt: now,
  },
];

function slugifySiteId(value: string): string {
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
      "No Google access token found. Run `gcloud auth login` first, or pass one as the first CLI arg, or set GOOGLE_OAUTH_ACCESS_TOKEN."
    );
  }
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function getDocumentName(id: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/beamAssets/${id}`;
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

  for (const site of acquisitionSites) {
    const id = slugifySiteId(site.name);
    const fields = toFirestoreFields(site);

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

    console.log(`Seeded acquisition site: ${site.name}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
