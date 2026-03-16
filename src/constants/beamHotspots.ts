export type BeamHotspotStatus = "warming" | "active" | "expanding";

export interface BeamHotspot {
  id: string;
  city: string;
  regionKey: string;
  lat: number;
  lng: number;
  status: BeamHotspotStatus;
  activeRolesHint: string;
  topTags: string[];
}

export const beamHotspots: BeamHotspot[] = [
  {
    id: "hotspot-milwaukee",
    city: "Milwaukee",
    regionKey: "milwaukee",
    lat: 43.0389,
    lng: -87.9065,
    status: "active",
    activeRolesHint: "Facilities, legal, grant-writing, project manager",
    topTags: ["real-estate", "engineering", "music"],
  },
  {
    id: "hotspot-madison",
    city: "Madison",
    regionKey: "madison",
    lat: 43.0731,
    lng: -89.4012,
    status: "warming",
    activeRolesHint: "Research, media, education coordinators",
    topTags: ["education", "media", "research"],
  },
  {
    id: "hotspot-atlanta",
    city: "Atlanta",
    regionKey: "atlanta",
    lat: 33.749,
    lng: -84.388,
    status: "expanding",
    activeRolesHint: "Community outreach, music directors, operations",
    topTags: ["music", "community", "operations"],
  },
  {
    id: "hotspot-orlando",
    city: "Orlando",
    regionKey: "orlando",
    lat: 28.5383,
    lng: -81.3792,
    status: "active",
    activeRolesHint: "Client delivery, backend, content-media",
    topTags: ["client-work", "media", "business"],
  },
];
