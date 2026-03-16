export type BeamCommitmentType =
  | "1 hr/week"
  | "5 hr/week"
  | "Project-based"
  | "Paid"
  | "Research credit"
  | "Equity contribution";

export type BeamAssetStage =
  | "SIGNAL"
  | "CLAIM"
  | "ACCESS"
  | "STABILIZE"
  | "ACTIVATE"
  | "SECURE"
  | "TRANSFER";

export type BeamActionVisibility = "public" | "private";

export type BeamTaskStatus = "open" | "in_progress" | "done";

export type BeamProjectStatus = "active" | "paused" | "completed";

export interface BeamRegion {
  id: string;
  name: string;
  geo: {
    lat: number;
    lng: number;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  activityScore: number;
  lastActionAt: string | null;
  sceneMediaUrl?: string;
}

export interface BeamProject {
  id: string;
  title: string;
  regionId: string;
  sector: string;
  type: "ngo" | "external_client" | "acquisition" | "research" | "internal_program";
  status: BeamProjectStatus;
  heroMediaId?: string;
  nextMilestone: string;
  tags: string[];
  assetIds?: string[];
}

export interface BeamActionTaskDraft {
  title: string;
  description: string;
  requiredRoleTags: string[];
  commitment: BeamCommitmentType;
}

export interface BeamAction {
  id: string;
  regionId: string;
  projectId?: string;
  assetId?: string;
  actorUserId: string;
  actionType: string;
  timestamp: string;
  weight: 1 | 2 | 3 | 4 | 5;
  summaryRaw: string;
  mediaIds: string[];
  aiSummary: string;
  aiTasks: BeamActionTaskDraft[];
  aiRolesNeeded: string[];
  visibility: BeamActionVisibility;
}

export interface BeamTask {
  id: string;
  projectId?: string;
  regionId: string;
  assetId?: string;
  title: string;
  description: string;
  requiredRoleTags: string[];
  commitment: BeamCommitmentType;
  status: BeamTaskStatus;
  createdFromActionId: string;
  ownerUserId?: string;
}

export interface BeamAssetStageHistoryItem {
  stage: BeamAssetStage;
  timestamp: string;
  note: string;
}

export interface BeamAsset {
  id: string;
  name: string;
  address: string;
  regionId: string;
  ownerName: string;
  acquisitionStage: BeamAssetStage;
  condition: "unknown" | "poor" | "fair" | "good" | "excellent";
  operatorNarrative: string;
  primaryUseCases: string[];
  scores: {
    capacity: number;
    impact: number;
    stability: number;
    revenue: number;
    partner: number;
  };
  stageHistory: BeamAssetStageHistoryItem[];
  linkedProjectIds: string[];
  linkedActionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BeamTaxonomy {
  regions: string[];
  sectors: string[];
  actionTypes: string[];
  commitmentTypes: BeamCommitmentType[];
  roleTags: string[];
  assetAcquisitionStages: BeamAssetStage[];
}
