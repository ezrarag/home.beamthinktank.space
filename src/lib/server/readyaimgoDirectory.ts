import { buildMicrolinkPreviewUrl, type WebsiteDirectoryEntry } from "@/lib/websiteDirectory";

interface ReadyaimgoClient {
  id?: string;
  docId?: string;
  _id?: string;
  storyId?: string;
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  websiteUrl?: string;
  siteUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  active?: boolean;
}

interface ReadyaimgoClientsResponse {
  clients?: ReadyaimgoClient[];
  data?: ReadyaimgoClient[] | { clients?: ReadyaimgoClient[] };
}

export interface ReadyaimgoDirectoryResult {
  entries: WebsiteDirectoryEntry[];
  totalClients: number;
  skippedInvalidUrl: number;
}

function isValidAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toLabel(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 28) return trimmed;
  return `${trimmed.slice(0, 25)}...`;
}

function mapClientToDirectoryEntry(client: ReadyaimgoClient, index: number): WebsiteDirectoryEntry | null {
  const url = String(client.websiteUrl ?? client.siteUrl ?? "").trim();
  if (!url || !isValidAbsoluteHttpUrl(url)) return null;

  const title = String(client.name ?? client.title ?? client.storyId ?? "External Site").trim();
  const id = String(client.id ?? client.docId ?? client._id ?? client.storyId ?? `external-${index}`).trim();
  const subtitle = String(client.subtitle ?? client.description ?? "").trim();

  const isActive = typeof client.isActive === "boolean" ? client.isActive : client.active !== false;
  const sortOrder = Number.isFinite(client.sortOrder) ? Number(client.sortOrder) : 1000 + index;

  return {
    id: `external:${id}`,
    label: toLabel(title || "External Site"),
    title: title || "External Site",
    subtitle,
    url,
    previewImageUrl: buildMicrolinkPreviewUrl(url),
    sortOrder,
    isActive,
    createdBy: "readyaimgo",
    updatedBy: "readyaimgo",
    source: "external",
  };
}

export async function fetchReadyaimgoDirectory(): Promise<ReadyaimgoDirectoryResult> {
  const baseUrl = process.env.READYAIMGO_API_BASE_URL ?? "https://www.readyaimgo.biz";
  const endpointPath = process.env.READYAIMGO_CLIENTS_ENDPOINT ?? "/api/clients?limit=1000";
  const endpoint = `${baseUrl.replace(/\/+$/, "")}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
  const headers: HeadersInit = {};
  if (process.env.READYAIMGO_API_KEY) {
    headers.Authorization = `Bearer ${process.env.READYAIMGO_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch readyaimgo clients (${response.status}): ${text}`);
  }

  const json = (await response.json()) as ReadyaimgoClientsResponse;
  const clients = Array.isArray(json.clients)
    ? json.clients
    : Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.data?.clients)
        ? json.data.clients
        : [];
  const mapped = clients.map(mapClientToDirectoryEntry);
  const entries = mapped.filter((entry): entry is WebsiteDirectoryEntry => Boolean(entry));
  return {
    entries,
    totalClients: clients.length,
    skippedInvalidUrl: mapped.length - entries.length,
  };
}

export async function fetchReadyaimgoDirectoryEntries(): Promise<WebsiteDirectoryEntry[]> {
  const result = await fetchReadyaimgoDirectory();
  return result.entries;
}
