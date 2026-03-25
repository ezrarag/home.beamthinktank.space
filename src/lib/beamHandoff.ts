import type { ParticipantSourceType } from "@/types/participantIdentity";

export type BeamHandoffRole = "student" | "business" | "community";
export type BeamHandoffRedirectTarget = "dashboard" | "role_onboarding";

export interface BeamHandoffPreset {
  id: string;
  name: string;
  description: string;
  role: BeamHandoffRole;
  sourceType: ParticipantSourceType;
  sourceSystem: string;
  entryChannel: string;
  sourceDocumentId?: string;
  sourceStoryId?: string;
  organizationId?: string;
  organizationName?: string;
  cohortId?: string;
  cohortName?: string;
  siteUrl?: string;
  landingPageUrl?: string;
  referrerUrl?: string;
  redirectTarget?: BeamHandoffRedirectTarget;
}

export interface BeamHandoffFormState {
  presetId: string;
  scenarioLabel: string;
  role: BeamHandoffRole;
  sourceType: ParticipantSourceType;
  sourceSystem: string;
  entryChannel: string;
  sourceDocumentId: string;
  sourceStoryId: string;
  organizationId: string;
  organizationName: string;
  cohortId: string;
  cohortName: string;
  siteUrl: string;
  landingPageUrl: string;
  referrerUrl: string;
  redirectTarget: BeamHandoffRedirectTarget;
}

export interface BeamHandoffRecord extends Omit<BeamHandoffFormState, "presetId"> {
  uid: string;
  email: string | null;
  displayName: string | null;
  completedAt: string;
}

export const BEAM_HANDOFF_PRESETS: BeamHandoffPreset[] = [
  {
    id: "beam-environment-community",
    name: "BEAM Environment Participant",
    description: "Enter BEAM as an Environment NGO participant.",
    role: "community",
    sourceType: "ngo_site",
    sourceSystem: "beam",
    entryChannel: "environment.beamthinktank.space",
    organizationId: "org_beam_environment",
    organizationName: "BEAM Environment",
    cohortId: "cohort_beam_environment",
    cohortName: "BEAM Environment Cohort",
    siteUrl: "https://environment.beamthinktank.space",
    landingPageUrl: "https://environment.beamthinktank.space/dashboard",
    referrerUrl: "https://environment.beamthinktank.space",
    redirectTarget: "dashboard",
  },
  {
    id: "paynepros-business",
    name: "PaynePros Partner",
    description: "Enter BEAM as a PaynePros-linked business or sponsor touchpoint.",
    role: "business",
    sourceType: "readyaimgo_site",
    sourceSystem: "readyaimgo",
    entryChannel: "paynepros",
    sourceStoryId: "paynepros",
    organizationId: "org_paynepros",
    organizationName: "PaynePros",
    cohortId: "cohort_black_diaspora_symphony",
    cohortName: "Black Diaspora Symphony",
    landingPageUrl: "https://www.readyaimgo.biz/story/paynepros/website",
    referrerUrl: "https://www.readyaimgo.biz/story/paynepros/website",
    redirectTarget: "dashboard",
  },
  {
    id: "beam-orchestra-community",
    name: "BEAM Orchestra Community",
    description: "Enter BEAM as a community-facing orchestra participant.",
    role: "community",
    sourceType: "ngo_site",
    sourceSystem: "beam",
    entryChannel: "orchestra.beamthinktank.space",
    organizationId: "org_beam_orchestra",
    organizationName: "BEAM Orchestra",
    cohortId: "cohort_black_diaspora_symphony",
    cohortName: "Black Diaspora Symphony",
    siteUrl: "https://orchestra.beamthinktank.space",
    landingPageUrl: "https://orchestra.beamthinktank.space",
    referrerUrl: "https://orchestra.beamthinktank.space",
    redirectTarget: "dashboard",
  },
  {
    id: "beam-home-direct",
    name: "BEAM Home Direct",
    description: "Enter directly on BEAM Home without an external referral.",
    role: "community",
    sourceType: "beam_direct",
    sourceSystem: "beam",
    entryChannel: "home.beamthinktank.space",
    siteUrl: "https://beamthinktank.space",
    landingPageUrl: "https://beamthinktank.space",
    referrerUrl: "https://beamthinktank.space",
    redirectTarget: "dashboard",
  },
];

export function buildBeamHandoffInitialState(): BeamHandoffFormState {
  const preset = BEAM_HANDOFF_PRESETS[0];
  if (!preset) {
    return {
      presetId: "",
      scenarioLabel: "Custom BEAM handoff",
      role: "community",
      sourceType: "beam_direct",
      sourceSystem: "beam",
      entryChannel: "beam-home",
      sourceDocumentId: "",
      sourceStoryId: "",
      organizationId: "",
      organizationName: "",
      cohortId: "",
      cohortName: "",
      siteUrl: "",
      landingPageUrl: "",
      referrerUrl: "",
      redirectTarget: "dashboard",
    };
  }

  return applyBeamHandoffPreset(
    {
      presetId: "",
      scenarioLabel: "",
      role: "community",
      sourceType: "beam_direct",
      sourceSystem: "beam",
      entryChannel: "",
      sourceDocumentId: "",
      sourceStoryId: "",
      organizationId: "",
      organizationName: "",
      cohortId: "",
      cohortName: "",
      siteUrl: "",
      landingPageUrl: "",
      referrerUrl: "",
      redirectTarget: "dashboard",
    },
    preset
  );
}

export function getBeamHandoffPreset(presetId: string | null | undefined): BeamHandoffPreset | null {
  if (!presetId) return null;
  return BEAM_HANDOFF_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function applyBeamHandoffPreset(
  base: BeamHandoffFormState,
  preset: BeamHandoffPreset
): BeamHandoffFormState {
  return {
    ...base,
    presetId: preset.id,
    scenarioLabel: preset.name,
    role: preset.role,
    sourceType: preset.sourceType,
    sourceSystem: preset.sourceSystem,
    entryChannel: preset.entryChannel,
    sourceDocumentId: preset.sourceDocumentId ?? "",
    sourceStoryId: preset.sourceStoryId ?? "",
    organizationId: preset.organizationId ?? "",
    organizationName: preset.organizationName ?? "",
    cohortId: preset.cohortId ?? "",
    cohortName: preset.cohortName ?? "",
    siteUrl: preset.siteUrl ?? "",
    landingPageUrl: preset.landingPageUrl ?? "",
    referrerUrl: preset.referrerUrl ?? "",
    redirectTarget: preset.redirectTarget ?? "dashboard",
  };
}

export function applyBeamHandoffSearchParams(
  base: BeamHandoffFormState,
  searchParams: URLSearchParams
): BeamHandoffFormState {
  const preset = getBeamHandoffPreset(searchParams.get("preset"));
  const seeded = preset ? applyBeamHandoffPreset(base, preset) : base;

  const role = searchParams.get("role");
  const sourceType = searchParams.get("sourceType");
  const redirectTarget = searchParams.get("redirectTarget");

  return {
    ...seeded,
    scenarioLabel: searchParams.get("scenarioLabel")?.trim() || seeded.scenarioLabel,
    role:
      role === "student" || role === "business" || role === "community"
        ? role
        : seeded.role,
    sourceType:
      sourceType === "beam_direct" ||
      sourceType === "readyaimgo_site" ||
      sourceType === "ngo_site" ||
      sourceType === "legacy_import" ||
      sourceType === "referral" ||
      sourceType === "admin_created"
        ? sourceType
        : seeded.sourceType,
    sourceSystem: searchParams.get("sourceSystem")?.trim() || seeded.sourceSystem,
    entryChannel: searchParams.get("entryChannel")?.trim() || seeded.entryChannel,
    sourceDocumentId: searchParams.get("sourceDocumentId")?.trim() || seeded.sourceDocumentId,
    sourceStoryId: searchParams.get("sourceStoryId")?.trim() || seeded.sourceStoryId,
    organizationId: searchParams.get("organizationId")?.trim() || seeded.organizationId,
    organizationName: searchParams.get("organizationName")?.trim() || seeded.organizationName,
    cohortId: searchParams.get("cohortId")?.trim() || seeded.cohortId,
    cohortName: searchParams.get("cohortName")?.trim() || seeded.cohortName,
    siteUrl: searchParams.get("siteUrl")?.trim() || seeded.siteUrl,
    landingPageUrl: searchParams.get("landingPageUrl")?.trim() || seeded.landingPageUrl,
    referrerUrl: searchParams.get("referrerUrl")?.trim() || seeded.referrerUrl,
    redirectTarget:
      redirectTarget === "dashboard" || redirectTarget === "role_onboarding"
        ? redirectTarget
        : seeded.redirectTarget,
  };
}
