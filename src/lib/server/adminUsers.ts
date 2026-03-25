export type AdminLoginProvider = "password" | "beam_google";

export interface AdminUserRecord {
  email: string;
  fullName: string;
  active: boolean;
  loginProvider: AdminLoginProvider;
  adminRole: string;
  tenantId: string;
}

const MOCK_ADMIN_USERS: AdminUserRecord[] = [
  {
    email: "nija@paynepros.com",
    fullName: "Nija",
    active: true,
    loginProvider: "beam_google",
    adminRole: "admin",
    tenantId: "paynepros",
  },
  {
    email: "ezra@paynepros.com",
    fullName: "Ezra",
    active: true,
    loginProvider: "beam_google",
    adminRole: "admin",
    tenantId: "paynepros",
  },
];

interface FirestoreStringValue {
  stringValue?: string;
}

interface FirestoreBooleanValue {
  booleanValue?: boolean;
}

interface FirestoreDocument {
  fields?: {
    email?: FirestoreStringValue;
    fullName?: FirestoreStringValue;
    active?: FirestoreBooleanValue;
    loginProvider?: FirestoreStringValue;
    adminRole?: FirestoreStringValue;
    tenantId?: FirestoreStringValue;
  };
}

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return projectId;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function shouldUseMockAdminUsers(): boolean {
  return process.env.ADMIN_AUTH_USE_MOCK === "1" || process.env.NODE_ENV !== "production";
}

function mapFirestoreDocument(document: FirestoreDocument): AdminUserRecord | null {
  const fields = document.fields;
  if (!fields?.email?.stringValue) return null;

  return {
    email: normalizeEmail(fields.email.stringValue),
    fullName: fields.fullName?.stringValue?.trim() || fields.email.stringValue,
    active: fields.active?.booleanValue ?? true,
    loginProvider: fields.loginProvider?.stringValue === "beam_google" ? "beam_google" : "password",
    adminRole: fields.adminRole?.stringValue?.trim() || "admin",
    tenantId: fields.tenantId?.stringValue?.trim() || "paynepros",
  };
}

export async function getAdminUserByEmail(email: string, idToken?: string): Promise<AdminUserRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  if (shouldUseMockAdminUsers() || !idToken) {
    return MOCK_ADMIN_USERS.find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;
  }

  const queryUrl = `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents:runQuery`;
  const response = await fetch(queryUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "admin_users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "email" },
            op: "EQUAL",
            value: { stringValue: normalizedEmail },
          },
        },
        limit: 1,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to query admin_users (${response.status}): ${text}`);
  }

  const rows = (await response.json()) as Array<{ document?: FirestoreDocument }>;
  const document = rows.find((row) => row.document)?.document;
  return document ? mapFirestoreDocument(document) : null;
}
