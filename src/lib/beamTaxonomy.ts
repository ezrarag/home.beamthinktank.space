import taxonomyJson from "../../docs/beam-taxonomy.json";
import type { BeamRegion, BeamTaxonomy } from "@/types/beamGame";
import { slugifyRegionName } from "@/lib/beamGame";

export const BEAM_TAXONOMY: BeamTaxonomy = taxonomyJson as BeamTaxonomy;

const REGION_GEO: Record<string, { lat: number; lng: number; radius: number }> = {
  milwaukee: { lat: 43.0389, lng: -87.9065, radius: 0.8 },
  madison: { lat: 43.0731, lng: -89.4012, radius: 0.8 },
  atlanta: { lat: 33.749, lng: -84.388, radius: 0.8 },
  orlando: { lat: 28.5383, lng: -81.3792, radius: 0.8 },
  "remote-global": { lat: 39.8283, lng: -98.5795, radius: 25 },
};

export function buildDefaultRegions(): BeamRegion[] {
  return BEAM_TAXONOMY.regions.map((name) => {
    const id = slugifyRegionName(name);
    const geo = REGION_GEO[id] ?? { lat: 39.8283, lng: -98.5795, radius: 8 };
    return {
      id,
      name,
      geo: {
        lat: geo.lat,
        lng: geo.lng,
        bounds: {
          north: geo.lat + geo.radius,
          south: geo.lat - geo.radius,
          east: geo.lng + geo.radius,
          west: geo.lng - geo.radius,
        },
      },
      activityScore: 0,
      lastActionAt: null,
      sceneMediaUrl: "",
    };
  });
}
