export type BeamHotspotStatus = "identified" | "forming" | "activating" | "active" | "established";

export type BeamHotspotStage = 0 | 1 | 2 | 3 | 4;

export interface BeamHotspot {
  id: string;
  city: string;
  state: string;
  regionKey: string;
  lat: number;
  lng: number;
  coordinates: [number, number];
  dcEntityId?: string;
  stage: BeamHotspotStage;
  status: BeamHotspotStatus;
  publiclyVisible: boolean;
  publicSummary: string;
  activeRolesHint: string;
  topTags: string[];
}

export const beamHotspots: BeamHotspot[] = [
  {
    id: "hotspot-milwaukee",
    city: "Milwaukee",
    state: "WI",
    regionKey: "milwaukee",
    lat: 43.0389,
    lng: -87.9065,
    coordinates: [-87.9065, 43.0389],
    dcEntityId: "geoId/5553000",
    stage: 3,
    status: "active",
    publiclyVisible: true,
    publicSummary:
      "Milwaukee is operating as a housing-and-workforce node focused on translating evidence into community-facing implementation, with an emphasis on coalition entry points and public research access.",
    activeRolesHint: "Facilities, legal, grant-writing, project manager",
    topTags: ["housing", "workforce", "community"],
  },
  {
    id: "hotspot-madison",
    city: "Madison",
    state: "WI",
    regionKey: "madison",
    lat: 43.0731,
    lng: -89.4012,
    coordinates: [-89.4012, 43.0731],
    dcEntityId: "geoId/5548000",
    stage: 2,
    status: "activating",
    publiclyVisible: true,
    publicSummary:
      "Madison is a research-forward node in formation, linking education, civic-tech, and public-sector experimentation to local partner development.",
    activeRolesHint: "Research, media, education coordinators",
    topTags: ["education", "civic-tech", "research"],
  },
  {
    id: "hotspot-atlanta",
    city: "Atlanta",
    state: "GA",
    regionKey: "atlanta",
    lat: 33.749,
    lng: -84.388,
    coordinates: [-84.388, 33.749],
    dcEntityId: "geoId/1304000",
    stage: 3,
    status: "active",
    publiclyVisible: true,
    publicSummary:
      "Atlanta is expanding as a community-and-transit coordination node, aimed at helping local partners connect labor, mobility, and neighborhood-serving programs.",
    activeRolesHint: "Community outreach, music directors, operations",
    topTags: ["community", "transit", "labor"],
  },
  {
    id: "hotspot-orlando",
    city: "Orlando",
    state: "FL",
    regionKey: "orlando",
    lat: 28.5383,
    lng: -81.3792,
    coordinates: [-81.3792, 28.5383],
    dcEntityId: "geoId/1253000",
    stage: 0,
    status: "identified",
    publiclyVisible: false,
    publicSummary: "",
    activeRolesHint: "Client delivery, backend, content-media",
    topTags: ["housing", "environment", "nonprofits"],
  },
];
