export type GrantDecision = "watch" | "pursue" | "decline";

export interface GrantSearchResult {
  id: string;
  number: string;
  title: string;
  agencyCode: string;
  agencyName: string;
  openDate: string;
  closeDate: string;
  status: string;
  assistanceListings: string[];
}

export interface GrantOpportunityDetail extends GrantSearchResult {
  description: string;
  applicantTypes: string[];
  fundingCategories: string[];
  fundingInstruments: string[];
  awardFloor: number;
  awardCeiling: number;
  estimatedFunding: number;
  expectedAwards: number;
  costSharing: boolean;
  contactName: string;
  contactEmail: string;
  sourceUrl: string;
}

export interface BeamGrantMapping {
  source: "grants.gov" | "manual";
  sourceId: string;
  sourceNumber: string;
  sourceUrl: string;
  agencyCode: string;
  agencyName: string;
  description: string;
  applicantTypes: string[];
  fundingCategories: string[];
  awardFloor: number;
  awardCeiling: number;
  estimatedFunding: number;
  costSharing: boolean;
  postedDate: string;
  closeDate: string;
  decision: GrantDecision;
  owner: string;
  strategicFit: number;
  eligibilityConfidence: number;
  relationshipStrength: number;
  effortLevel: number;
  fitScore: number;
  rationale: string;
  mappedAt: string;
  lastSyncedAt: string;
}
