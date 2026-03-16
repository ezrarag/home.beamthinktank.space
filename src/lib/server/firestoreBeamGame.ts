import { BEAM_COLLECTIONS } from "@/lib/beamGame";
import type { BeamAction, BeamProject, BeamRegion, BeamTask, BeamAsset } from "@/types/beamGame";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

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
    if (isIsoDateString(value)) return { timestampValue: value };
    return { stringValue: value };
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
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(value: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(value)) {
    fields[k] = toFirestoreValue(v);
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
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore write failed (${response.status}): ${text}`);
  }
}

export async function createBeamActionAndTasks(params: {
  idToken: string;
  action: BeamAction;
  tasks: BeamTask[];
}): Promise<void> {
  const actionDoc = getDocumentName(BEAM_COLLECTIONS.actions, params.action.id);

  const writes: unknown[] = [
    {
      update: {
        name: actionDoc,
        fields: toFirestoreFields(params.action as unknown as Record<string, unknown>),
      },
      currentDocument: { exists: false },
    },
    {
      transform: {
        document: actionDoc,
        fieldTransforms: [
          { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
          { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
        ],
      },
    },
  ];

  for (const task of params.tasks) {
    const taskDoc = getDocumentName(BEAM_COLLECTIONS.tasks, task.id);
    writes.push({
      update: {
        name: taskDoc,
        fields: toFirestoreFields(task as unknown as Record<string, unknown>),
      },
      currentDocument: { exists: false },
    });
    writes.push({
      transform: {
        document: taskDoc,
        fieldTransforms: [
          { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
          { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
        ],
      },
    });
  }

  await commitWrites(params.idToken, writes);
}

export async function upsertBeamSeedData(params: {
  idToken: string;
  regions: BeamRegion[];
  projects: BeamProject[];
  actions: BeamAction[];
  tasks: BeamTask[];
  assets: BeamAsset[];
}): Promise<void> {
  const writes: unknown[] = [];

  const seedCollection = (collection: string, rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (!id) continue;
      const doc = getDocumentName(collection, id);
      writes.push({
        update: {
          name: doc,
          fields: toFirestoreFields(row),
        },
      });
      writes.push({
        transform: {
          document: doc,
          fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
        },
      });
    }
  };

  seedCollection(BEAM_COLLECTIONS.regions, params.regions as unknown as Record<string, unknown>[]);
  seedCollection(BEAM_COLLECTIONS.projects, params.projects as unknown as Record<string, unknown>[]);
  seedCollection(BEAM_COLLECTIONS.assets, params.assets as unknown as Record<string, unknown>[]);
  seedCollection(BEAM_COLLECTIONS.actions, params.actions as unknown as Record<string, unknown>[]);
  seedCollection(BEAM_COLLECTIONS.tasks, params.tasks as unknown as Record<string, unknown>[]);

  if (writes.length === 0) return;
  await commitWrites(params.idToken, writes);
}
