export type ParticipantIdentityTimestamp = string;

export type OrganizationType = "ngo" | "company" | "school" | "government" | "community" | "other";
export type OrganizationStatus = "active" | "inactive" | "archived";
export type OrganizationBusinessModel = "nonprofit" | "paying_client" | "sponsor_only" | "mixed" | "other";

export type CohortStatus = "draft" | "active" | "completed" | "archived";
export type CohortOwnershipModel = "single_org" | "sponsored" | "collaborative";

export type ParticipantProfileStatus = "active" | "pending" | "inactive" | "merged";
export type OrganizationMembershipStatus = "pending" | "active" | "inactive" | "removed";
export type OrganizationRelationshipType =
  | "participant"
  | "staff"
  | "mentor"
  | "employee_partner"
  | "volunteer"
  | "admin";

export type CohortMembershipStatus = "invited" | "active" | "completed" | "withdrawn";
export type CohortMembershipRole = "learner" | "mentor" | "facilitator" | "sponsor_observer";

export type ParticipantSourceType =
  | "beam_direct"
  | "readyaimgo_site"
  | "ngo_site"
  | "legacy_import"
  | "referral"
  | "admin_created";

export interface ParticipantIdentityLegacyInfo {
  sourceSystem?: string | null;
  legacyId?: string | null;
  importedAt?: ParticipantIdentityTimestamp | null;
  importBatchId?: string | null;
}

export interface TimestampedRecord {
  createdAt: ParticipantIdentityTimestamp;
  updatedAt: ParticipantIdentityTimestamp;
}

export interface Organization extends TimestampedRecord {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  slug?: string;
  shortName?: string;
  businessModel?: OrganizationBusinessModel;
  description?: string;
  website?: string;
  primaryRegionId?: string;
  regionIds?: string[];
  entryDomains?: string[];
  legacy?: ParticipantIdentityLegacyInfo;
  metadata?: Record<string, unknown>;
}

export interface Cohort extends TimestampedRecord {
  id: string;
  name: string;
  status: CohortStatus;
  ownershipModel: CohortOwnershipModel;
  primaryOwnerOrganizationId: string;
  slug?: string;
  description?: string;
  primaryRegionId?: string;
  regionIds?: string[];
  sponsorOrganizationIds?: string[];
  collaboratingOrganizationIds?: string[];
  startDate?: ParticipantIdentityTimestamp | null;
  endDate?: ParticipantIdentityTimestamp | null;
  entryDomains?: string[];
  legacy?: ParticipantIdentityLegacyInfo;
  metadata?: Record<string, unknown>;
}

export interface ParticipantProfile extends TimestampedRecord {
  id: string;
  status: ParticipantProfileStatus;
  authUid?: string | null;
  email?: string | null;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles?: string[];
  interests?: string[];
  goals?: string[];
  homeOrganizationIds?: string[];
  defaultOrganizationId?: string | null;
  defaultCohortId?: string | null;
  primaryRegionId?: string | null;
  regionIds?: string[];
  lastActiveAt?: ParticipantIdentityTimestamp | null;
  legacy?: ParticipantIdentityLegacyInfo;
  profileCompleteness?: number;
  metadata?: Record<string, unknown>;
}

export interface OrganizationMembership extends TimestampedRecord {
  id: string;
  participantId: string;
  organizationId: string;
  status: OrganizationMembershipStatus;
  relationshipType: OrganizationRelationshipType;
  roles?: string[];
  title?: string;
  isPrimary?: boolean;
  joinedAt?: ParticipantIdentityTimestamp | null;
  endedAt?: ParticipantIdentityTimestamp | null;
  invitedByParticipantId?: string | null;
  sourceAttributionId?: string | null;
  organizationRegionId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CohortMembership extends TimestampedRecord {
  id: string;
  participantId: string;
  cohortId: string;
  status: CohortMembershipStatus;
  membershipRole: CohortMembershipRole;
  organizationContextId?: string | null;
  joinedAt?: ParticipantIdentityTimestamp | null;
  completedAt?: ParticipantIdentityTimestamp | null;
  sourceAttributionId?: string | null;
  cohortRegionId?: string | null;
  progress?: {
    percent?: number;
    stage?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ParticipantSourceAttribution {
  id: string;
  participantId: string;
  sourceType: ParticipantSourceType;
  entryChannel: string;
  attributedAt: ParticipantIdentityTimestamp;
  createdAt: ParticipantIdentityTimestamp;
  organizationId?: string | null;
  cohortId?: string | null;
  campaignId?: string | null;
  campaignSource?: string | null;
  campaignMedium?: string | null;
  campaignName?: string | null;
  referrerUrl?: string | null;
  landingPageUrl?: string | null;
  sourceSystem?: string | null;
  legacy?: ParticipantIdentityLegacyInfo;
  isFirstTouch?: boolean;
  isLastTouch?: boolean;
  raw?: Record<string, unknown>;
}

export type OrganizationSeedInput = Omit<Organization, "createdAt" | "updatedAt">;
export type CohortSeedInput = Omit<Cohort, "createdAt" | "updatedAt">;

export interface ParticipantIdentitySeedData {
  organizations: OrganizationSeedInput[];
  cohorts: CohortSeedInput[];
}

export interface ParticipantIdentitySummary {
  organizations: Organization[];
  cohorts: Cohort[];
  counts: {
    participantProfiles: number;
    organizationMemberships: number;
    cohortMemberships: number;
  };
}
