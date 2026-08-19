"use client";

import { useEffect, useState } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";

interface SurvivalTelemetryHUDProps {
  isRevealed?: boolean;
}

export function SurvivalTelemetryHUD({ isRevealed = true }: SurvivalTelemetryHUDProps) {
  const {
    profileStatus,
    telemetry,
    userProfile,
    detectLocation,
    openMaturingModal,
    resetToBabyProfile,
  } = useTelemetryStore();

  const [isDocked, setIsDocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFlickering, setIsFlickering] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    void detectLocation();
  }, [detectLocation]);

  // Subtle telemetry "coming online" flicker effect when revealed
  useEffect(() => {
    if (isRevealed) {
      setIsFlickering(true);
      const timer = setTimeout(() => setIsFlickering(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  if (!isMounted) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-[#080908] p-6 text-white/60 animate-pulse">
        <div className="h-4 w-64 bg-white/10 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const {
    lat,
    lng,
    jurisdiction,
    radiusFeet,
    sustenance,
    shelter,
    sanitation,
    economicFloor,
  } = telemetry;

  return (
    <div
      className={`w-full font-mono transition-all duration-500 ${
        isDocked
          ? "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-w-6xl px-4"
          : "relative my-6 max-w-full"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-[color:var(--beam-gold)]/30 bg-[#080908] shadow-2xl backdrop-blur-xl">
        {/* Subtle background grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#d6b77a_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

        {/* Top Telemetry Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-3 text-[11px] uppercase tracking-wider text-white/80 gap-2">
          <div className="flex items-center space-x-2.5 flex-wrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--beam-gold)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--beam-gold)]" />
            </span>
            <span className="font-semibold text-[var(--beam-gold)]">
              LIVE SURVIVAL TELEMETRY
            </span>
            <span className="text-white/30">|</span>
            <span>
              PROFILE:{" "}
              <strong className="text-white font-medium">
                {profileStatus === "matured" && userProfile
                  ? `MATURED (${userProfile.name.toUpperCase()} · ${userProfile.discipline.toUpperCase()})`
                  : "BABY (ZERO-KNOWLEDGE)"}
              </strong>
            </span>
            <span className="text-white/30">|</span>
            <span className={`text-white/70 ${isFlickering ? "animate-pulse text-[var(--beam-gold)]" : ""}`}>
              LOC: {lat}° N, {Math.abs(lng)}° W
            </span>
          </div>

          <div className="flex items-center space-x-3 text-white/60 text-[10px] w-full sm:w-auto justify-between sm:justify-end">
            <span>
              JURISDICTION: <strong className="text-white/90">{jurisdiction}</strong> | RADIUS: {radiusFeet} FT
            </span>
            <button
              type="button"
              onClick={() => setIsDocked(!isDocked)}
              className="text-[var(--beam-gold)] hover:text-white transition px-2 py-0.5 border border-[var(--beam-gold)]/30 rounded text-[9px] uppercase tracking-widest"
              title={isDocked ? "Expand HUD to baseline position" : "Dock HUD to bottom of viewport"}
            >
              {isDocked ? "⚓ Expand" : "📌 Dock"}
            </button>
          </div>
        </div>

        {/* 4 Dimension Cards Grid with Staggered Entry */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 lg:divide-x divide-white/10 text-xs">
          {/* 01 SUSTENANCE */}
          <div
            className={`p-5 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition-all duration-500 ease-out ${
              isRevealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
            style={{ transitionDelay: isRevealed ? "60ms" : "0ms" }}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                <span>01 SUSTENANCE</span>
                <span className="text-white/40">grounds.</span>
              </div>
              <div className={`text-xl font-sans font-bold text-white mb-3 ${isFlickering ? "animate-pulse" : ""}`}>
                ${sustenance.costPerDay.toFixed(2)}{" "}
                <span className="text-xs font-normal text-white/50">/ day</span>
              </div>
              <ul className="space-y-1.5 text-white/70 text-[11px] leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>Nearest market: {sustenance.nearestMarketMiles} mi walk</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>
                    Delivery min: ${sustenance.deliveryMin.toFixed(2)} + fees
                  </span>
                </li>
              </ul>
            </div>
            <a
              href="https://grounds.beamthinktank.space"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between w-full mt-2 pt-2 border-t border-white/10 text-[10px] uppercase tracking-wider text-[var(--beam-gold)] hover:text-white transition group"
            >
              <span>Food Commons Mapping</span>
              <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
            </a>
          </div>

          {/* 02 SHELTER */}
          <div
            className={`p-5 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition-all duration-500 ease-out ${
              isRevealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
            style={{ transitionDelay: isRevealed ? "120ms" : "0ms" }}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                <span>02 SHELTER</span>
                <span className="text-white/40">law. / arch.</span>
              </div>
              <div className={`text-xl font-sans font-bold text-white mb-3 ${isFlickering ? "animate-pulse" : ""}`}>
                ${shelter.costPerNight.toFixed(2)}{" "}
                <span className="text-xs font-normal text-white/50">/ night</span>
              </div>
              <ul className="space-y-1.5 text-white/70 text-[11px] leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>
                    Parcel est. val: ${shelter.parcelEstMonthlyRent.toLocaleString()}/mo rent
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>
                    Vagrancy risk: ${shelter.vagrancyRiskFine} city code
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10 text-[10px] uppercase tracking-wider">
              <a
                href="https://law.beamthinktank.space"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--beam-gold)] hover:text-white transition"
              >
                Legal Codes ↗
              </a>
              <span className="text-white/20">|</span>
              <a
                href="https://architecture.beamthinktank.space"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--beam-gold)] hover:text-white transition"
              >
                Housing Feasibility ↗
              </a>
            </div>
          </div>

          {/* 03 SANITATION */}
          <div
            className={`p-5 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition-all duration-500 ease-out ${
              isRevealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
            style={{ transitionDelay: isRevealed ? "180ms" : "0ms" }}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                <span>03 SANITATION</span>
                <span className="text-white/40">law.</span>
              </div>
              <div className={`text-xl font-sans font-bold text-white mb-3 ${isFlickering ? "animate-pulse" : ""}`}>
                {sanitation.distanceToEasementMiles} mi{" "}
                <span className="text-xs font-normal text-white/50">to easement</span>
              </div>
              <ul className="space-y-1.5 text-white/70 text-[11px] leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>
                    Nearest public restroom: {sanitation.nearestRestroomMins} min
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>
                    Fine exposure: ${sanitation.fineExposure} ordinance
                  </span>
                </li>
              </ul>
            </div>
            <a
              href="https://law.beamthinktank.space"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between w-full mt-2 pt-2 border-t border-white/10 text-[10px] uppercase tracking-wider text-[var(--beam-gold)] hover:text-white transition group"
            >
              <span>Penal Code Exposure</span>
              <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
            </a>
          </div>

          {/* 04 ECONOMIC FLOOR */}
          <div
            className={`p-5 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition-all duration-500 ease-out ${
              isRevealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
            style={{ transitionDelay: isRevealed ? "240ms" : "0ms" }}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                <span>04 ECONOMIC FLOOR</span>
                <span className="text-white/40">orchestra. / fcu</span>
              </div>
              <div className={`text-xl font-sans font-bold text-white mb-3 ${isFlickering ? "animate-pulse" : ""}`}>
                ${economicFloor.uncompensatedHourlyRate.toFixed(2)}{" "}
                <span className="text-xs font-normal text-white/50">/ hr (Uncompensated)</span>
              </div>
              <ul className="space-y-1.5 text-white/70 text-[11px] leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>
                    Walking jobs: {economicFloor.walkingJobsCount} (Avg ${economicFloor.avgWalkingJobWage.toFixed(2)}/hr)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 text-[var(--beam-gold)]">•</span>
                  <span>
                    Survival burn rate: ${economicFloor.survivalBurnRatePerDay.toFixed(2)}/day
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 text-red-400">•</span>
                  <span className="text-red-300 font-medium">
                    Deficit to live: ${economicFloor.dailyDeficitToLive.toFixed(2)}/day
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10 text-[10px] uppercase tracking-wider">
              <a
                href="https://orchestra.beamthinktank.space"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--beam-gold)] hover:text-white transition"
              >
                Cultural Labor ↗
              </a>
              <span className="text-white/20">|</span>
              <a
                href="https://www.beamfcu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--beam-gold)] hover:text-white transition"
              >
                Micro-Underwriting ↗
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Profile Maturation Footer Bar */}
        <div className="border-t border-white/10 bg-white/[0.03] px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {profileStatus === "baby" ? (
            <button
              type="button"
              onClick={openMaturingModal}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-[var(--beam-gold)] px-5 py-2.5 font-semibold text-black hover:bg-[var(--beam-gold-bright)] transition tracking-wider uppercase text-[11px]"
            >
              <span>[+] MATURE THIS PROFILE</span>
              <span className="text-black/60 text-[9px]">
                (Add Name / Discipline / History to route to GROUNDS, ORCHESTRA, LAW)
              </span>
            </button>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-white/90">
                <div className="flex items-center space-x-2">
                  <span className="text-[var(--beam-gold)] font-bold">✓ PROFILE MATURED:</span>
                  <span>
                    {userProfile?.name} {userProfile?.email ? `<${userProfile.email}>` : ""} · {userProfile?.discipline}
                  </span>
                </div>
                {userProfile?.orchestraRecord && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded border border-[color:var(--beam-gold)]/40 bg-[rgba(214,183,122,0.12)] text-[10px] text-[var(--beam-gold-bright)]">
                    🎵 ORCHESTRA TETHERED: {userProfile.orchestraRecord.instrument} ({userProfile.orchestraRecord.status})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 text-[10px] uppercase tracking-wider shrink-0">
                <button
                  type="button"
                  onClick={openMaturingModal}
                  className="text-[var(--beam-gold)] hover:underline"
                >
                  [✎ Edit Profile]
                </button>
                <span className="text-white/20">|</span>
                <button
                  type="button"
                  onClick={resetToBabyProfile}
                  className="text-red-400 hover:underline"
                >
                  [↺ Reset to Baseline]
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
