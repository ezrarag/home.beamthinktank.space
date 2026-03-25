import type { CohortSeedInput, OrganizationSeedInput, ParticipantIdentitySeedData } from "@/types/participantIdentity";

export const PARTICIPANT_IDENTITY_COLLECTIONS = {
  organizations: "organizations",
  cohorts: "cohorts",
  participantProfiles: "participantProfiles",
  organizationMemberships: "organizationMemberships",
  cohortMemberships: "cohortMemberships",
  participantSourceAttribution: "participantSourceAttribution",
} as const;

export const INITIAL_ORGANIZATION_SEED: OrganizationSeedInput[] = [
  {
    id: "org_beam_orchestra",
    name: "BEAM Orchestra",
    shortName: "BEAM Orchestra",
    slug: "beam-orchestra",
    type: "ngo",
    businessModel: "nonprofit",
    status: "active",
    description: "Legacy orchestra-facing NGO identity imported into the BEAM Home ecosystem.",
    website: "https://orchestra.beamthinktank.space",
    primaryRegionId: "remote-global",
    regionIds: ["remote-global"],
    entryDomains: ["orchestra.beamthinktank.space"],
    legacy: {
      sourceSystem: "orchestra_firebase",
      legacyId: "org_beam_orchestra",
    },
    metadata: {
      canonicalParticipantSource: true,
    },
  },
  {
    id: "org_paynepros",
    name: "PaynePros",
    shortName: "PaynePros",
    slug: "paynepros",
    type: "company",
    businessModel: "paying_client",
    status: "active",
    description: "Employer and sponsorship partner within the BEAM ecosystem.",
    primaryRegionId: "remote-global",
    regionIds: ["remote-global"],
    entryDomains: [],
    metadata: {
      sponsorEligible: true,
    },
  },
];

export const INITIAL_COHORT_SEED: CohortSeedInput[] = [
  {
    id: "cohort_black_diaspora_symphony",
    name: "Black Diaspora Symphony",
    slug: "black-diaspora-symphony",
    status: "active",
    ownershipModel: "sponsored",
    primaryOwnerOrganizationId: "org_beam_orchestra",
    description: "Initial seeded cohort for orchestra-aligned participant identity testing.",
    primaryRegionId: "remote-global",
    regionIds: ["remote-global"],
    sponsorOrganizationIds: ["org_paynepros"],
    collaboratingOrganizationIds: ["org_beam_orchestra", "org_paynepros"],
    entryDomains: ["orchestra.beamthinktank.space", "home.beamthinktank.space"],
    metadata: {
      seeded: true,
    },
  },
];

export function buildInitialParticipantIdentitySeed(): ParticipantIdentitySeedData {
  return {
    organizations: INITIAL_ORGANIZATION_SEED,
    cohorts: INITIAL_COHORT_SEED,
  };
}
