import { WEBSITE_DIRECTORY_COLLECTION, type WebsiteDirectoryInput } from "@/lib/websiteDirectory";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean };

function stringField(value: string): FirestoreValue {
  return { stringValue: value };
}

function integerField(value: number): FirestoreValue {
  return { integerValue: String(Math.trunc(value)) };
}

function booleanField(value: boolean): FirestoreValue {
  return { booleanValue: value };
}

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return projectId;
}

function getDocumentName(id: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/${WEBSITE_DIRECTORY_COLLECTION}/${id}`;
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
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

function toMutableFields(input: WebsiteDirectoryInput, updatedBy: string): Record<string, FirestoreValue> {
  return {
    label: stringField(input.label),
    title: stringField(input.title),
    subtitle: stringField(input.subtitle ?? ""),
    url: stringField(input.url),
    previewImageUrl: stringField(input.previewImageUrl ?? ""),
    sortOrder: integerField(input.sortOrder),
    isActive: booleanField(input.isActive),
    updatedBy: stringField(updatedBy),
  };
}

export async function createWebsiteDirectoryEntry(params: {
  idToken: string;
  id: string;
  input: WebsiteDirectoryInput;
  createdBy: string;
}): Promise<void> {
  const document = getDocumentName(params.id);
  const fields = {
    ...toMutableFields(params.input, params.createdBy),
    createdBy: stringField(params.createdBy),
  };

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
}

export async function updateWebsiteDirectoryEntry(params: {
  idToken: string;
  id: string;
  input: WebsiteDirectoryInput;
  updatedBy: string;
}): Promise<void> {
  const document = getDocumentName(params.id);
  const fields = toMutableFields(params.input, params.updatedBy);
  const updateMask = { fieldPaths: Object.keys(fields) };

  await commitWrites(params.idToken, [
    {
      update: {
        name: document,
        fields,
      },
      updateMask,
      currentDocument: { exists: true },
    },
    {
      transform: {
        document,
        fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      },
    },
  ]);
}

export async function deleteWebsiteDirectoryEntry(params: { idToken: string; id: string }): Promise<void> {
  await commitWrites(params.idToken, [
    {
      delete: getDocumentName(params.id),
      currentDocument: { exists: true },
    },
  ]);
}

export async function seedWebsiteDirectoryEntry(params: {
  idToken: string;
  id: string;
  input: WebsiteDirectoryInput;
  actor: string;
}): Promise<"created" | "updated"> {
  const readResponse = await fetch(`${getBaseUrl()}/${WEBSITE_DIRECTORY_COLLECTION}/${params.id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.idToken}` },
    cache: "no-store",
  });

  if (readResponse.status === 404) {
    await createWebsiteDirectoryEntry({
      idToken: params.idToken,
      id: params.id,
      input: params.input,
      createdBy: params.actor,
    });
    return "created";
  }

  if (!readResponse.ok) {
    const text = await readResponse.text();
    throw new Error(`Failed to check existing seed (${readResponse.status}): ${text}`);
  }

  await updateWebsiteDirectoryEntry({
    idToken: params.idToken,
    id: params.id,
    input: params.input,
    updatedBy: params.actor,
  });
  return "updated";
}
