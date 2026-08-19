import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ZeroKnowledgeTelemetry, UserProfileData, ProfileStatus } from "@/types/telemetry";

const DEFAULT_TELEMETRY: ZeroKnowledgeTelemetry = {
  lat: 33.6795,
  lng: -84.4394,
  jurisdiction: "EAST POINT, GA",
  radiusFeet: 200,
  sustenance: {
    costPerDay: 18.40,
    nearestMarketMiles: 0.6,
    deliveryMin: 24.50,
    deliveryFees: 4.50,
  },
  shelter: {
    costPerNight: 42.10,
    parcelEstMonthlyRent: 1260,
    vagrancyRiskFine: 250,
    curfewOrdinanceCode: "Sec. 14-202 City Code",
  },
  sanitation: {
    distanceToEasementMiles: 0.8,
    nearestRestroomMins: 14,
    fineExposure: 150,
    publicUrinationOrdinance: "Sec. 18-4 Public Indecency",
  },
  economicFloor: {
    uncompensatedHourlyRate: 0.00,
    walkingJobsCount: 4,
    avgWalkingJobWage: 11.50,
    survivalBurnRatePerDay: 60.50,
    dailyDeficitToLive: -24.50,
  },
};

interface TelemetryState {
  profileStatus: ProfileStatus;
  telemetry: ZeroKnowledgeTelemetry;
  userProfile: UserProfileData | null;
  isTelemetryModalOpen: boolean;
  isMaturingModalOpen: boolean;
  locationSource: "geolocation" | "ip" | "default" | "user_input";
  isDetectingLocation: boolean;

  // Actions
  detectLocation: () => Promise<void>;
  updateJurisdiction: (query: string) => Promise<void>;
  matureProfile: (data: Omit<UserProfileData, "maturedAt">) => void;
  resetToBabyProfile: () => void;
  openTelemetryModal: () => void;
  closeTelemetryModal: () => void;
  openMaturingModal: () => void;
  closeMaturingModal: () => void;
}

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      profileStatus: "baby",
      telemetry: DEFAULT_TELEMETRY,
      userProfile: null,
      isTelemetryModalOpen: false,
      isMaturingModalOpen: false,
      locationSource: "default",
      isDetectingLocation: false,

      detectLocation: async () => {
        if (get().locationSource === "user_input") return;
        set({ isDetectingLocation: true });

        const fetchBaseline = async (lat: number, lng: number, source: "geolocation" | "ip" | "default") => {
          try {
            const res = await fetch(`/api/telemetry/baseline?lat=${lat}&lng=${lng}`);
            if (res.ok) {
              const data = (await res.json()) as ZeroKnowledgeTelemetry;
              set({ telemetry: data, locationSource: source, isDetectingLocation: false });
              return;
            }
          } catch {
            // Silently maintain default telemetry on network issue
          }
          set({
            telemetry: { ...DEFAULT_TELEMETRY, lat, lng },
            locationSource: source,
            isDetectingLocation: false,
          });
        };

        if (typeof window !== "undefined" && "geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              void fetchBaseline(latitude, longitude, "geolocation");
            },
            () => {
              void fetchBaseline(DEFAULT_TELEMETRY.lat, DEFAULT_TELEMETRY.lng, "ip");
            },
            { timeout: 6000 }
          );
        } else {
          void fetchBaseline(DEFAULT_TELEMETRY.lat, DEFAULT_TELEMETRY.lng, "default");
        }
      },

      updateJurisdiction: async (query: string) => {
        set({ isDetectingLocation: true });
        try {
          const res = await fetch(`/api/telemetry/baseline?query=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = (await res.json()) as ZeroKnowledgeTelemetry;
            set({ telemetry: data, locationSource: "user_input", isDetectingLocation: false });
            return;
          }
        } catch {
          // Maintain existing on error
        }
        set({ isDetectingLocation: false });
      },

      matureProfile: (data) => {
        const fullProfile: UserProfileData = {
          ...data,
          maturedAt: new Date().toISOString(),
        };
        set({
          profileStatus: "matured",
          userProfile: fullProfile,
          isMaturingModalOpen: false,
        });
      },

      resetToBabyProfile: () => {
        set({
          profileStatus: "baby",
          userProfile: null,
          locationSource: "default",
          telemetry: DEFAULT_TELEMETRY,
        });
      },

      openTelemetryModal: () => set({ isTelemetryModalOpen: true }),
      closeTelemetryModal: () => set({ isTelemetryModalOpen: false }),

      openMaturingModal: () => set({ isMaturingModalOpen: true }),
      closeMaturingModal: () => set({ isMaturingModalOpen: false }),
    }),
    {
      name: "beam-telemetry-hud-store",
      partialize: (state) => ({
        profileStatus: state.profileStatus,
        userProfile: state.userProfile,
        telemetry: state.telemetry,
        locationSource: state.locationSource,
      }),
    }
  )
);
