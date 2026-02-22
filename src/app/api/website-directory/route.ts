import { NextResponse } from "next/server";
import { fetchReadyaimgoDirectoryEntries } from "@/lib/server/readyaimgoDirectory";
import { buildMicrolinkPreviewUrl, WEBSITE_DIRECTORY_COLLECTION, type WebsiteDirectoryEntry } from "@/lib/websiteDirectory";

interface FirestoreDocument {
  name: string;
  fields?: Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean }>;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
}

function readString(doc: FirestoreDocument, key: string): string {
  return doc.fields?.[key]?.stringValue ?? "";
}

function readNumber(doc: FirestoreDocument, key: string): number {
  const raw = doc.fields?.[key]?.integerValue;
  return raw ? Number(raw) : 0;
}

function readBoolean(doc: FirestoreDocument, key: string): boolean {
  return doc.fields?.[key]?.booleanValue ?? false;
}

function mapFirestoreDocToEntry(doc: FirestoreDocument): WebsiteDirectoryEntry {
  const id = doc.name.split("/").pop() ?? "";
  const url = readString(doc, "url");
  const previewImageUrl = readString(doc, "previewImageUrl");
  return {
    id,
    label: readString(doc, "label"),
    title: readString(doc, "title"),
    subtitle: readString(doc, "subtitle"),
    url,
    previewImageUrl: previewImageUrl || buildMicrolinkPreviewUrl(url),
    sortOrder: readNumber(doc, "sortOrder"),
    isActive: readBoolean(doc, "isActive"),
    createdBy: readString(doc, "createdBy"),
    updatedBy: readString(doc, "updatedBy"),
    source: "internal",
  };
}

async function fetchInternalPublicEntries(): Promise<WebsiteDirectoryEntry[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${WEBSITE_DIRECTORY_COLLECTION}`;
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read internal directory (${response.status}): ${text}`);
  }
  const json = (await response.json()) as FirestoreListResponse;
  const docs = Array.isArray(json.documents) ? json.documents : [];
  return docs.map(mapFirestoreDocToEntry);
}

export async function GET() {
  let internalEntries: WebsiteDirectoryEntry[] = [];
  let externalEntries: WebsiteDirectoryEntry[] = [];
  let externalError: string | null = null;

  try {
    internalEntries = await fetchInternalPublicEntries();
  } catch (error) {
    return NextResponse.json(
      { entries: [], error: error instanceof Error ? error.message : "Failed to load website directory" },
      { status: 500 }
    );
  }

  try {
    externalEntries = await fetchReadyaimgoDirectoryEntries();
  } catch (error) {
    externalError = error instanceof Error ? error.message : "Failed to fetch external entries";
  }

  const entries = [...internalEntries, ...externalEntries]
    .filter((entry) => entry.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  return NextResponse.json({ entries, externalError });
}
