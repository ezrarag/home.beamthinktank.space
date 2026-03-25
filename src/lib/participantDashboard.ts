import type { BeamHandoffRecord } from "@/lib/beamHandoff";
import { INITIAL_COHORT_SEED, INITIAL_ORGANIZATION_SEED } from "@/lib/participantIdentity";

export interface ParticipantDashboardPreferences {
  activeOrganizationId: string | null;
  activeWorkContextId: string | null;
  interestedOrganizationIds: string[];
  interestedWorkContextIds: string[];
}

export interface ParticipantOnboardingProfile {
  role?: string;
  interests?: string[];
  focus?: string[];
  engagement?: string;
  completedAt?: string;
}

export interface ParticipantArea {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  href?: string;
  kind: "organization" | "work_context";
  tags: string[];
  linkedOrganizationIds?: string[];
  source: "catalog" | "handoff" | "readyaimgo";
}

export interface ParticipantCohortCard {
  id: string;
  name: string;
  description: string;
  status: string;
  organizationIds: string[];
  source: "seed" | "handoff";
}

const ORGANIZATION_CATALOG: ParticipantArea[] = [
  {
    id: "org_beam_home",
    name: "BEAM Home",
    shortName: "BEAM Home",
    description: "Central participant entry point for navigation across the BEAM ecosystem.",
    href: "https://beamthinktank.space",
    kind: "organization",
    tags: ["entry", "network", "community"],
    source: "catalog",
  },
  {
    id: "org_beam_orchestra",
    name: "BEAM Orchestra",
    shortName: "Orchestra",
    description: "Music, performance, and cultural learning pathways inside BEAM.",
    href: "https://orchestra.beamthinktank.space",
    kind: "organization",
    tags: ["music", "arts", "performance"],
    source: "catalog",
  },
  {
    id: "org_beam_environment",
    name: "BEAM Environment",
    shortName: "Environment",
    description: "Environmental compliance, water safety, and applied regulatory technology pathways inside BEAM.",
    href: "https://environment.beamthinktank.space",
    kind: "organization",
    tags: ["environment", "water", "compliance"],
    source: "catalog",
  },
  {
    id: "org_beam_engineering",
    name: "BEAM Engineering / Web",
    shortName: "Engineering / Web",
    description: "Engineering, web development, and technical delivery pathways.",
    href: "https://engineering.beamthinktank.space",
    kind: "organization",
    tags: ["engineering", "webdev", "technical"],
    source: "catalog",
  },
];

const WORK_CONTEXT_CATALOG: ParticipantArea[] = [
  {
    id: "work_paynepros",
    name: "PaynePros",
    shortName: "PaynePros",
    description: "Client and partner work context connected to sponsorship and project delivery.",
    href: "https://www.readyaimgo.biz/story/paynepros/website",
    kind: "work_context",
    tags: ["client", "sponsor", "delivery"],
    linkedOrganizationIds: ["org_paynepros"],
    source: "catalog",
  },
  {
    id: "work_readyaimgo",
    name: "Readyaimgo Operations",
    shortName: "Readyaimgo",
    description: "Cross-client operational context surfaced through Readyaimgo workflows.",
    href: "https://www.readyaimgo.biz",
    kind: "work_context",
    tags: ["ops", "client", "platform"],
    source: "catalog",
  },
];

const DEPRECATED_WORK_CONTEXT_IDS = new Set(["work_beam_web_delivery"]);

const KNOWN_WORK_CONTEXT_BY_ORGANIZATION_ID: Record<string, string> = {
  org_paynepros: "work_paynepros",
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function slugifyValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function uniqueCohorts(cohorts: ParticipantCohortCard[]): ParticipantCohortCard[] {
  const byId = new Map<string, ParticipantCohortCard>();
  for (const cohort of cohorts) {
    if (!byId.has(cohort.id)) {
      byId.set(cohort.id, cohort);
    }
  }
  return [...byId.values()];
}

function isWorkContextHandoff(handoff: BeamHandoffRecord | null): boolean {
  if (!handoff) return false;
  const sourceSystem = handoff.sourceSystem.trim().toLowerCase();
  return handoff.sourceType === "readyaimgo_site" || sourceSystem.includes("readyaimgo");
}

function buildDerivedOrganizationFromHandoff(handoff: BeamHandoffRecord | null): ParticipantArea | null {
  if (!handoff || isWorkContextHandoff(handoff)) return null;

  const organizationId = handoff.organizationId.trim();
  if (organizationId && ORGANIZATION_CATALOG.some((organization) => organization.id === organizationId)) {
    return null;
  }

  const name = handoff.organizationName.trim() || handoff.scenarioLabel.trim();
  if (!name) return null;

  const fallbackId = organizationId || `org_handoff_${slugifyValue(handoff.entryChannel || name)}`;
  return {
    id: fallbackId,
    name,
    shortName: name,
    description: "Organization context derived from your most recent BEAM entry path.",
    href: handoff.siteUrl.trim() || undefined,
    kind: "organization",
    tags: ["current", "handoff"],
    source: "handoff",
  };
}

function buildDerivedWorkContextFromHandoff(handoff: BeamHandoffRecord | null): ParticipantArea | null {
  if (!handoff || !isWorkContextHandoff(handoff)) return null;

  const knownId = KNOWN_WORK_CONTEXT_BY_ORGANIZATION_ID[handoff.organizationId.trim()];
  if (knownId && WORK_CONTEXT_CATALOG.some((workContext) => workContext.id === knownId)) {
    return null;
  }

  const name = handoff.organizationName.trim() || handoff.scenarioLabel.trim() || "Current Work Context";
  const slugSource = handoff.organizationId.trim() || handoff.entryChannel.trim() || name;
  return {
    id: knownId || `work_handoff_${slugifyValue(slugSource)}`,
    name,
    shortName: name,
    description: "Work or client context derived from your most recent entry path.",
    href: handoff.siteUrl.trim() || handoff.landingPageUrl.trim() || undefined,
    kind: "work_context",
    tags: ["current", "handoff"],
    linkedOrganizationIds: handoff.organizationId.trim() ? [handoff.organizationId.trim()] : [],
    source: "handoff",
  };
}

function buildDerivedCohortFromHandoff(handoff: BeamHandoffRecord | null): ParticipantCohortCard | null {
  if (!handoff) return null;

  const cohortId = handoff.cohortId.trim();
  const cohortName = handoff.cohortName.trim();
  if (!cohortId && !cohortName) return null;
  if (cohortId && INITIAL_COHORT_SEED.some((cohort) => cohort.id === cohortId)) {
    return null;
  }

  return {
    id: cohortId || `cohort_handoff_${slugifyValue(cohortName || handoff.entryChannel)}`,
    name: cohortName || "Current Cohort",
    description: "Cohort context derived from your most recent BEAM entry path.",
    status: "Current",
    organizationIds: normalizeStringList([handoff.organizationId]),
    source: "handoff",
  };
}

export function getParticipantOrganizations(handoff: BeamHandoffRecord | null): ParticipantArea[] {
  return uniqueAreas([...ORGANIZATION_CATALOG, ...(buildDerivedOrganizationFromHandoff(handoff) ? [buildDerivedOrganizationFromHandoff(handoff)!] : [])]);
}

export function getParticipantWorkContexts(
  handoff: BeamHandoffRecord | null,
  upstreamWorkContexts: ParticipantArea[] = []
): ParticipantArea[] {
  return uniqueAreas([
    ...WORK_CONTEXT_CATALOG,
    ...upstreamWorkContexts,
    ...(buildDerivedWorkContextFromHandoff(handoff) ? [buildDerivedWorkContextFromHandoff(handoff)!] : []),
  ]);
}

export function getParticipantCohorts(handoff: BeamHandoffRecord | null): ParticipantCohortCard[] {
  const seedCards = INITIAL_COHORT_SEED.map((cohort) => ({
    id: cohort.id,
    name: cohort.name,
    description: cohort.description ?? "BEAM cohort",
    status: cohort.status,
    organizationIds: uniqueStringList([
      cohort.primaryOwnerOrganizationId,
      ...(cohort.collaboratingOrganizationIds ?? []),
      ...(cohort.sponsorOrganizationIds ?? []),
    ]),
    source: "seed" as const,
  }));

  const derived = buildDerivedCohortFromHandoff(handoff);
  return uniqueCohorts([...seedCards, ...(derived ? [derived] : [])]);
}

function uniqueStringList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function deriveDefaultParticipantDashboardPreferences(
  handoff: BeamHandoffRecord | null
): ParticipantDashboardPreferences {
  const derivedOrganization = buildDerivedOrganizationFromHandoff(handoff);
  const derivedWorkContext = buildDerivedWorkContextFromHandoff(handoff);

  const activeOrganizationId = derivedOrganization?.id
    ?? (handoff?.organizationId.trim() && ORGANIZATION_CATALOG.some((organization) => organization.id === handoff.organizationId.trim())
      ? handoff.organizationId.trim()
      : null);

  const activeWorkContextId = derivedWorkContext?.id
    ?? (handoff?.organizationId.trim() ? KNOWN_WORK_CONTEXT_BY_ORGANIZATION_ID[handoff.organizationId.trim()] ?? null : null);

  return {
    activeOrganizationId,
    activeWorkContextId,
    interestedOrganizationIds: [],
    interestedWorkContextIds: [],
  };
}

export function normalizeParticipantDashboardPreferences(
  value: unknown,
  handoff: BeamHandoffRecord | null
): ParticipantDashboardPreferences {
  const defaults = deriveDefaultParticipantDashboardPreferences(handoff);
  if (!value || typeof value !== "object") return defaults;

  const record = value as Record<string, unknown>;
  const activeWorkContextId =
    typeof record.activeWorkContextId === "string" && record.activeWorkContextId.trim()
      ? record.activeWorkContextId.trim()
      : defaults.activeWorkContextId;

  return {
    activeOrganizationId:
      typeof record.activeOrganizationId === "string" && record.activeOrganizationId.trim()
        ? record.activeOrganizationId.trim()
        : defaults.activeOrganizationId,
    activeWorkContextId:
      activeWorkContextId && !DEPRECATED_WORK_CONTEXT_IDS.has(activeWorkContextId)
        ? activeWorkContextId
        : defaults.activeWorkContextId,
    interestedOrganizationIds: uniqueStringList(normalizeStringList(record.interestedOrganizationIds)),
    interestedWorkContextIds: uniqueStringList(normalizeStringList(record.interestedWorkContextIds))
      .filter((workContextId) => !DEPRECATED_WORK_CONTEXT_IDS.has(workContextId)),
  };
}

export function getParticipantOrganizationCatalog(): ParticipantArea[] {
  return getParticipantOrganizations(null);
}

export function getParticipantWorkContextCatalog(): ParticipantArea[] {
  return getParticipantWorkContexts(null);
}

export function getParticipantIdentitySeedOrganizationMap(): Record<string, string> {
  return Object.fromEntries(INITIAL_ORGANIZATION_SEED.map((organization) => [organization.id, organization.name]));
}
