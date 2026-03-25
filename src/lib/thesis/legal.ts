import type { SectorData } from "@/lib/thesis/types";

export async function fetchLegalData(): Promise<SectorData> {
  return legalFallback;
}

const legalFallback: SectorData = {
  sector: "legal",
  title: "Legal Services",
  thesis:
    "Civil legal need goes overwhelmingly unmet, yet free legal aid produces dramatically better outcomes than self-representation and can match private counsel.",
  whatsPossible:
    "Legal aid organizations already prove that high-quality representation can be delivered at zero cost when capacity exists.",
  dataSource: "Legal Services Corporation · Justice Gap Report 2022",
  dataSourceUrl: "https://justicegap.lsc.gov/",
  lastUpdated: "2022-10-01",
  points: [
    {
      id: "legal-gap",
      label: "Low-income Americans with civil legal needs",
      cost: 0,
      qualityScore: 0,
      qualityLabel: "92% of needs unmet — a scaling problem, not an efficacy problem",
      isFreeOrSubsidized: false,
      metadata: { totalNeeds: 1700000, metNeeds: 136000, unmetNeeds: 1564000 },
    },
    {
      id: "legal-aid",
      label: "LSC-funded legal aid recipients",
      cost: 0,
      qualityScore: 79,
      qualityLabel: "79% favorable outcome rate in represented matters",
      isFreeOrSubsidized: true,
      metadata: { favorableOutcomeRate: 79, avgHoursPerCase: 4.2 },
    },
    {
      id: "legal-private",
      label: "Private attorney (civil matters)",
      cost: 6300,
      qualityScore: 74,
      qualityLabel: "$350/hr avg · comparable outcomes in represented cases",
      isFreeOrSubsidized: false,
      metadata: { avgHourlyRate: 350, avgCaseHours: 18 },
    },
    {
      id: "legal-prose",
      label: "Self-represented litigants",
      cost: 0,
      qualityScore: 28,
      qualityLabel: "28% favorable outcome rate without counsel",
      isFreeOrSubsidized: false,
      metadata: { favorableOutcomeRate: 28, context: "eviction" },
    },
  ],
  summary: {
    avgCostPaid: 3150,
    avgCostFree: 0,
    avgQualityPaid: 51,
    avgQualityFree: 79,
    gapStatement: "Free legal aid beats self-representation by 51 points and rivals private counsel at $0 cost",
  },
};
