export {};

import { execSync } from "node:child_process";
import type { ProfessionalProfile } from "../src/types/participantIdentity";

// TODO: Replace with the actual participant UID when running the seed script for a real user profile.
const DEFAULT_PARTICIPANT_UID = "TODO_REPLACE_WITH_REAL_PARTICIPANT_UID";

const sampleProfiles: ProfessionalProfile[] = [
  {
    id: DEFAULT_PARTICIPANT_UID,
    participantUid: DEFAULT_PARTICIPANT_UID,
    businessFunctions: ["marketing"],
    bio: "Cross-domain marketing specialist leading narrative strategies across Orchestra concert promotion and Grounds property launches.",
    rateType: "hourly",
    rate: 75,
    portfolioLinks: ["https://beamthinktank.space"],
    matchedDomains: ["orchestra", "grounds"],
    matchedProjectIds: [],
    availability: "part-time",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

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
  return `projects/${getProjectId()}/databases/(default)/documents/professionalProfiles/${id}`;
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

  for (const profile of sampleProfiles) {
    const id = profile.id;
    const fields = toFirestoreFields({
      ...profile,
      createdAt: new Date().toISOString(),
    });

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

    console.log(`Seeded professionalProfile: ${id}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
