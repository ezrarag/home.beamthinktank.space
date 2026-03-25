export const WEBSITE_DIRECTORY_COLLECTION = "beamWebsiteDirectory";
export type WebsiteDirectorySource = "internal" | "external";

export interface WebsiteDirectoryExternalMetadata {
  canonicalHost?: string;
  alternateHosts?: string[];
  storyPath?: string;
}

export interface WebsiteDirectoryEntry {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  url: string;
  previewImageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  source?: WebsiteDirectorySource;
  externalMetadata?: WebsiteDirectoryExternalMetadata;
}

export interface WebsiteDirectoryInput {
  label: string;
  title: string;
  subtitle?: string;
  url: string;
  previewImageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export const DEFAULT_WEBSITE_DIRECTORY_SEED: WebsiteDirectoryInput = {
  label: "BEAM Home Site",
  title: "BEAM Home Site",
  subtitle: "Explore the primary BEAM platform and ecosystem updates.",
  url: "https://beamthinktank.space",
  previewImageUrl: "",
  sortOrder: 0,
  isActive: true,
};

function isValidAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateWebsiteDirectoryInput(input: WebsiteDirectoryInput): string[] {
  const errors: string[] = [];

  if (!input.label?.trim()) errors.push("label is required");
  if (!input.title?.trim()) errors.push("title is required");
  if (!input.url?.trim()) errors.push("url is required");
  if (!Number.isFinite(input.sortOrder)) errors.push("sortOrder must be a number");
  if (typeof input.isActive !== "boolean") errors.push("isActive must be a boolean");

  if (input.url?.trim() && !isValidAbsoluteHttpUrl(input.url.trim())) {
    errors.push("url must be a valid absolute URL");
  }
  if (input.previewImageUrl?.trim() && !isValidAbsoluteHttpUrl(input.previewImageUrl.trim())) {
    errors.push("previewImageUrl must be a valid absolute URL");
  }

  return errors;
}

export function buildMicrolinkPreviewUrl(websiteUrl: string): string {
  const endpoint = new URL("https://api.microlink.io/");
  endpoint.searchParams.set("url", websiteUrl);
  endpoint.searchParams.set("screenshot", "true");
  endpoint.searchParams.set("meta", "false");
  endpoint.searchParams.set("embed", "screenshot.url");
  endpoint.searchParams.set("viewport.width", "1920");
  endpoint.searchParams.set("viewport.height", "1080");
  return endpoint.toString();
}

export function normalizeWebsiteDirectoryHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidates = trimmed.includes("://") ? [trimmed] : [`https://${trimmed}`];

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.trim().toLowerCase().replace(/\.+$/, "");
      if (host) return host;
    } catch {
      continue;
    }
  }

  return null;
}

function compareWebsiteDirectoryEntries(a: WebsiteDirectoryEntry, b: WebsiteDirectoryEntry): number {
  const sourceRank = (entry: WebsiteDirectoryEntry) => (entry.source === "internal" ? 2 : 1);
  const bySource = sourceRank(b) - sourceRank(a);
  if (bySource !== 0) return bySource;

  if (a.isActive !== b.isActive) {
    return a.isActive ? -1 : 1;
  }

  const bySortOrder = a.sortOrder - b.sortOrder;
  if (bySortOrder !== 0) return bySortOrder;

  return a.title.localeCompare(b.title);
}

export function dedupeWebsiteDirectoryEntries(entries: WebsiteDirectoryEntry[]): WebsiteDirectoryEntry[] {
  const byKey = new Map<string, WebsiteDirectoryEntry>();

  for (const entry of entries) {
    const host = normalizeWebsiteDirectoryHost(entry.url);
    const key = host ? `host:${host}` : `id:${entry.id}`;
    const existing = byKey.get(key);

    if (!existing || compareWebsiteDirectoryEntries(entry, existing) < 0) {
      byKey.set(key, entry);
    }
  }

  return [...byKey.values()];
}

export function resolvePreviewImageUrl(url: string, previewImageUrl?: string): string {
  const override = previewImageUrl?.trim() ?? "";
  if (override.length > 0) return override;
  return buildMicrolinkPreviewUrl(url.trim());
}

export function normalizeWebsiteDirectoryInput(input: WebsiteDirectoryInput): WebsiteDirectoryInput {
  const normalizedUrl = input.url.trim();
  return {
    label: input.label.trim(),
    title: input.title.trim(),
    subtitle: (input.subtitle ?? "").trim(),
    url: normalizedUrl,
    previewImageUrl: resolvePreviewImageUrl(normalizedUrl, input.previewImageUrl),
    sortOrder: Number(input.sortOrder),
    isActive: Boolean(input.isActive),
  };
}
