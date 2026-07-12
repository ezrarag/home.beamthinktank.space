export type BeamProcessStageStatus = "complete" | "active" | "idle";

export interface BeamProcessStage {
  id: string;
  label: string;
  status: BeamProcessStageStatus;
  owner: string;
  note: string;
  updatedAt: string;
}

export interface BeamProcessFunding {
  targetUsd: number;
  raisedUsd: number;
  label: string;
}

export interface BeamProcess {
  id: string;
  title: string;
  domain: "library" | "grounds" | "architecture" | "forge" | "band" | "other";
  linkedEntityId?: string;
  linkedEntityType?: string;
  stages: BeamProcessStage[];
  funding?: BeamProcessFunding;
  createdAt: string;
  updatedAt: string;
}
