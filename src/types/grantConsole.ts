export type FiveGateStageId =
  | "open"
  | "research_qualify"
  | "drafting"
  | "submitted"
  | "decision";

export type GrantDecision = "watch" | "pursue" | "decline";

export type ContextSourceType = "nofo" | "cv" | "org" | "link" | "file";
export type ContextSourceStatus = "ready" | "fetching" | "error";

export interface ContextSource {
  id: string;
  type: ContextSourceType;
  name: string;
  shortDescription: string;
  status: ContextSourceStatus;
  progressPercent?: number;
  url?: string;
  fileSize?: string;
  pageCount?: number;
  extractedMetadata?: {
    deadline?: string;
    matchRequirement?: string;
    applicantTypes?: string[];
    keyPersonnel?: string[];
  };
  attachedAt: string;
}

export interface ExplainerClip {
  id: string;
  title: string;
  durationSeconds: number;
  durationLabel: string;
  targetSectionId: string;
  mediaUrl?: string;
  audioUrl?: string;
  isPlaying?: boolean;
}

export interface PursuitParticipant {
  userId: string;
  name: string;
  email: string;
  roleLabel: string; // Flexible free-text role label
  roleId?: string; // Optional link back to grantRoles taxonomy library
  assignedAt: string;
  avatarUrl?: string;
}

export interface FunderContact {
  id: string;
  name: string;
  roleTitle: string; // e.g. "Program Officer (PO)", "Foundation Program Director"
  organizationName: string;
  email?: string;
  phone?: string;
  lastContactDate?: string;
  notes?: string;
}

export interface BeamInstitutionalRole {
  id: string; // e.g. "sam_entity_admin"
  roleId: string;
  roleLabel: string;
  holderName: string;
  holderEmail: string;
  backupHolderName?: string;
  backupHolderEmail?: string;
  expirationDate?: string;
  updatedAt: string;
}

// Activity Log Entry stored in subcollection: beamPursuits/{pursuitId}/activity/{eventId}
export interface ActivityLogEntry {
  id: string;
  pursuitId: string;
  actorName: string;
  actorEmail?: string;
  actionType:
    | "created"
    | "stage_advanced"
    | "source_attached"
    | "participant_added"
    | "funder_contact_added"
    | "reaimed"
    | "score_updated"
    | "draft_saved"
    | "decision_made";
  description: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

// 1. OPPORTUNITY: Funder-side record
export interface BeamOpportunity {
  id: string;
  externalSource: "grants.gov" | "foundation_directory" | "state_portal" | "manual";
  sourceId: string;
  opportunityNumber: string;
  title: string;
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
  sourceUrl: string;
  opportunityResearchNotes?: string;
  opportunityContextSources: ContextSource[];
  createdAt: string;
  updatedAt: string;
  hasActivePursuit: boolean;
}

// 2. SUBJECT: Target subject
export interface BeamSubject {
  id: string;
  type: "person" | "entity" | "program" | "purpose";
  name: string;
  description: string;
  email?: string;
  organizationName?: string;
  targetLocation?: string;
}

// 3. PURSUIT: Binds ONE Opportunity to ONE Subject
export interface BeamPursuit {
  id: string;
  opportunityId: string;
  opportunityNumber: string;
  opportunityTitle: string;
  agencyName: string;
  sourceUrl: string;
  
  subjectId: string;
  subjectName: string;
  subjectType: "person" | "entity" | "program" | "purpose";
  
  currentGate: FiveGateStageId;
  gateProgress: Record<FiveGateStageId, { status: "complete" | "active" | "idle"; updatedAt?: string }>;
  
  decision: GrantDecision;
  fitScore: number;
  strategicFit: number;
  eligibilityConfidence: number;
  relationshipStrength: number;
  effortLevel: number;
  rationale: string;
  
  targetUsd: number;
  raisedUsd: number;
  deadlineDate: string;
  
  isFederal?: boolean; // Inferred from externalSource === "grants.gov"
  participants: PursuitParticipant[];
  funderContacts?: FunderContact[];
  pursuitContextSources: ContextSource[];
  
  latestActivityPull: string;
  status: "active" | "reaimed" | "closed_won" | "closed_lost";
  forkedFromPursuitId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type ConsoleStateMode = "state_a_landing" | "state_b_roster" | "state_c_room";

export interface GrantConsoleState {
  viewMode: ConsoleStateMode;
  activePursuitId: string | null;
  activeOpportunityId: string | null;
  isExplainerOpen: boolean;
  activeExplainerClipId: string | null;
  isAudioMuted: boolean;
  commandInput: string;
  contextSources: ContextSource[];
  isSearching: boolean;
  searchError: string | null;
  searchResults: BeamOpportunity[];
}
