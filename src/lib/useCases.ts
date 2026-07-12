import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";
import {
  isUseCaseStage,
  normalizeToolList,
  USE_CASE_COLLECTION,
  USE_CASE_STAGE_ORDER,
  type UseCase,
  type UseCaseStage,
  type UseCaseStatus,
} from "@/lib/useCaseStages";
import { SEEDED_USE_CASES } from "@/data/useCaseSeed";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

type FirestoreRunQueryRow = {
  document?: FirestoreDocument;
};

const USE_CASE_SLUG_ALIASES: Record<string, string> = {
  "central-umc": "central-umc-roof",
  "central-united-methodist": "central-umc-roof",
  "central-united-methodist-church": "central-umc-roof",
};

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

function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((item) => fromFirestoreValue(item));
  }
  if ("mapValue" in value) {
    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value.mapValue.fields ?? {})) {
      output[key] = fromFirestoreValue(nestedValue);
    }
    return output;
  }
  return null;
}

function compareUseCases(left: UseCase, right: UseCase): number {
  const bySort = left.sortOrder - right.sortOrder;
  if (bySort !== 0) return bySort;

  const stageRank = USE_CASE_STAGE_ORDER.indexOf(left.stage) - USE_CASE_STAGE_ORDER.indexOf(right.stage);
  if (stageRank !== 0) return stageRank;

  return left.name.localeCompare(right.name);
}

function asStatus(value: unknown): UseCaseStatus {
  return value === "active" || value === "paused" || value === "complete" ? value : "concept";
}

function asStage(value: unknown): UseCaseStage {
  return typeof value === "string" && isUseCaseStage(value) ? value : "agency";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringOrNull(value: unknown): string | null {
  const stringValue = asString(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

function asTools(value: unknown): string[] {
  return Array.isArray(value) ? normalizeToolList(value.map((item) => String(item))) : [];
}

function normalizeUseCase(input: Record<string, unknown>): UseCase {
  return {
    slug: asString(input.slug),
    name: asString(input.name),
    context: asString(input.context),
    stage: asStage(input.stage),
    economicModel: asString(input.economicModel),
    firstAction: asString(input.firstAction),
    capture: {
      body: asString((input.capture as Record<string, unknown> | undefined)?.body),
      tools: asTools((input.capture as Record<string, unknown> | undefined)?.tools),
    },
    orchestrate: {
      body: asString((input.orchestrate as Record<string, unknown> | undefined)?.body),
      tools: asTools((input.orchestrate as Record<string, unknown> | undefined)?.tools),
    },
    produce: {
      body: asString((input.produce as Record<string, unknown> | undefined)?.body),
      tools: asTools((input.produce as Record<string, unknown> | undefined)?.tools),
    },
    money: {
      body: asString((input.money as Record<string, unknown> | undefined)?.body),
    },
    relatedClientSlug: asStringOrNull(input.relatedClientSlug),
    relatedDivision: asStringOrNull(input.relatedDivision),
    status: asStatus(input.status),
    isPublished: Boolean(input.isPublished),
    sortOrder: Number(input.sortOrder ?? 0),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
  };
}

function fromFirestoreDocument(document: FirestoreDocument): UseCase {
  const id = document.name.split("/").pop() ?? "";
  const output: Record<string, unknown> = { slug: id };
  for (const [key, value] of Object.entries(document.fields ?? {})) {
    output[key] = fromFirestoreValue(value);
  }
  return normalizeUseCase(output);
}

async function runServerQuery(onlyPublished: boolean): Promise<UseCase[]> {
  const response = await fetch(`${getBaseUrl()}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: USE_CASE_COLLECTION }],
        where: onlyPublished
          ? {
              fieldFilter: {
                field: { fieldPath: "isPublished" },
                op: "EQUAL",
                value: { booleanValue: true },
              },
            }
          : undefined,
        orderBy: [
          { field: { fieldPath: "sortOrder" }, direction: "ASCENDING" },
          { field: { fieldPath: "name" }, direction: "ASCENDING" },
        ],
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load use cases (${response.status}): ${text}`);
  }

  const rows = (await response.json()) as FirestoreRunQueryRow[];
  return rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map(fromFirestoreDocument)
    .sort(compareUseCases);
}

async function runClientQuery(onlyPublished: boolean): Promise<UseCase[]> {
  const constraints = onlyPublished
    ? [where("isPublished", "==", true), orderBy("sortOrder", "asc"), orderBy("name", "asc")]
    : [orderBy("sortOrder", "asc"), orderBy("name", "asc")];

  const snapshot = await getDocs(query(collection(getFirebaseDb(), USE_CASE_COLLECTION), ...constraints));
  return snapshot.docs
    .map((snapshotDoc) =>
      normalizeUseCase({
        slug: snapshotDoc.id,
        ...snapshotDoc.data(),
      })
    )
    .sort(compareUseCases);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function resolveUseCaseSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return USE_CASE_SLUG_ALIASES[normalized] ?? normalized;
}

export async function getPublishedUseCases(): Promise<UseCase[]> {
  try {
    const useCases = isBrowser() ? await runClientQuery(true) : await runServerQuery(true);
    return useCases.length > 0 ? useCases : SEEDED_USE_CASES.filter((useCase) => useCase.isPublished);
  } catch {
    return SEEDED_USE_CASES.filter((useCase) => useCase.isPublished);
  }
}

export async function getAllUseCases(): Promise<UseCase[]> {
  return isBrowser() ? runClientQuery(false) : runServerQuery(false);
}

export async function getPublishedUseCaseBySlug(slug: string): Promise<UseCase | null> {
  const resolvedSlug = resolveUseCaseSlug(slug);

  if (isBrowser()) {
    const snapshot = await getDoc(doc(getFirebaseDb(), USE_CASE_COLLECTION, resolvedSlug));
    if (!snapshot.exists()) return null;

    const useCase = normalizeUseCase({
      slug: snapshot.id,
      ...snapshot.data(),
    });

    return useCase.isPublished ? useCase : null;
  }

  try {
    const useCases = await runServerQuery(true);
    const matchedUseCase = useCases.find((useCase) => useCase.slug === resolvedSlug) ?? null;
    if (matchedUseCase) return matchedUseCase;
  } catch {
    // Fall through to local seed data when Firestore is unavailable or empty.
  }

  return SEEDED_USE_CASES.find((useCase) => useCase.slug === resolvedSlug && useCase.isPublished) ?? null;
}

export async function upsertUseCase(data: UseCase): Promise<void> {
  const payload: UseCase = {
    ...data,
    slug: data.slug.trim(),
    name: data.name.trim(),
    context: data.context.trim(),
    economicModel: data.economicModel.trim(),
    firstAction: data.firstAction.trim(),
    capture: {
      body: data.capture.body.trim(),
      tools: normalizeToolList(data.capture.tools),
    },
    orchestrate: {
      body: data.orchestrate.body.trim(),
      tools: normalizeToolList(data.orchestrate.tools),
    },
    produce: {
      body: data.produce.body.trim(),
      tools: normalizeToolList(data.produce.tools),
    },
    money: {
      body: data.money.body.trim(),
    },
    relatedClientSlug: data.relatedClientSlug?.trim() || null,
    relatedDivision: data.relatedDivision?.trim() || null,
    status: data.status,
    isPublished: Boolean(data.isPublished),
    sortOrder: Number(data.sortOrder ?? 0),
  };

  await setDoc(
    doc(getFirebaseDb(), USE_CASE_COLLECTION, payload.slug),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteUseCase(slug: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), USE_CASE_COLLECTION, slug));
}
