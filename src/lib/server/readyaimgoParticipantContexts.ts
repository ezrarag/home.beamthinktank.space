import type { ParticipantArea } from "@/lib/participantDashboard";
import { normalizeWebsiteDirectoryHost } from "@/lib/websiteDirectory";
import {
  fetchReadyaimgoClients,
  type ReadyaimgoClient,
  type ReadyaimgoClientWorkContext,
} from "@/lib/server/readyaimgoDirectory";

export interface ParticipantWorkContextLookupInput {
  sourceType?: string;
  sourceSystem?: string;
  scenarioLabel?: string;
  entryChannel?: string;
  sourceDocumentId?: string;
  sourceStoryId?: string;
  organizationId?: string;
  organizationName?: string;
  siteUrl?: string;
  landingPageUrl?: string;
  referrerUrl?: string;
}

export type ParticipantContextResolutionMethod =
  | "source_document_id"
  | "source_story_id"
  | "legacy_heuristic"
  | "none";

export interface ParticipantContextResolution {
  method: ParticipantContextResolutionMethod;
  usedFallback: boolean;
  reason?: string;
  source?: string;
}

export interface ReadyaimgoParticipantContextResult {
  contexts: ParticipantArea[];
  matchedClient: {
    id: string;
    name: string;
    href?: string;
    storyId?: string;
    documentId?: string;
  } | null;
  resolution: ParticipantContextResolution;
}

interface ExportMatchedClient {
  id?: string;
  documentId?: string;
  storyId?: string;
  name?: string;
  title?: string;
  href?: string;
  url?: string;
  websiteUrl?: string;
}

interface ReadyaimgoParticipantContextExportWorkContext {
  id?: string;
  label?: string;
  name?: string;
  summary?: string;
  description?: string;
  sources?: string[];
  status?: "suggested" | "confirmed" | string;
  href?: string;
  url?: string;
}

interface ReadyaimgoParticipantContextExportPayload {
  success?: boolean;
  source?: string;
  matchedClient?: ExportMatchedClient | null;
  client?: ExportMatchedClient | null;
  contexts?: ReadyaimgoParticipantContextExportWorkContext[];
  workContexts?: ReadyaimgoParticipantContextExportWorkContext[];
  data?: {
    source?: string;
    matchedClient?: ExportMatchedClient | null;
    client?: ExportMatchedClient | null;
    contexts?: ReadyaimgoParticipantContextExportWorkContext[];
    workContexts?: ReadyaimgoParticipantContextExportWorkContext[];
  };
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyValue(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueStringList(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function uniqueAreas(areas: ParticipantArea[]): ParticipantArea[] {
  const byId = new Map<string, ParticipantArea>();
  for (const area of areas) {
    if (!byId.has(area.id)) {
      byId.set(area.id, area);
    }
  }
  return [...byId.values()];
}

function isReadyaimgoLookup(input: ParticipantWorkContextLookupInput): boolean {
  const sourceType = String(input.sourceType ?? "").trim().toLowerCase();
  const sourceSystem = String(input.sourceSystem ?? "").trim().toLowerCase();
  return sourceType === "readyaimgo_site" || sourceSystem.includes("readyaimgo");
}

function getTrimmedSourceDocumentId(input: ParticipantWorkContextLookupInput): string {
  return String(input.sourceDocumentId ?? "").trim();
}

function getTrimmedSourceStoryId(input: ParticipantWorkContextLookupInput): string {
  return String(input.sourceStoryId ?? "").trim();
}

function hasDeterministicSourceId(input: ParticipantWorkContextLookupInput): boolean {
  return Boolean(getTrimmedSourceDocumentId(input) || getTrimmedSourceStoryId(input));
}

function getDeterministicResolutionMethod(input: ParticipantWorkContextLookupInput): ParticipantContextResolutionMethod {
  return getTrimmedSourceDocumentId(input) ? "source_document_id" : "source_story_id";
}

function getReadyaimgoParticipantContextsEndpoint(): string {
  const absoluteUrl = process.env.READYAIMGO_BEAM_PARTICIPANT_CONTEXTS_URL?.trim();
  if (absoluteUrl) return absoluteUrl;

  const baseUrl = (process.env.READYAIMGO_API_BASE_URL ?? "https://www.readyaimgo.biz").replace(/\/+$/, "");
  const endpointPath = process.env.READYAIMGO_BEAM_PARTICIPANT_CONTEXTS_ENDPOINT ?? "/api/beam/participant-contexts";
  return `${baseUrl}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
}

function resolveExplicitUrl(value: string | null | undefined): string | undefined {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;

  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function buildParticipantAreaFromContext(input: {
  clientKey: string;
  contextKey: string;
  label: string;
  summary: string;
  href?: string;
  sources?: string[];
  status?: string;
  organizationId?: string;
}): ParticipantArea {
  const linkedOrganizationIds = input.organizationId ? [input.organizationId] : [];
  return {
    id: `work_readyaimgo_${input.clientKey}_${input.contextKey}`,
    name: input.label,
    shortName: input.label,
    description: input.summary,
    href: input.href,
    kind: "work_context",
    tags: uniqueStringList([...(input.sources ?? []), input.status, "readyaimgo"]),
    linkedOrganizationIds,
    source: "readyaimgo",
  };
}

function mapWorkContextToArea(
  client: ReadyaimgoClient,
  workContext: ReadyaimgoClientWorkContext,
  index: number,
  input: ParticipantWorkContextLookupInput
): ParticipantArea | null {
  const label = String(workContext.label ?? "").trim();
  const summary = String(workContext.summary ?? "").trim();
  if (!label || !summary) return null;

  const clientKey = slugifyValue(client.id ?? client.storyId ?? client.name ?? `client-${index + 1}`) || `client-${index + 1}`;
  const contextKey = slugifyValue(workContext.id ?? label) || `context-${index + 1}`;
  return buildParticipantAreaFromContext({
    clientKey,
    contextKey,
    label,
    summary,
    href: resolveClientHref(client),
    sources: workContext.sources,
    status: workContext.status,
    organizationId: String(input.organizationId ?? "").trim() || undefined,
  });
}

function collectHandoffHosts(input: ParticipantWorkContextLookupInput): string[] {
  return uniqueStringList([
    normalizeWebsiteDirectoryHost(input.siteUrl ?? ""),
    normalizeWebsiteDirectoryHost(input.landingPageUrl ?? ""),
    normalizeWebsiteDirectoryHost(input.referrerUrl ?? ""),
  ]).map((host) => host.toLowerCase());
}

function collectClientHosts(client: ReadyaimgoClient): string[] {
  return uniqueStringList([
    normalizeWebsiteDirectoryHost(client.websiteUrl ?? ""),
    normalizeWebsiteDirectoryHost(client.siteUrl ?? ""),
    normalizeWebsiteDirectoryHost(client.deployUrl ?? ""),
    ...(Array.isArray(client.deployHosts) ? client.deployHosts.map((host) => normalizeWebsiteDirectoryHost(host)) : []),
    ...(Array.isArray(client.vercelProjectDomains) ? client.vercelProjectDomains.map((host) => normalizeWebsiteDirectoryHost(host)) : []),
  ]).map((host) => host.toLowerCase());
}

function collectLookupTerms(input: ParticipantWorkContextLookupInput): string[] {
  const organizationId = String(input.organizationId ?? "").trim().replace(/^org[_-]/i, "");
  return uniqueStringList([
    normalizeText(input.organizationName),
    normalizeText(input.entryChannel),
    normalizeText(input.scenarioLabel),
    normalizeText(organizationId),
    slugifyValue(input.organizationName),
    slugifyValue(input.entryChannel),
    slugifyValue(input.scenarioLabel),
    slugifyValue(organizationId),
  ]);
}

function collectClientTerms(client: ReadyaimgoClient): string[] {
  return uniqueStringList([
    normalizeText(client.id),
    normalizeText(client.docId),
    normalizeText(client._id),
    normalizeText(client.storyId),
    normalizeText(client.name),
    normalizeText(client.title),
    ...(Array.isArray(client.brands) ? client.brands.map((brand) => normalizeText(brand)) : []),
    slugifyValue(client.id),
    slugifyValue(client.storyId),
    slugifyValue(client.name),
    ...(Array.isArray(client.brands) ? client.brands.map((brand) => slugifyValue(brand)) : []),
  ]);
}

function scoreClientMatch(client: ReadyaimgoClient, input: ParticipantWorkContextLookupInput): number {
  let score = 0;
  const handoffHosts = new Set(collectHandoffHosts(input));
  const clientHosts = collectClientHosts(client);
  const lookupTerms = collectLookupTerms(input);
  const clientTerms = collectClientTerms(client);

  if (clientHosts.some((host) => handoffHosts.has(host))) {
    score += 12;
  }

  for (const term of lookupTerms) {
    if (!term) continue;
    if (clientTerms.includes(term)) {
      score += 8;
      continue;
    }

    if (term.length < 4) continue;
    if (clientTerms.some((clientTerm) => clientTerm.includes(term) || term.includes(clientTerm))) {
      score += 3;
    }
  }

  if (Array.isArray(client.roleSuggestionSnapshot?.workContexts) && client.roleSuggestionSnapshot.workContexts.length > 0) {
    score += 1;
  }

  return score;
}

function resolveClientHref(client: ReadyaimgoClient): string | undefined {
  const candidates = [
    client.websiteUrl,
    client.siteUrl,
    client.deployUrl,
    ...(Array.isArray(client.vercelProjectDomains)
      ? client.vercelProjectDomains.map((domain) => `https://${String(domain).trim().replace(/^https?:\/\//i, "")}`)
      : []),
    ...(Array.isArray(client.deployHosts)
      ? client.deployHosts.map((domain) => `https://${String(domain).trim().replace(/^https?:\/\//i, "")}`)
      : []),
  ];

  for (const candidate of candidates) {
    const url = resolveExplicitUrl(candidate);
    if (url) return url;
  }

  return undefined;
}

function parseExportWorkContexts(
  payload: ReadyaimgoParticipantContextExportPayload,
  matchedClient: ExportMatchedClient | null,
  input: ParticipantWorkContextLookupInput
): ParticipantArea[] {
  const rawContexts = Array.isArray(payload.workContexts)
    ? payload.workContexts
    : Array.isArray(payload.contexts)
      ? payload.contexts
      : Array.isArray(payload.data?.workContexts)
        ? payload.data.workContexts
        : Array.isArray(payload.data?.contexts)
          ? payload.data.contexts
          : [];

  const clientKey = slugifyValue(
    matchedClient?.documentId ?? matchedClient?.id ?? matchedClient?.storyId ?? matchedClient?.name ?? "participant-context"
  ) || "participant-context";
  const organizationId = String(input.organizationId ?? "").trim() || undefined;
  const matchedClientHref = resolveExplicitUrl(
    matchedClient?.href ?? matchedClient?.websiteUrl ?? matchedClient?.url
  );

  return uniqueAreas(
    rawContexts
      .map((workContext, index) => {
        const label = String(workContext.label ?? workContext.name ?? "").trim();
        const summary = String(workContext.summary ?? workContext.description ?? "").trim();
        if (!label || !summary) return null;

        const contextKey = slugifyValue(workContext.id ?? label) || `context-${index + 1}`;
        return buildParticipantAreaFromContext({
          clientKey,
          contextKey,
          label,
          summary,
          href: resolveExplicitUrl(workContext.href ?? workContext.url) ?? matchedClientHref,
          sources: workContext.sources,
          status: workContext.status,
          organizationId,
        });
      })
      .filter((area): area is ParticipantArea => Boolean(area))
  );
}

function parseExportMatchedClient(
  payload: ReadyaimgoParticipantContextExportPayload
): ExportMatchedClient | null {
  return payload.matchedClient ?? payload.client ?? payload.data?.matchedClient ?? payload.data?.client ?? null;
}

async function fetchDeterministicParticipantContextExport(
  input: ParticipantWorkContextLookupInput
): Promise<ReadyaimgoParticipantContextResult | null> {
  if (!hasDeterministicSourceId(input)) return null;

  const apiKey = process.env.READYAIMGO_BEAM_API_KEY?.trim();
  if (!apiKey) return null;

  const endpoint = new URL(getReadyaimgoParticipantContextsEndpoint());
  const sourceDocumentId = getTrimmedSourceDocumentId(input);
  const sourceStoryId = getTrimmedSourceStoryId(input);
  if (sourceDocumentId) endpoint.searchParams.set("sourceDocumentId", sourceDocumentId);
  if (sourceStoryId) endpoint.searchParams.set("sourceStoryId", sourceStoryId);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  }).catch(() => null);

  if (!response || !response.ok) return null;

  const payload = (await response.json()) as ReadyaimgoParticipantContextExportPayload;
  if (payload.success === false) return null;

  const matchedClient = parseExportMatchedClient(payload);
  const contexts = parseExportWorkContexts(payload, matchedClient, input);
  const method = getDeterministicResolutionMethod(input);
  const matchedClientId =
    String(matchedClient?.documentId ?? matchedClient?.id ?? matchedClient?.storyId ?? "").trim()
    || slugifyValue(matchedClient?.name)
    || "matched-client";

  return {
    contexts,
    matchedClient: matchedClient
      ? {
          id: matchedClientId,
          name: String(matchedClient.name ?? matchedClient.title ?? matchedClient.storyId ?? "Matched Client").trim(),
          href: resolveExplicitUrl(matchedClient.href ?? matchedClient.websiteUrl ?? matchedClient.url),
          storyId: String(matchedClient.storyId ?? "").trim() || undefined,
          documentId: String(matchedClient.documentId ?? matchedClient.id ?? "").trim() || undefined,
        }
      : null,
    resolution: {
      method,
      usedFallback: false,
      source: String(payload.source ?? payload.data?.source ?? "readyaimgo-participant-context-export").trim() || "readyaimgo-participant-context-export",
    },
  };
}

async function resolveLegacyParticipantContexts(
  input: ParticipantWorkContextLookupInput,
  reason: string
): Promise<ReadyaimgoParticipantContextResult> {
  const clients = await fetchReadyaimgoClients();
  const scoredClients = clients
    .map((client) => ({ client, score: scoreClientMatch(client, input) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const matched = scoredClients[0]?.client;
  if (!matched) {
    return {
      contexts: [],
      matchedClient: null,
      resolution: {
        method: "legacy_heuristic",
        usedFallback: true,
        reason,
        source: "readyaimgo-clients-list",
      },
    };
  }

  const matchedClientId =
    String(matched.id ?? matched.docId ?? matched._id ?? matched.storyId ?? "").trim()
    || slugifyValue(matched.name)
    || "matched-client";
  const contexts = uniqueAreas(
    (matched.roleSuggestionSnapshot?.workContexts ?? [])
      .map((workContext, index) => mapWorkContextToArea(matched, workContext, index, input))
      .filter((area): area is ParticipantArea => Boolean(area))
  );

  return {
    contexts,
    matchedClient: {
      id: matchedClientId,
      name: String(matched.name ?? matched.title ?? matched.storyId ?? "Matched Client").trim(),
      href: resolveClientHref(matched),
      storyId: String(matched.storyId ?? "").trim() || undefined,
      documentId: String(matched.id ?? matched.docId ?? matched._id ?? "").trim() || undefined,
    },
    resolution: {
      method: "legacy_heuristic",
      usedFallback: true,
      reason,
      source: "readyaimgo-clients-list",
    },
  };
}

export async function resolveReadyaimgoParticipantContexts(
  input: ParticipantWorkContextLookupInput
): Promise<ReadyaimgoParticipantContextResult> {
  if (!isReadyaimgoLookup(input)) {
    return {
      contexts: [],
      matchedClient: null,
      resolution: {
        method: "none",
        usedFallback: false,
      },
    };
  }

  const deterministicResult = await fetchDeterministicParticipantContextExport(input);
  if (deterministicResult) {
    return deterministicResult;
  }

  if (hasDeterministicSourceId(input)) {
    return resolveLegacyParticipantContexts(input, "deterministic_export_unavailable");
  }

  return resolveLegacyParticipantContexts(input, "deterministic_ids_missing");
}
