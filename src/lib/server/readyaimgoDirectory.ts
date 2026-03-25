import {
  buildMicrolinkPreviewUrl,
  dedupeWebsiteDirectoryEntries,
  normalizeWebsiteDirectoryHost,
  type WebsiteDirectoryEntry,
} from "@/lib/websiteDirectory";

export interface ReadyaimgoClientWorkContext {
  id?: string;
  label?: string;
  summary?: string;
  sources?: string[];
  status?: "suggested" | "confirmed" | string;
}

export interface ReadyaimgoClientRoleSuggestionSnapshot {
  generatedAt?: string;
  businessType?: string;
  summary?: string;
  workContexts?: ReadyaimgoClientWorkContext[];
}

export interface ReadyaimgoClient {
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
  brands?: string[];
  deployUrl?: string;
  deployHosts?: string[];
  vercelProjectDomains?: string[];
  sortOrder?: number;
  isActive?: boolean;
  active?: boolean;
  roleSuggestionSnapshot?: ReadyaimgoClientRoleSuggestionSnapshot | null;
}

interface ReadyaimgoClientsResponse {
  clients?: ReadyaimgoClient[];
  data?: ReadyaimgoClient[] | { clients?: ReadyaimgoClient[] };
}

interface ReadyaimgoBeamOrganization {
  source?: {
    documentId?: string;
    storyId?: string;
    externalKey?: string;
  };
  organization?: {
    displayName?: string;
    websiteUrl?: string;
    primaryDomain?: string;
    status?: string;
  };
  siteMetadata?: {
    websiteUrl?: string;
    storyPath?: string;
    showOnFrontend?: boolean;
    deployUrl?: string;
    deployHosts?: string[];
    vercelProjectName?: string;
    vercelProjectDomains?: string[];
  };
}

interface ReadyaimgoBeamOrganizationsResponse {
  organizations?: ReadyaimgoBeamOrganization[];
  data?: ReadyaimgoBeamOrganization[] | { organizations?: ReadyaimgoBeamOrganization[] };
}

export interface ReadyaimgoDirectoryResult {
  entries: WebsiteDirectoryEntry[];
  totalClients: number;
  skippedInvalidUrl: number;
}

const BEAM_ROOT_HOST = "beamthinktank.space";

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

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toDisplayNameFromHost(host: string): string {
  if (host === BEAM_ROOT_HOST) return "BEAM Home Site";

  const subdomain = host.endsWith(`.${BEAM_ROOT_HOST}`)
    ? host.slice(0, -(BEAM_ROOT_HOST.length + 1))
    : host;
  const words = subdomain
    .split(".")
    .flatMap((segment) => segment.split("-"))
    .filter(Boolean)
    .map((word) => capitalizeWord(word.toLowerCase()));

  if (words.length === 0) return "BEAM Site";
  return `${words.join(" ")} Site`;
}

function isBeamHost(host: string): boolean {
  return host === BEAM_ROOT_HOST || host.endsWith(`.${BEAM_ROOT_HOST}`);
}

function normalizeBeamSiteUrl(value: string): string | null {
  const host = normalizeWebsiteDirectoryHost(value);
  if (!host || !isBeamHost(host)) return null;
  return `https://${host}`;
}

function collectBeamSiteUrls(entry: ReadyaimgoBeamOrganization): string[] {
  const candidates = [
    entry.organization?.websiteUrl,
    entry.organization?.primaryDomain,
    entry.siteMetadata?.websiteUrl,
    entry.siteMetadata?.deployUrl,
    ...(Array.isArray(entry.siteMetadata?.deployHosts) ? entry.siteMetadata.deployHosts : []),
    ...(Array.isArray(entry.siteMetadata?.vercelProjectDomains) ? entry.siteMetadata.vercelProjectDomains : []),
  ];
  const urls = new Map<string, string>();

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalizedUrl = normalizeBeamSiteUrl(candidate);
    if (!normalizedUrl) continue;

    const host = normalizeWebsiteDirectoryHost(normalizedUrl);
    if (!host) continue;
    urls.set(host, normalizedUrl);
  }

  return [...urls.values()];
}

function resolveBeamSiteMetadata(entry: ReadyaimgoBeamOrganization): {
  canonicalUrl: string;
  canonicalHost: string;
  alternateHosts: string[];
} | null {
  const beamUrls = collectBeamSiteUrls(entry);
  if (beamUrls.length === 0) return null;

  const canonicalUrl = beamUrls[0];
  const canonicalHost = normalizeWebsiteDirectoryHost(canonicalUrl);
  if (!canonicalHost) return null;

  const alternateHosts = beamUrls
    .slice(1)
    .map((url) => normalizeWebsiteDirectoryHost(url))
    .filter((host): host is string => Boolean(host && host !== canonicalHost));

  return {
    canonicalUrl,
    canonicalHost,
    alternateHosts,
  };
}

function resolveBeamEntryActive(entry: ReadyaimgoBeamOrganization): boolean {
  const status = String(entry.organization?.status ?? "").trim().toLowerCase();
  if (status === "inactive" || status === "archived" || status === "disabled") return false;
  return entry.siteMetadata?.showOnFrontend !== false;
}

function buildBeamEntryTitle(entry: ReadyaimgoBeamOrganization, host: string): string {
  const displayName = String(
    entry.organization?.displayName ??
      entry.siteMetadata?.vercelProjectName ??
      entry.source?.storyId ??
      ""
  ).trim();

  if (!displayName) return toDisplayNameFromHost(host);
  return displayName;
}

function buildBeamEntrySubtitle(entry: ReadyaimgoBeamOrganization, host: string, alternateHostCount: number): string {
  const storyPath = String(entry.siteMetadata?.storyPath ?? "").trim();
  const parts = [storyPath || host];

  if (alternateHostCount > 0) {
    parts.push(`+${alternateHostCount} synced host${alternateHostCount === 1 ? "" : "s"}`);
  }

  return parts.filter(Boolean).join(" · ");
}

function mapBeamOrganizationToDirectoryEntry(
  entry: ReadyaimgoBeamOrganization,
  index: number
): WebsiteDirectoryEntry | null {
  const siteMetadata = resolveBeamSiteMetadata(entry);
  if (!siteMetadata) return null;

  const baseId = String(entry.source?.documentId ?? entry.source?.storyId ?? entry.source?.externalKey ?? `beam-org-${index}`).trim();
  const title = buildBeamEntryTitle(entry, siteMetadata.canonicalHost);
  const subtitle = buildBeamEntrySubtitle(entry, siteMetadata.canonicalHost, siteMetadata.alternateHosts.length);

  return {
    id: `external:${baseId}:${siteMetadata.canonicalHost}`,
    label: toLabel(title || toDisplayNameFromHost(siteMetadata.canonicalHost)),
    title: title || toDisplayNameFromHost(siteMetadata.canonicalHost),
    subtitle,
    url: siteMetadata.canonicalUrl,
    previewImageUrl: buildMicrolinkPreviewUrl(siteMetadata.canonicalUrl),
    sortOrder: 1000 + index,
    isActive: resolveBeamEntryActive(entry),
    createdBy: "readyaimgo",
    updatedBy: "readyaimgo",
    source: "external",
    externalMetadata: {
      canonicalHost: siteMetadata.canonicalHost,
      alternateHosts: siteMetadata.alternateHosts,
      storyPath: String(entry.siteMetadata?.storyPath ?? "").trim() || undefined,
    },
  };
}

function parseBeamOrganizationsPayload(payload: ReadyaimgoBeamOrganizationsResponse): ReadyaimgoBeamOrganization[] {
  if (Array.isArray(payload.organizations)) return payload.organizations;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.organizations)) return payload.data.organizations;
  return [];
}

function parseReadyaimgoClientsPayload(payload: ReadyaimgoClientsResponse): ReadyaimgoClient[] {
  if (Array.isArray(payload.clients)) return payload.clients;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.clients)) return payload.data.clients;
  return [];
}

function getReadyaimgoBaseUrl(): string {
  return process.env.READYAIMGO_API_BASE_URL ?? "https://www.readyaimgo.biz";
}

function getReadyaimgoBeamOrganizationsEndpoint(): string {
  const absoluteUrl = process.env.READYAIMGO_BEAM_ORGANIZATIONS_URL?.trim();
  if (absoluteUrl) return absoluteUrl;

  const baseUrl = getReadyaimgoBaseUrl().replace(/\/+$/, "");
  const endpointPath = process.env.READYAIMGO_BEAM_ORGANIZATIONS_ENDPOINT ?? "/api/beam/organizations";
  return `${baseUrl}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
}

async function fetchReadyaimgoBeamDirectory(): Promise<ReadyaimgoDirectoryResult> {
  const apiKey = process.env.READYAIMGO_BEAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("READYAIMGO_BEAM_API_KEY is not configured");
  }

  const response = await fetch(getReadyaimgoBeamOrganizationsEndpoint(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch readyaimgo BEAM organizations (${response.status}): ${text}`);
  }

  const json = (await response.json()) as ReadyaimgoBeamOrganizationsResponse;
  const organizations = parseBeamOrganizationsPayload(json);
  const mapped = organizations
    .map(mapBeamOrganizationToDirectoryEntry)
    .filter((entry): entry is WebsiteDirectoryEntry => Boolean(entry));
  const entries = dedupeWebsiteDirectoryEntries(mapped);

  return {
    entries,
    totalClients: organizations.length,
    skippedInvalidUrl: organizations.filter((organization) => collectBeamSiteUrls(organization).length === 0).length,
  };
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

async function fetchLegacyReadyaimgoDirectory(): Promise<ReadyaimgoDirectoryResult> {
  const clients = await fetchReadyaimgoClients();
  const mapped = clients.map(mapClientToDirectoryEntry);
  const entries = mapped.filter((entry): entry is WebsiteDirectoryEntry => Boolean(entry));
  return {
    entries,
    totalClients: clients.length,
    skippedInvalidUrl: mapped.length - entries.length,
  };
}

export async function fetchReadyaimgoClients(): Promise<ReadyaimgoClient[]> {
  const baseUrl = getReadyaimgoBaseUrl();
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
  return parseReadyaimgoClientsPayload(json);
}

export async function fetchReadyaimgoDirectory(): Promise<ReadyaimgoDirectoryResult> {
  const errors: string[] = [];

  try {
    return await fetchReadyaimgoBeamDirectory();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Failed to fetch BEAM organizations");
  }

  try {
    return await fetchLegacyReadyaimgoDirectory();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Failed to fetch legacy readyaimgo clients");
  }

  throw new Error(errors.join(" | "));
}

export async function fetchReadyaimgoDirectoryEntries(): Promise<WebsiteDirectoryEntry[]> {
  const result = await fetchReadyaimgoDirectory();
  return result.entries;
}
