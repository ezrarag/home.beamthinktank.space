export type PolicyFindingOrigin =
  | "curated"
  | "nber"
  | "google-data-commons"
  | "policy-commons"
  | "overton";

export type PolicyFinding = {
  id: string;
  tag: string;
  headline: string;
  body: string;
  source: string;
  sourceUrl?: string;
  date: string;
  isoDate: string;
  topics: string[];
  origin: PolicyFindingOrigin;
  featured: boolean;
};

export type CityNode = {
  slug: string;
  city: string;
  state: string;
  status: "active" | "incoming" | "planned";
  focusTags: string[];
  publicSummary: string;
  coordinates: [number, number];
};

export type CityContextStat = {
  id: string;
  label: string;
  value: string;
  rawValue: number | string | null;
  date: string | null;
  source: string;
};
