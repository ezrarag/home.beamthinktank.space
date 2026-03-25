import { fetchEducationData } from "@/lib/thesis/education";
import { fetchFoodData } from "@/lib/modules/food/adapter";
import { fetchHealthcareData } from "@/lib/thesis/healthcare";
import { fetchHousingData } from "@/lib/thesis/housing";
import { fetchLegalData } from "@/lib/thesis/legal";
import type { SectorData, SectorId } from "@/lib/thesis/types";

const fetchers: Record<SectorId, () => Promise<SectorData>> = {
  education: fetchEducationData,
  food: fetchFoodData,
  housing: fetchHousingData,
  healthcare: fetchHealthcareData,
  legal: fetchLegalData,
};

export async function getAllSectorData(): Promise<SectorData[]> {
  const results = await Promise.allSettled(Object.values(fetchers).map((fetcher) => fetcher()));

  return results.reduce<SectorData[]>((accumulator, result) => {
    if (result.status === "fulfilled") {
      accumulator.push(result.value);
    }

    return accumulator;
  }, []);
}

export async function getSectorData(sector: SectorId): Promise<SectorData | null> {
  try {
    return await fetchers[sector]();
  } catch {
    return null;
  }
}
