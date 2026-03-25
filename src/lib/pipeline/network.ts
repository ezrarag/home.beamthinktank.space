import { beamHotspots } from "@/constants/beamHotspots";
import { extractLatestObservation, fetchGDCStat } from "@/lib/pipeline/googleDataCommons";
import type { CityContextStat, CityNode } from "@/lib/pipeline/types";
import { getNode, slugifyNodeId, type BeamNode } from "@/lib/server/firestoreNodes";

const CITY_VARIABLES = [
  {
    id: "population",
    label: "Population",
    variable: "Count_Person",
  },
  {
    id: "median-income",
    label: "Median Income",
    variable: "Median_Income_Person",
  },
  {
    id: "poverty",
    label: "Residents Below Poverty Line",
    variable: "Count_Person_BelowPovertyLevelInThePast12Months",
  },
] as const;

function mapNodeStatus(status: BeamNode["status"]): CityNode["status"] {
  if (status === "active") return "active";
  if (status === "activating") return "incoming";
  return "planned";
}

function formatStatValue(variable: string, rawValue: number | string | null): string {
  if (rawValue === null) return "Unavailable";

  const numericValue =
    typeof rawValue === "number" ? rawValue : Number.isFinite(Number(rawValue)) ? Number(rawValue) : null;

  if (numericValue === null) {
    return String(rawValue);
  }

  if (variable === "Median_Income_Person") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function getLegacyHotspot(node: BeamNode) {
  return (
    beamHotspots.find(
      (hotspot) =>
        hotspot.regionKey.toLowerCase() === node.id.toLowerCase() || hotspot.city.toLowerCase() === node.city.toLowerCase()
    ) ?? null
  );
}

export function mapNodeToCityNode(node: BeamNode): CityNode {
  return {
    slug: node.id,
    city: node.city,
    state: node.state,
    status: mapNodeStatus(node.status),
    focusTags: node.focusSectors,
    publicSummary: node.publicSummary,
    coordinates: node.coordinates,
  };
}

export async function getCityContextStats(node: BeamNode): Promise<CityContextStat[]> {
  const hotspot = getLegacyHotspot(node);
  if (!hotspot?.dcEntityId) {
    return [];
  }

  const settled = await Promise.allSettled(
    CITY_VARIABLES.map(async ({ id, label, variable }) => {
      const payload = await fetchGDCStat({
        entity: hotspot.dcEntityId!,
        variable,
      });
      const latest = extractLatestObservation(payload);

      return {
        id,
        label,
        rawValue: latest?.value ?? null,
        value: formatStatValue(variable, latest?.value ?? null),
        date: latest?.date ?? null,
        source: "Google Data Commons",
      } satisfies CityContextStat;
    })
  );

  return settled.reduce<CityContextStat[]>((accumulator, result) => {
    if (result.status === "fulfilled") {
      accumulator.push(result.value);
    }

    return accumulator;
  }, []);
}

export async function getCityNodePayload(city: string): Promise<{ node: CityNode; stats: CityContextStat[] } | null> {
  const node = await getNode(slugifyNodeId(city));
  if (!node) return null;

  const [mappedNode, stats] = await Promise.all([Promise.resolve(mapNodeToCityNode(node)), getCityContextStats(node)]);

  return { node: mappedNode, stats };
}
