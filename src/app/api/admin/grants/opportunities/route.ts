import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import type { GrantOpportunityDetail, GrantSearchResult } from "@/types/grantOpportunity";

const GRANTS_API = "https://api.grants.gov/v1/api";

type SearchHit = {
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

type OpportunityDetailResponse = {
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
    expectedNumberOfAwards?: string | number;
    costSharing?: boolean;
    applicantTypes?: Array<{ description?: string }>;
    fundingActivityCategories?: Array<{ description?: string }>;
    fundingInstruments?: Array<{ description?: string }>;
    agencyContactName?: string;
    agencyContactEmail?: string;
  };
  alns?: Array<{ alnNumber?: string }>;
};

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown) { const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
function stripHtml(value: string) {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<li>/gi, "• ").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\n{3,}/g, "\n\n").trim();
}

async function grantsRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${GRANTS_API}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (!response.ok) throw new Error(`Grants.gov request failed (${response.status}).`);
  const payload = await response.json() as { errorcode?: number; msg?: string; data?: unknown };
  if (payload.errorcode !== 0) throw new Error(payload.msg || "Grants.gov could not complete the request.");
  return payload.data;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminIdentity(request);
    const body = await request.json() as { action?: string; keyword?: string; statuses?: string; category?: string; start?: number; id?: string };
    if (body.action === "detail") {
      if (!body.id) return NextResponse.json({ error: "Opportunity ID is required." }, { status: 400 });
      const data = await grantsRequest("fetchOpportunity", { opportunityId: Number(body.id) }) as OpportunityDetailResponse;
      const synopsis = data.synopsis ?? {};
      const detail: GrantOpportunityDetail = {
        id: String(data.id ?? body.id), number: text(data.opportunityNumber), title: text(data.opportunityTitle),
        agencyCode: text(data.owningAgencyCode), agencyName: text(data.agencyDetails?.agencyName) || text(synopsis.agencyName),
        openDate: text(synopsis.postingDate), closeDate: text(synopsis.responseDate), status: "posted",
        assistanceListings: (data.alns ?? []).map((item) => text(item.alnNumber)).filter(Boolean),
        description: stripHtml(text(synopsis.synopsisDesc)), applicantTypes: (synopsis.applicantTypes ?? []).map((item) => text(item.description)).filter(Boolean),
        fundingCategories: (synopsis.fundingActivityCategories ?? []).map((item) => text(item.description)).filter(Boolean),
        fundingInstruments: (synopsis.fundingInstruments ?? []).map((item) => text(item.description)).filter(Boolean),
        awardFloor: number(synopsis.awardFloor), awardCeiling: number(synopsis.awardCeiling), estimatedFunding: number(synopsis.estimatedFunding), expectedAwards: number(synopsis.expectedNumberOfAwards),
        costSharing: synopsis.costSharing === true, contactName: text(synopsis.agencyContactName), contactEmail: text(synopsis.agencyContactEmail),
        sourceUrl: `https://www.grants.gov/search-results-detail/${encodeURIComponent(String(data.id ?? body.id))}`,
      };
      return NextResponse.json({ detail });
    }

    const keyword = text(body.keyword).slice(0, 160);
    const data = await grantsRequest("search2", { rows: 25, keyword, oppStatuses: body.statuses || "forecasted|posted", fundingCategories: body.category || "", startRecordNum: Math.max(0, Number(body.start ?? 0)) }) as { hitCount?: number; oppHits?: SearchHit[] };
    const results: GrantSearchResult[] = (data.oppHits ?? []).map((hit) => ({
      id: String(hit.id ?? ""), number: text(hit.number), title: text(hit.title), agencyCode: text(hit.agencyCode), agencyName: text(hit.agency),
      openDate: text(hit.openDate), closeDate: text(hit.closeDate), status: text(hit.oppStatus), assistanceListings: hit.cfdaList ?? hit.alnist ?? [],
    })).filter((item) => item.id && item.title);
    return NextResponse.json({ results, total: Number(data.hitCount ?? results.length) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search official grant sources." }, { status: 500 });
  }
}
