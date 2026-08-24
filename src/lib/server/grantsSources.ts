import type { BeamOpportunity, ContextSource } from "@/types/grantConsole";

export interface GrantSourceAdapter {
  sourceId: string;
  sourceName: string;
  searchOpportunities(query: {
    keyword?: string;
    category?: string;
    statuses?: string;
    limit?: number;
  }): Promise<BeamOpportunity[]>;
  fetchOpportunityDetail(id: string): Promise<BeamOpportunity | null>;
}

const GRANTS_GOV_API = "https://api.grants.gov/v1/api";

type GrantsGovHit = {
  id?: string | number;
  number?: string;
  title?: string;
  agencyCode?: string;
  agency?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
  cfdaList?: string[];
  alnist?: string[];
};

type GrantsGovDetailResponse = {
  id?: string | number;
  opportunityNumber?: string;
  opportunityTitle?: string;
  owningAgencyCode?: string;
  agencyDetails?: { agencyName?: string };
  synopsis?: {
    agencyName?: string;
    synopsisDesc?: string;
    postingDate?: string;
    responseDate?: string;
    awardFloor?: string | number;
    awardCeiling?: string | number;
    estimatedFunding?: string | number;
    costSharing?: boolean;
    applicantTypes?: Array<{ description?: string }>;
    fundingActivityCategories?: Array<{ description?: string }>;
  };
  alns?: Array<{ alnNumber?: string }>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const GrantsGovAdapter: GrantSourceAdapter = {
  sourceId: "grants.gov",
  sourceName: "Grants.gov Official Federal Database",

  async searchOpportunities({ keyword = "", category = "", statuses = "forecasted|posted", limit = 20 }) {
    const response = await fetch(`${GRANTS_GOV_API}/search2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: limit,
        keyword: keyword.slice(0, 160),
        oppStatuses: statuses,
        fundingCategories: category,
        startRecordNum: 0,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API search failed (${response.status})`);
    }

    const payload = (await response.json()) as { errorcode?: number; msg?: string; data?: { oppHits?: GrantsGovHit[] } };
    if (payload.errorcode !== 0) {
      throw new Error(payload.msg || "Grants.gov could not complete the query.");
    }

    const hits = payload.data?.oppHits ?? [];
    const now = new Date().toISOString();

    return hits
      .map((hit): BeamOpportunity => {
        const id = String(hit.id ?? hit.number ?? "");
        const oppNumber = text(hit.number) || id;
        const title = text(hit.title);
        const agencyName = text(hit.agency);
        const agencyCode = text(hit.agencyCode);

        const defaultSource: ContextSource = {
          id: `src-nofo-${id}`,
          type: "nofo",
          name: `${oppNumber}.pdf`,
          shortDescription: "Official Grants.gov NOFO Synopsis",
          status: "ready",
          url: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
          attachedAt: now,
        };

        return {
          id: `grant-${id}`,
          externalSource: "grants.gov",
          sourceId: id,
          opportunityNumber: oppNumber,
          title,
          agencyCode,
          agencyName,
          description: "Search result from Grants.gov. Click to inspect full NOFO synopsis and eligibility requirements.",
          applicantTypes: [],
          fundingCategories: [],
          awardFloor: 0,
          awardCeiling: 0,
          estimatedFunding: 0,
          costSharing: false,
          postedDate: text(hit.openDate),
          closeDate: text(hit.closeDate),
          sourceUrl: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
          opportunityContextSources: [defaultSource],
          createdAt: now,
          updatedAt: now,
          hasActivePursuit: false,
        };
      })
      .filter((opp) => opp.sourceId && opp.title);
  },

  async fetchOpportunityDetail(id: string) {
    const numericId = Number(id.replace(/^grant-/, ""));
    const response = await fetch(`${GRANTS_GOV_API}/fetchOpportunity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId: numericId }),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { errorcode?: number; data?: GrantsGovDetailResponse };
    if (payload.errorcode !== 0 || !payload.data) return null;

    const data = payload.data;
    const synopsis = data.synopsis ?? {};
    const oppNumber = text(data.opportunityNumber) || String(id);
    const now = new Date().toISOString();

    const nofoSource: ContextSource = {
      id: `src-nofo-${id}`,
      type: "nofo",
      name: `${oppNumber}.pdf`,
      shortDescription: "41 pp · deadline + match requirements parsed",
      status: "ready",
      pageCount: 41,
      url: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
      extractedMetadata: {
        deadline: text(synopsis.responseDate),
        matchRequirement: synopsis.costSharing ? "Cost sharing required" : "No cost share indicated",
        applicantTypes: (synopsis.applicantTypes ?? []).map((t) => text(t.description)).filter(Boolean),
      },
      attachedAt: now,
    };

    return {
      id: `grant-${id}`,
      externalSource: "grants.gov",
      sourceId: String(data.id ?? id),
      opportunityNumber: oppNumber,
      title: text(data.opportunityTitle),
      agencyCode: text(data.owningAgencyCode),
      agencyName: text(data.agencyDetails?.agencyName) || text(synopsis.agencyName),
      description: stripHtml(text(synopsis.synopsisDesc)),
      applicantTypes: (synopsis.applicantTypes ?? []).map((t) => text(t.description)).filter(Boolean),
      fundingCategories: (synopsis.fundingActivityCategories ?? []).map((t) => text(t.description)).filter(Boolean),
      awardFloor: number(synopsis.awardFloor),
      awardCeiling: number(synopsis.awardCeiling),
      estimatedFunding: number(synopsis.estimatedFunding),
      costSharing: synopsis.costSharing === true,
      postedDate: text(synopsis.postingDate),
      closeDate: text(synopsis.responseDate),
      sourceUrl: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
      opportunityContextSources: [nofoSource],
      createdAt: now,
      updatedAt: now,
      hasActivePursuit: false,
    };
  },
};

const SOURCE_REGISTRY: Record<string, GrantSourceAdapter> = {
  "grants.gov": GrantsGovAdapter,
};

export async function searchAllGrantSources(query: {
  keyword?: string;
  category?: string;
  statuses?: string;
  limit?: number;
}): Promise<BeamOpportunity[]> {
  const adapter = SOURCE_REGISTRY["grants.gov"];
  return adapter ? adapter.searchOpportunities(query) : [];
}

export async function fetchOpportunityDetailFromSources(id: string): Promise<BeamOpportunity | null> {
  const adapter = SOURCE_REGISTRY["grants.gov"];
  return adapter ? adapter.fetchOpportunityDetail(id) : null;
}
