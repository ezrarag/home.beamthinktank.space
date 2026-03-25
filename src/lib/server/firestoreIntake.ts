import { randomUUID } from "crypto";

export type IntakeSubmission = {
  id: string;
  orgName: string;
  orgUrl: string;
  nodeId: string;
  sectors: string[];
  contactName: string;
  contactEmail: string;
  needs: string[];
  offers: string[];
  description: string;
  submittedAt: string;
  status: "pending" | "reviewed" | "accepted" | "declined";
};

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
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return projectId;
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function getDocumentName(id: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/intake/${id}`;
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

export async function createIntakeSubmission(
  input: Omit<IntakeSubmission, "id" | "submittedAt" | "status">
): Promise<string> {
  const id = randomUUID();
  const payload: IntakeSubmission = {
    id,
    ...input,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  const fields = {
    orgName: payload.orgName,
    orgUrl: payload.orgUrl,
    nodeId: payload.nodeId,
    sectors: payload.sectors,
    contactName: payload.contactName,
    contactEmail: payload.contactEmail,
    needs: payload.needs,
    offers: payload.offers,
    description: payload.description,
    submittedAt: payload.submittedAt,
    status: payload.status,
  };

  const response = await fetch(`${getBaseUrl()}:commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: getDocumentName(id),
            fields: toFirestoreFields(fields),
          },
          currentDocument: { exists: false },
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore intake write failed (${response.status}): ${text}`);
  }

  return id;
}
