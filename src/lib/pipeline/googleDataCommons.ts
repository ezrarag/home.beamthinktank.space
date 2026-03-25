const GOOGLE_DATA_COMMONS_API = "https://api.datacommons.org/v2/observation";
const GOOGLE_DATA_COMMONS_DEMO_KEY = "AIzaSyCTI4Xz-UW_G2Q2RfknhcfdAnTHq5X5WoQ";
const GOOGLE_DATA_COMMONS_REQUEST_INIT = {
  next: { revalidate: 86400 },
} as RequestInit & { next: { revalidate: number } };

interface GDCStatOptions {
  entity: string;
  variable: string;
}

type ObservationCandidate = {
  date: string;
  value: number | string;
};

export async function fetchGDCStat(options: GDCStatOptions): Promise<unknown | null> {
  const params = new URLSearchParams({
    key: GOOGLE_DATA_COMMONS_DEMO_KEY,
    "entity.dcids": options.entity,
    "variable.dcids": options.variable,
    select: "entity",
  });

  params.append("select", "variable");
  params.append("select", "value");
  params.append("select", "date");

  try {
    const response = await fetch(`${GOOGLE_DATA_COMMONS_API}?${params.toString()}`, GOOGLE_DATA_COMMONS_REQUEST_INIT);

    if (!response.ok) {
      throw new Error(`GDC fetch failed: ${response.status}`);
    }

    return (await response.json()) as unknown;
  } catch (error) {
    console.warn("[BEAM pipeline] Google Data Commons fetch failed:", error);
    return null;
  }
}

function collectObservationCandidates(value: unknown, bucket: ObservationCandidate[]) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach((entry) => collectObservationCandidates(entry, bucket));
    return;
  }

  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const date = typeof record.date === "string" ? record.date : typeof record.observationDate === "string" ? record.observationDate : null;
  const rawValue =
    typeof record.value === "number" || typeof record.value === "string"
      ? record.value
      : typeof record.measuredValue === "number" || typeof record.measuredValue === "string"
        ? record.measuredValue
        : null;

  if (date && rawValue !== null) {
    bucket.push({
      date,
      value: rawValue,
    });
  }

  Object.values(record).forEach((entry) => collectObservationCandidates(entry, bucket));
}

export function extractLatestObservation(payload: unknown): ObservationCandidate | null {
  if (!payload) return null;

  const observations: ObservationCandidate[] = [];
  collectObservationCandidates(payload, observations);

  if (observations.length === 0) {
    return null;
  }

  observations.sort((left, right) => right.date.localeCompare(left.date));
  return observations[0] ?? null;
}
