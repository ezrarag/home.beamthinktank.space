export type SectorId = "education" | "food" | "housing" | "healthcare" | "legal";

export type SectorDataPoint = {
  id: string;
  label: string;
  cost: number;
  qualityScore: number;
  qualityLabel: string;
  isFreeOrSubsidized: boolean;
  lat?: number;
  lng?: number;
  metadata?: Record<string, string | number>;
};

export type SectorData = {
  sector: SectorId;
  title: string;
  icon?: string;
  visualization?: string;
  displayOrder?: number;
  thesis: string;
  whatsPossible: string;
  dataSource: string;
  dataSourceUrl: string;
  sources?: Array<{
    name: string;
    url: string;
    isFree: boolean;
  }>;
  lastUpdated: string;
  points: SectorDataPoint[];
  summary: {
    avgCostPaid: number;
    avgCostFree: number;
    avgQualityPaid: number;
    avgQualityFree: number;
    gapStatement: string;
  };
  contributor?: {
    orgName: string;
    orgUrl?: string;
    contactEmail?: string;
    submittedAt: string;
    approvedAt?: string;
    notes?: string;
  };
};

export function isSectorId(value: string): value is SectorId {
  return value === "education" || value === "food" || value === "housing" || value === "healthcare" || value === "legal";
}
