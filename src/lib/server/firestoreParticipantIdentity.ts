import { PARTICIPANT_IDENTITY_COLLECTIONS } from "@/lib/participantIdentity";
import type {
  Cohort,
  CohortSeedInput,
  Organization,
  OrganizationSeedInput,
  ParticipantIdentitySummary,
} from "@/types/participantIdentity";

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

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return projectId;
}

function getDocumentName(collection: string, id: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/${collection}/${id}`;
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
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

async function readDocument(params: { idToken: string; collection: string; id: string }): Promise<FirestoreDocument | null> {
  const response = await fetch(`${getBaseUrl()}/${params.collection}/${params.id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.idToken}` },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read ${params.collection}/${params.id} (${response.status}): ${text}`);
  }

  return (await response.json()) as FirestoreDocument;
}

async function listCollectionDocuments<T extends { id: string }>(params: {
  idToken: string;
  collection: string;
}): Promise<T[]> {
  const rows: T[] = [];
  let nextPageToken = "";

  do {
    const endpoint = new URL(`${getBaseUrl()}/${params.collection}`);
    endpoint.searchParams.set("pageSize", "200");
    if (nextPageToken) endpoint.searchParams.set("pageToken", nextPageToken);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${params.idToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list ${params.collection} (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as FirestoreListResponse;
    rows.push(...(payload.documents ?? []).map((document) => fromFirestoreDocument<T>(document)));
    nextPageToken = payload.nextPageToken ?? "";
  } while (nextPageToken);

  return rows;
}

async function upsertTimestampedDocument(params: {
  idToken: string;
  collection: string;
  id: string;
  data: Record<string, unknown>;
}): Promise<"created" | "updated"> {
  const existing = await readDocument({
    idToken: params.idToken,
    collection: params.collection,
    id: params.id,
  });

  const document = getDocumentName(params.collection, params.id);
  const fields = toFirestoreFields(params.data);

  if (!existing) {
    await commitWrites(params.idToken, [
      {
        update: {
          name: document,
          fields,
        },
        currentDocument: { exists: false },
      },
      {
        transform: {
          document,
          fieldTransforms: [
            { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
            { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
          ],
        },
      },
    ]);
    return "created";
  }

  await commitWrites(params.idToken, [
    {
      update: {
        name: document,
        fields,
      },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: { exists: true },
    },
    {
      transform: {
        document,
        fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      },
    },
  ]);

  return "updated";
}

export async function upsertParticipantIdentitySeedData(params: {
  idToken: string;
  organizations: OrganizationSeedInput[];
  cohorts: CohortSeedInput[];
}): Promise<{
  organizations: Array<{ id: string; status: "created" | "updated" }>;
  cohorts: Array<{ id: string; status: "created" | "updated" }>;
}> {
  const organizationResults: Array<{ id: string; status: "created" | "updated" }> = [];
  for (const organization of params.organizations) {
    const { id, ...data } = organization;
    const status = await upsertTimestampedDocument({
      idToken: params.idToken,
      collection: PARTICIPANT_IDENTITY_COLLECTIONS.organizations,
      id,
      data,
    });
    organizationResults.push({ id, status });
  }

  const cohortResults: Array<{ id: string; status: "created" | "updated" }> = [];
  for (const cohort of params.cohorts) {
    const { id, ...data } = cohort;
    const status = await upsertTimestampedDocument({
      idToken: params.idToken,
      collection: PARTICIPANT_IDENTITY_COLLECTIONS.cohorts,
      id,
      data,
    });
    cohortResults.push({ id, status });
  }

  return {
    organizations: organizationResults,
    cohorts: cohortResults,
  };
}

export async function fetchParticipantIdentitySummary(params: {
  idToken: string;
}): Promise<ParticipantIdentitySummary> {
  const [organizations, cohorts, participantProfiles, organizationMemberships, cohortMemberships] = await Promise.all([
    listCollectionDocuments<Organization>({
      idToken: params.idToken,
      collection: PARTICIPANT_IDENTITY_COLLECTIONS.organizations,
    }),
    listCollectionDocuments<Cohort>({
      idToken: params.idToken,
      collection: PARTICIPANT_IDENTITY_COLLECTIONS.cohorts,
    }),
    listCollectionDocuments<{ id: string }>({
      idToken: params.idToken,
      collection: PARTICIPANT_IDENTITY_COLLECTIONS.participantProfiles,
    }),
    listCollectionDocuments<{ id: string }>({
      idToken: params.idToken,
      collection: PARTICIPANT_IDENTITY_COLLECTIONS.organizationMemberships,
    }),
    listCollectionDocuments<{ id: string }>({
      idToken: params.idToken,
      collection: PARTICIPANT_IDENTITY_COLLECTIONS.cohortMemberships,
    }),
  ]);

  return {
    organizations: [...organizations].sort((a, b) => a.name.localeCompare(b.name)),
    cohorts: [...cohorts].sort((a, b) => a.name.localeCompare(b.name)),
    counts: {
      participantProfiles: participantProfiles.length,
      organizationMemberships: organizationMemberships.length,
      cohortMemberships: cohortMemberships.length,
    },
  };
}
