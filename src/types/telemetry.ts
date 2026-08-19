export interface SustenanceMetrics {
  costPerDay: number;
  nearestMarketMiles: number;
  deliveryMin: number;
  deliveryFees: number;
  pantryDistanceMiles?: number;
}

export interface ShelterMetrics {
  costPerNight: number;
  parcelEstMonthlyRent: number;
  vagrancyRiskFine: number;
  curfewOrdinanceCode: string;
}

export interface SanitationMetrics {
  distanceToEasementMiles: number;
  nearestRestroomMins: number;
  fineExposure: number;
  publicUrinationOrdinance: string;
}

export interface EconomicFloorMetrics {
  uncompensatedHourlyRate: number;
  walkingJobsCount: number;
  avgWalkingJobWage: number;
  survivalBurnRatePerDay: number;
  dailyDeficitToLive: number;
}

export interface ZeroKnowledgeTelemetry {
  lat: number;
  lng: number;
  jurisdiction: string;
  radiusFeet: number;
  sustenance: SustenanceMetrics;
  shelter: ShelterMetrics;
  sanitation: SanitationMetrics;
  economicFloor: EconomicFloorMetrics;
}

export interface OrchestraCrossSiteRecord {
  project: string;
  instrument: string;
  status: string;
  headshotUrl?: string;
  notes?: string;
}

export interface UserProfileData {
  name: string;
  email?: string;
  discipline: string;
  educationHistory: string;
  demographics?: string;
  culturalCapitalNotes?: string;
  maturedAt?: string;
  orchestraRecord?: OrchestraCrossSiteRecord;
}

export interface EcosystemParticipant {
  id: string;
  name: string;
  email: string;
  discipline: string;
  subdomainSource: "orchestra" | "grounds" | "law" | "forge" | "fcu";
  location: string;
  educationHistory: string;
  culturalCapitalNotes?: string;
  orchestraRecord?: OrchestraCrossSiteRecord;
  uncompensatedRehearsalHours?: number;
  status: "Confirmed" | "Active" | "Interested" | "Pending";
}

export type ProfileStatus = "baby" | "matured";
