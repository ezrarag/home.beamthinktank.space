import type { PolicyFinding } from "@/lib/pipeline/types";

const NBER_FEED =
  "https://www.nber.org/api/v1/working_page_listing/contentType/working_paper/_/_/search?page=1&perPage=10";
const NBER_REQUEST_INIT = {
  next: { revalidate: 3600 },
} as RequestInit & { next: { revalidate: number } };

interface NBERAuthor {
  name?: string | null;
}

interface NBERTopic {
  slug?: string | null;
}

interface NBERPaper {
  title?: string | null;
  authors?: NBERAuthor[] | null;
  abstract?: string | null;
  url?: string | null;
  issueDateFormatted?: string | null;
  issueDate?: string | null;
  topics?: NBERTopic[] | null;
}

interface NBERResponse {
  results?: NBERPaper[];
}

function summarizeAbstract(value: string | null | undefined): string {
  if (!value) return "See the full working paper for details.";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 280 ? `${compact.slice(0, 279).trim()}…` : compact;
}

export async function fetchNBER(): Promise<PolicyFinding[]> {
  try {
    const response = await fetch(NBER_FEED, NBER_REQUEST_INIT);

    if (!response.ok) {
      throw new Error(`NBER fetch failed: ${response.status}`);
    }

    const json = (await response.json()) as NBERResponse;
    const results = Array.isArray(json.results) ? json.results.slice(0, 5) : [];

    return results.map((paper, index) => {
      const paperId = paper.url?.split("/").filter(Boolean).pop() ?? String(index);
      const firstAuthor = paper.authors?.[0]?.name?.trim() || "Multiple Authors";

      return {
        id: `nber-${paperId}`,
        tag: "ECONOMICS RESEARCH",
        headline: paper.title?.trim() || "Untitled working paper",
        body: summarizeAbstract(paper.abstract),
        source: `NBER Working Paper · ${firstAuthor}`,
        sourceUrl: paper.url ? `https://www.nber.org${paper.url}` : undefined,
        date: paper.issueDateFormatted?.trim() || "",
        isoDate: paper.issueDate?.trim() || new Date().toISOString(),
        topics: (paper.topics ?? [])
          .map((topic) => topic.slug?.trim().toLowerCase())
          .filter((topic): topic is string => Boolean(topic)),
        origin: "nber",
        featured: false,
      } satisfies PolicyFinding;
    });
  } catch (error) {
    console.warn("[BEAM pipeline] NBER fetch failed, returning empty:", error);
    return [];
  }
}
