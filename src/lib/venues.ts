export type BeamVenueCampus = "UWM" | "Marquette" | "MATC" | "Central UMC" | "community" | "other";
export type BeamVenueStatus = "available" | "restricted" | "pending_access" | "confirmed_access";
export type BeamOverlayType = "historical" | "technical" | "performance" | "film" | "game";
export type BeamOverlayStatus = "concept" | "in_development" | "live";

export const BEAM_VENUE_INVENTORY_COLLECTION = "beamVenueInventory";
export const BEAM_VENUE_OVERLAYS_COLLECTION = "beamVenueOverlays";

export interface BeamVenueRoom {
  name: string;
  capacity: number;
  hasPA: boolean;
  hasPiano: boolean;
  hasMixingBoard: boolean;
  hasRecordingBooth: boolean;
  hasARVREquipment: boolean;
  insuranceRequired: boolean;
  accessContact: string;
  accessEmail: string;
  reservationProcess: string;
  costPerSession: number;
  notes: string;
}

export interface BeamVenueInventoryItem {
  id: string;
  name: string;
  address: string;
  campus: BeamVenueCampus;
  rooms: BeamVenueRoom[];
  currentStatus: BeamVenueStatus;
  beamAccessNotes: string;
}

export interface BeamVenueOverlay {
  id: string;
  venueId: string;
  overlayType: BeamOverlayType;
  title: string;
  description: string;
  assetUrl?: string;
  triggeredByRoom: string;
  status: BeamOverlayStatus;
}

export const BEAM_VENUE_INVENTORY_SEED: BeamVenueInventoryItem[] = [
  {
    id: "bader-hall-uwm",
    name: "Bader Hall, UWM",
    address: "2400 E Kenwood Blvd, Milwaukee, WI 53211",
    campus: "UWM",
    currentStatus: "pending_access",
    beamAccessNotes: "Primary priority venue for orchestra and choir recording sessions. Access thread runs through David Vartanian and Dr. Durlam.",
    rooms: [
      {
        name: "Main Concert Hall",
        capacity: 700,
        hasPA: true,
        hasPiano: true,
        hasMixingBoard: true,
        hasRecordingBooth: false,
        hasARVREquipment: false,
        insuranceRequired: true,
        accessContact: "David Vartanian / Dr. Durlam",
        accessEmail: "durlam@uwm.edu",
        reservationProcess: "Coordinate through Peck School faculty access and hall reservation approval.",
        costPerSession: 0,
        notes: "Best candidate for flagship BEAM choral and orchestral recording sessions.",
      },
    ],
  },
  {
    id: "kenilworth-recording-studios",
    name: "Kenilworth Recording Studios, UWM",
    address: "2155 N Prospect Ave, Milwaukee, WI 53202",
    campus: "UWM",
    currentStatus: "pending_access",
    beamAccessNotes: "Studio-grade venue path still needs access confirmation and scheduling protocol.",
    rooms: [
      {
        name: "Recording Studio A",
        capacity: 20,
        hasPA: true,
        hasPiano: false,
        hasMixingBoard: true,
        hasRecordingBooth: true,
        hasARVREquipment: false,
        insuranceRequired: true,
        accessContact: "UWM studio administration",
        accessEmail: "",
        reservationProcess: "Confirm student/nonprofit access policy and faculty sponsor requirements.",
        costPerSession: 0,
        notes: "Strong fit for small ensemble, jingle, and overdub sessions.",
      },
    ],
  },
  {
    id: "uwm-main-music-building",
    name: "UWM Main Music Building",
    address: "2400 E Kenwood Blvd, Milwaukee, WI 53211",
    campus: "UWM",
    currentStatus: "restricted",
    beamAccessNotes: "Nathan policy currently constrains use of choir room and recording suite for BEAM programming.",
    rooms: [
      {
        name: "Choir Room",
        capacity: 80,
        hasPA: true,
        hasPiano: true,
        hasMixingBoard: false,
        hasRecordingBooth: false,
        hasARVREquipment: false,
        insuranceRequired: true,
        accessContact: "Music building administration",
        accessEmail: "",
        reservationProcess: "Restricted. Requires policy change or specific faculty exception.",
        costPerSession: 0,
        notes: "Large rehearsal room with good internal choir workflow if access opens.",
      },
      {
        name: "Recording Suite",
        capacity: 16,
        hasPA: false,
        hasPiano: false,
        hasMixingBoard: true,
        hasRecordingBooth: true,
        hasARVREquipment: false,
        insuranceRequired: true,
        accessContact: "Music building administration",
        accessEmail: "",
        reservationProcess: "Restricted under current internal policy.",
        costPerSession: 0,
        notes: "Potential technical anchor if internal restrictions are resolved.",
      },
    ],
  },
  {
    id: "central-united-methodist-church",
    name: "Central United Methodist Church",
    address: "639 N 25th St, Milwaukee, WI 53233",
    campus: "Central UMC",
    currentStatus: "confirmed_access",
    beamAccessNotes: "Confirmed community anchor site with active BEAM relationship and strong cross-NGO activation potential.",
    rooms: [
      {
        name: "Sanctuary",
        capacity: 300,
        hasPA: true,
        hasPiano: true,
        hasMixingBoard: true,
        hasRecordingBooth: false,
        hasARVREquipment: false,
        insuranceRequired: false,
        accessContact: "Rev. Viviane Thomas-Breitfeld",
        accessEmail: "",
        reservationProcess: "Coordinate directly with church leadership around service calendar and community programming.",
        costPerSession: 0,
        notes: "Best current confirmed-access venue for public-facing recording events.",
      },
    ],
  },
  {
    id: "dr-zinck-adjacent-church",
    name: "Church adjacent to retirement home (Dr. Zinck)",
    address: "Milwaukee, WI",
    campus: "community",
    currentStatus: "pending_access",
    beamAccessNotes: "Potential low-visibility recital and recording site connected to Dr. Zinck's existing retirement-home thread.",
    rooms: [
      {
        name: "Sanctuary",
        capacity: 120,
        hasPA: true,
        hasPiano: true,
        hasMixingBoard: false,
        hasRecordingBooth: false,
        hasARVREquipment: false,
        insuranceRequired: false,
        accessContact: "Dr. Zinck contact thread",
        accessEmail: "",
        reservationProcess: "Follow up through Dr. Zinck and church contacts; keep the frame informal.",
        costPerSession: 0,
        notes: "Good candidate for intimate recital capture and community music work.",
      },
    ],
  },
  {
    id: "newman-center",
    name: "Newman Center",
    address: "Milwaukee, WI",
    campus: "community",
    currentStatus: "available",
    beamAccessNotes: "Community access lead near campus. Needs direct reservation workflow validation.",
    rooms: [
      {
        name: "Main Hall",
        capacity: 180,
        hasPA: true,
        hasPiano: true,
        hasMixingBoard: true,
        hasRecordingBooth: false,
        hasARVREquipment: false,
        insuranceRequired: true,
        accessContact: "Newman Center administration",
        accessEmail: "",
        reservationProcess: "Confirm nonprofit reservation procedure and community-use pricing.",
        costPerSession: 0,
        notes: "Near-campus community venue with useful hybrid rehearsal/performance potential.",
      },
    ],
  },
];

export const BEAM_VENUE_OVERLAY_SEED: BeamVenueOverlay[] = [
  {
    id: "bader-hall-historical-overlay",
    venueId: "bader-hall-uwm",
    overlayType: "historical",
    title: "Bader Hall Historical Orientation",
    description: "Concept overlay for venue history, institutional memory, and future BEAM recording lineage inside Bader Hall.",
    triggeredByRoom: "Main Concert Hall",
    status: "concept",
  },
];

export const VENUE_CAMPUSES: BeamVenueCampus[] = ["UWM", "Marquette", "MATC", "Central UMC", "community", "other"];
export const VENUE_STATUSES: BeamVenueStatus[] = ["available", "restricted", "pending_access", "confirmed_access"];
export const OVERLAY_TYPES: BeamOverlayType[] = ["historical", "technical", "performance", "film", "game"];
export const OVERLAY_STATUSES: BeamOverlayStatus[] = ["concept", "in_development", "live"];
