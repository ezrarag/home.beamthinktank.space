export const RAG_ALLOWLIST_COLLECTION = "ragAllowlist";

export type RagAllowlistEntry = {
  id: string;
  email: string;
  clientName: string;
  clientSlug: string;
  addedBy: string;
  addedAt: string;
  active: boolean;
  notes: string;
};

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue | undefined>;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

const MOCK_RAG_ALLOWLIST: RagAllowlistEntry[] = [
  {
    id: "client@paynepros_com",
    email: "client@paynepros.com",
    clientName: "PaynePros",
    clientSlug: "paynepros",
    addedBy: "seed",
    addedAt: "2026-03-23T00:00:00.000Z",
    active: true,
    notes: "Local seed for ReadyAimGo client portal testing.",
  },
];

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

function shouldUseMockAllowlist(): boolean {
  return process.env.RAG_ALLOWLIST_USE_MOCK === "1" || process.env.NODE_ENV !== "production";
}

function stringValue(value: string): FirestoreValue {
  return { stringValue: value };
}

function booleanValue(value: boolean): FirestoreValue {
  return { booleanValue: value };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailToDocId = (email: string) => normalizeEmail(email).replace(/\./g, "_");

function getStringField(value: FirestoreValue | undefined): string | undefined {
  return value && "stringValue" in value ? value.stringValue : undefined;
}

function getTimestampField(value: FirestoreValue | undefined): string | undefined {
  return value && "timestampValue" in value ? value.timestampValue : undefined;
}

function getBooleanField(value: FirestoreValue | undefined): boolean | undefined {
  return value && "booleanValue" in value ? value.booleanValue : undefined;
}

function mapDocument(document: FirestoreDocument): RagAllowlistEntry | null {
  const id = document.name.split("/").pop() ?? "";
  const fields = document.fields ?? {};
  const email = getStringField(fields.email)?.trim().toLowerCase() ?? "";

  if (!id || !email) return null;

  return {
    id,
    email,
    clientName: getStringField(fields.clientName)?.trim() || "ReadyAimGo Client",
    clientSlug: getStringField(fields.clientSlug)?.trim() || "client",
    addedBy: getStringField(fields.addedBy)?.trim() || "unknown",
    addedAt: getStringField(fields.addedAt)?.trim() || getTimestampField(fields.addedAt) || new Date(0).toISOString(),
    active: getBooleanField(fields.active) ?? false,
    notes: getStringField(fields.notes)?.trim() || "",
  };
}

function getMockEntryByEmail(email: string): RagAllowlistEntry | null {
  const normalizedEmail = normalizeEmail(email);
  return MOCK_RAG_ALLOWLIST.find((entry) => entry.email === normalizedEmail) ?? null;
}

function getMockEntryById(id: string): RagAllowlistEntry | null {
  return MOCK_RAG_ALLOWLIST.find((entry) => entry.id === id) ?? null;
}

async function fetchDocument(docId: string, idToken: string): Promise<RagAllowlistEntry | null> {
  const response = await fetch(`${getBaseUrl()}/${RAG_ALLOWLIST_COLLECTION}/${encodeURIComponent(docId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read ragAllowlist entry (${response.status}): ${text}`);
  }

  return mapDocument((await response.json()) as FirestoreDocument);
}

export async function getAllowlistEntryByEmail(email: string, idToken?: string): Promise<RagAllowlistEntry | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  if (shouldUseMockAllowlist() || !idToken) {
    return getMockEntryByEmail(normalizedEmail);
  }

  return fetchDocument(emailToDocId(normalizedEmail), idToken);
}

export async function isEmailAllowlisted(
  email: string,
  idToken: string
): Promise<{ allowed: boolean; clientSlug?: string; clientName?: string }> {
  const entry = await getAllowlistEntryByEmail(email, idToken);
  if (!entry?.active) {
    return { allowed: false };
  }

  return {
    allowed: true,
    clientSlug: entry.clientSlug,
    clientName: entry.clientName,
  };
}

export async function listAllowlistEntries(idToken?: string): Promise<RagAllowlistEntry[]> {
  if (shouldUseMockAllowlist() || !idToken) {
    return [...MOCK_RAG_ALLOWLIST].sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  }

  const entries: RagAllowlistEntry[] = [];
  let nextPageToken = "";

  do {
    const endpoint = new URL(`${getBaseUrl()}/${RAG_ALLOWLIST_COLLECTION}`);
    endpoint.searchParams.set("pageSize", "200");
    if (nextPageToken) endpoint.searchParams.set("pageToken", nextPageToken);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list ragAllowlist entries (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as FirestoreListResponse;
    entries.push(
      ...(payload.documents ?? [])
        .map((document) => mapDocument(document))
        .filter((document): document is RagAllowlistEntry => Boolean(document))
    );
    nextPageToken = payload.nextPageToken ?? "";
  } while (nextPageToken);

  return entries.sort((left, right) => right.addedAt.localeCompare(left.addedAt));
}

export async function addToAllowlist(
  entry: {
    email: string;
    clientName: string;
    clientSlug: string;
    addedBy: string;
    notes?: string;
  },
  idToken: string
): Promise<RagAllowlistEntry> {
  const normalizedEmail = normalizeEmail(entry.email);
  const docId = emailToDocId(normalizedEmail);
  const response = await fetch(`${getBaseUrl()}/${RAG_ALLOWLIST_COLLECTION}/${encodeURIComponent(docId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        email: stringValue(normalizedEmail),
        clientName: stringValue(entry.clientName.trim()),
        clientSlug: stringValue(entry.clientSlug.trim()),
        addedBy: stringValue(entry.addedBy.trim()),
        addedAt: stringValue(new Date().toISOString()),
        active: booleanValue(true),
        notes: stringValue(entry.notes?.trim() ?? ""),
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to write ragAllowlist entry (${response.status}): ${text}`);
  }

  const created = await fetchDocument(docId, idToken);
  if (!created) {
    throw new Error("Allowlist entry was written but could not be reloaded");
  }

  return created;
}

export async function updateAllowlistEntryStatus(docId: string, active: boolean, idToken: string): Promise<void> {
  if (shouldUseMockAllowlist()) {
    const entry = getMockEntryById(docId);
    if (!entry) {
      throw new Error("Allowlist entry not found");
    }
    entry.active = active;
    return;
  }

  const response = await fetch(
    `${getBaseUrl()}/${RAG_ALLOWLIST_COLLECTION}/${encodeURIComponent(docId)}?updateMask.fieldPaths=active`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          active: booleanValue(active),
        },
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update ragAllowlist status (${response.status}): ${text}`);
  }
}
