import type { SectorData } from "@/lib/thesis/types";

export type VisualizationType =
  | "scatter"
  | "grouped-bar"
  | "gap-funnel"
  | "geo-heat"
  | "flow"
  | "bubble"
  | "custom";

export type ContributionStatus = "core" | "community" | "pending" | "deprecated";

export type ModuleConfig = {
  id: string;
  version: string;
  status: ContributionStatus;
  title: string;
  icon: string;
  sector: string;
  displayOrder: number;
  thesis: string;
  whatsPossible: string;
  dataStory: {
    hook: string;
    context: string;
    proof: string;
  };
  visualization: VisualizationType;
  dataSources: Array<{
    name: string;
    url: string;
    apiEnvKey?: string;
    isFree: boolean;
    updateFrequency: "daily" | "weekly" | "monthly" | "annual" | "static";
  }>;
  contributor?: {
    orgName: string;
    orgUrl?: string;
    contactEmail?: string;
    submittedAt: string;
    approvedAt?: string;
    notes?: string;
  };
  fetchData: () => Promise<SectorData>;
};

export type ModuleProposal = {
  id: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  orgName: string;
  orgUrl?: string;
  contactEmail?: string;
  sector: string;
  thesis: string;
  whatsPossible: string;
  dataSources: Array<{ name: string; url: string; isFree: boolean }>;
  sampleData?: unknown;
  notes?: string;
};
