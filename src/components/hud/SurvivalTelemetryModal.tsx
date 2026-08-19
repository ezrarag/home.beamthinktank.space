"use client";

import { useEffect, useState } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";
import type { EcosystemParticipant } from "@/types/telemetry";

export function SurvivalTelemetryModal() {
  const {
    profileStatus,
    telemetry,
    userProfile,
    isTelemetryModalOpen,
    closeTelemetryModal,
    openMaturingModal,
    resetToBabyProfile,
    detectLocation,
    updateJurisdiction,
    isDetectingLocation,
    matureProfile,
  } = useTelemetryStore();

  const [activeTab, setActiveTab] = useState<"telemetry" | "participants">("telemetry");
  const [isFlickering, setIsFlickering] = useState(false);
  const [isEditingJurisdiction, setIsEditingJurisdiction] = useState(false);
  const [cityInput, setCityInput] = useState("");

  // Participant Directory State
  const [participants, setParticipants] = useState<EcosystemParticipant[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  useEffect(() => {
    if (isTelemetryModalOpen) {
      void detectLocation();
      setIsFlickering(true);
      const timer = setTimeout(() => setIsFlickering(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isTelemetryModalOpen, detectLocation]);

  useEffect(() => {
    if (isTelemetryModalOpen && activeTab === "participants" && participants.length === 0) {
      let cancelled = false;
      setIsLoadingParticipants(true);
      async function loadParticipants() {
        try {
          const res = await fetch("/api/telemetry/participants");
          if (res.ok) {
            const data = (await res.json()) as { participants?: EcosystemParticipant[] };
            if (!cancelled && data.participants) {
              setParticipants(data.participants);
            }
          }
        } catch {
          // Fallback handled gracefully
        } finally {
          if (!cancelled) setIsLoadingParticipants(false);
        }
      }
      void loadParticipants();
      return () => { cancelled = true; };
    }
  }, [isTelemetryModalOpen, activeTab, participants.length]);

  if (!isTelemetryModalOpen) return null;

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

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;

    setIsFlickering(true);
    await updateJurisdiction(cityInput.trim());
    setIsEditingJurisdiction(false);
    setCityInput("");
    setTimeout(() => setIsFlickering(false), 600);
  };

  const handleSelectParticipant = (p: EcosystemParticipant) => {
    matureProfile({
      name: p.name,
      email: p.email,
      discipline: p.discipline,
      educationHistory: p.educationHistory,
      culturalCapitalNotes: p.culturalCapitalNotes,
      orchestraRecord: p.orchestraRecord,
    });
    setActiveTab("telemetry");
  };

  const filteredParticipants = participants.filter((p) => {
    const q = searchFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.discipline.toLowerCase().includes(q) ||
      (p.orchestraRecord?.instrument || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[color:var(--beam-gold)]/40 bg-[#080908] text-white shadow-2xl font-mono transition-all">
        {/* Subtle background grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#d6b77a_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

        {/* Top Header Bar with Mode Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-4 gap-3">
          <div className="flex items-center space-x-3 flex-wrap">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--beam-gold)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--beam-gold)]" />
            </span>
            <span className="font-semibold text-sm text-[var(--beam-gold)] uppercase tracking-wider">
              BEAM LIVE TELEMETRY &amp; PARTICIPANT SYSTEM
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`px-3 py-1.5 rounded-xl border text-[11px] uppercase tracking-wider transition ${
                activeTab === "telemetry"
                  ? "bg-[var(--beam-gold)] text-black border-[var(--beam-gold)] font-bold"
                  : "bg-white/5 text-white/70 border-white/10 hover:text-white"
              }`}
            >
              📡 Live Telemetry HUD
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("participants")}
              className={`px-3 py-1.5 rounded-xl border text-[11px] uppercase tracking-wider transition ${
                activeTab === "participants"
                  ? "bg-[var(--beam-gold)] text-black border-[var(--beam-gold)] font-bold"
                  : "bg-white/5 text-white/70 border-white/10 hover:text-white"
              }`}
            >
              👥 Participant Directory ({participants.length || "8+"})
            </button>

            <button
              type="button"
              onClick={closeTelemetryModal}
              className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition focus:outline-none ml-2"
              aria-label="Close Live Survival Telemetry HUD pop-up"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TAB 1: TELEMETRY HUD */}
        {activeTab === "telemetry" && (
          <div>
            {/* Telemetry Location & Interactive Jurisdiction Status Bar */}
            <div className="bg-white/[0.015] border-b border-white/10 px-6 py-3 text-[11px] uppercase tracking-wider text-white/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 flex-wrap">
                <span>LOC:</span>
                <strong className={`text-white ${isFlickering || isDetectingLocation ? "animate-pulse text-[var(--beam-gold)]" : ""}`}>
                  {lat}° N, {Math.abs(lng)}° W
                </strong>
                <span className="text-white/30">|</span>
                <span>JURISDICTION:</span>
                {!isEditingJurisdiction ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCityInput(jurisdiction);
                      setIsEditingJurisdiction(true);
                    }}
                    className="group flex items-center space-x-1.5 text-white hover:text-[var(--beam-gold-bright)] transition border-b border-dashed border-[var(--beam-gold)]/40 pb-0.5 cursor-pointer"
                    title="Click to type a different city or jurisdiction"
                  >
                    <span className="font-bold underline underline-offset-4 decoration-[var(--beam-gold)]/50">{jurisdiction}</span>
                    <span className="text-[10px] text-[var(--beam-gold)] group-hover:scale-110 transition-transform">✎ Edit</span>
                  </button>
                ) : (
                  <form onSubmit={handleCitySubmit} className="inline-flex items-center space-x-2">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Enter city (e.g., Milwaukee, Atlanta, Chicago)"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      className="rounded-lg border border-[var(--beam-gold)]/60 bg-black/90 px-3 py-1 text-xs text-white placeholder-white/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isDetectingLocation}
                      className="rounded-lg bg-[var(--beam-gold)] px-3 py-1 text-[10px] font-semibold text-black hover:bg-[var(--beam-gold-bright)] transition uppercase tracking-wider"
                    >
                      {isDetectingLocation ? "Loading..." : "Update Area"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingJurisdiction(false)}
                      className="text-white/40 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </form>
                )}
              </div>

              <div className="text-white/60 text-[10px]">
                RADIUS: {radiusFeet} FT
              </div>
            </div>

            {/* 4 Dimension Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 lg:divide-x divide-white/10 text-xs">
              {/* 01 SUSTENANCE */}
              <div className="p-6 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                    <span>01 SUSTENANCE</span>
                    <span className="text-white/40">grounds.</span>
                  </div>
                  <div className={`text-2xl font-sans font-bold text-white mb-3 ${isFlickering || isDetectingLocation ? "animate-pulse text-[var(--beam-gold)]" : ""}`}>
                    ${sustenance.costPerDay.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-white/50">/ day</span>
                  </div>
                  <ul className="space-y-2 text-white/70 text-[11px] leading-relaxed">
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
                  className="inline-flex items-center justify-between w-full mt-3 pt-3 border-t border-white/10 text-[10px] uppercase tracking-wider text-[var(--beam-gold)] hover:text-white transition group"
                >
                  <span>Food Commons Mapping</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
                </a>
              </div>

              {/* 02 SHELTER */}
              <div className="p-6 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                    <span>02 SHELTER</span>
                    <span className="text-white/40">law. / arch.</span>
                  </div>
                  <div className={`text-2xl font-sans font-bold text-white mb-3 ${isFlickering || isDetectingLocation ? "animate-pulse text-[var(--beam-gold)]" : ""}`}>
                    ${shelter.costPerNight.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-white/50">/ night</span>
                  </div>
                  <ul className="space-y-2 text-white/70 text-[11px] leading-relaxed">
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
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10 text-[10px] uppercase tracking-wider">
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
              <div className="p-6 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                    <span>03 SANITATION</span>
                    <span className="text-white/40">law.</span>
                  </div>
                  <div className={`text-2xl font-sans font-bold text-white mb-3 ${isFlickering || isDetectingLocation ? "animate-pulse text-[var(--beam-gold)]" : ""}`}>
                    {sanitation.distanceToEasementMiles} mi{" "}
                    <span className="text-xs font-normal text-white/50">to easement</span>
                  </div>
                  <ul className="space-y-2 text-white/70 text-[11px] leading-relaxed">
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
                  className="inline-flex items-center justify-between w-full mt-3 pt-3 border-t border-white/10 text-[10px] uppercase tracking-wider text-[var(--beam-gold)] hover:text-white transition group"
                >
                  <span>Penal Code Exposure</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
                </a>
              </div>

              {/* 04 ECONOMIC FLOOR */}
              <div className="p-6 flex flex-col justify-between space-y-4 hover:bg-white/[0.015] transition">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold mb-1">
                    <span>04 ECONOMIC FLOOR</span>
                    <span className="text-white/40">orchestra. / fcu</span>
                  </div>
                  <div className={`text-2xl font-sans font-bold text-white mb-3 ${isFlickering || isDetectingLocation ? "animate-pulse text-[var(--beam-gold)]" : ""}`}>
                    ${economicFloor.uncompensatedHourlyRate.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-white/50">/ hr (Uncompensated)</span>
                  </div>
                  <ul className="space-y-2 text-white/70 text-[11px] leading-relaxed">
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
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10 text-[10px] uppercase tracking-wider">
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
            <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {profileStatus === "baby" ? (
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      closeTelemetryModal();
                      openMaturingModal();
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-[var(--beam-gold)] px-6 py-3 font-semibold text-black hover:bg-[var(--beam-gold-bright)] transition tracking-wider uppercase text-[11px]"
                  >
                    <span>[+] MATURE THIS PROFILE</span>
                    <span className="text-black/60 text-[9px]">
                      (Add Name / Discipline / History to route to GROUNDS, ORCHESTRA, LAW)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("participants")}
                    className="text-[var(--beam-gold)] hover:underline text-[11px] uppercase tracking-wider"
                  >
                    Browse Participant Directory ↗
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-white/90">
                    <div className="flex items-center space-x-2">
                      <span className="text-[var(--beam-gold)] font-bold">✓ ACTIVE PROFILE:</span>
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
                      onClick={() => setActiveTab("participants")}
                      className="text-[var(--beam-gold)] hover:underline"
                    >
                      [Switch Profile]
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
        )}

        {/* TAB 2: ECOSYSTEM PARTICIPANT DIRECTORY */}
        {activeTab === "participants" && (
          <div className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-white">
                  BEAM Ecosystem Participant Directory
                </h3>
                <p className="text-xs text-white/60 font-sans">
                  Browse cross-site registered participants from <strong className="text-white">orchestra.beamthinktank.space</strong> and across the network. Select any profile to tether or test telemetry as that member.
                </p>
              </div>

              <input
                type="text"
                placeholder="Search name, email, instrument..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full sm:w-72 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs text-white placeholder-white/30 focus:border-[var(--beam-gold)] focus:outline-none"
              />
            </div>

            {isLoadingParticipants ? (
              <div className="py-12 text-center text-white/40 animate-pulse text-xs">
                Loading cross-site participant records from orchestra.beamthinktank.space...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredParticipants.map((p) => {
                  const isCurrentActive = userProfile?.email?.toLowerCase() === p.email.toLowerCase();

                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCurrentActive
                          ? "border-[var(--beam-gold)] bg-[rgba(214,183,122,0.08)] shadow-lg"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-white">{p.name}</h4>
                            {isCurrentActive && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--beam-gold)] text-black uppercase">
                                Active Profile
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--beam-gold)] font-mono">{p.email}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-mono border border-white/10 bg-white/5 text-white/70">
                          {p.subdomainSource.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-white/80 font-sans font-medium mb-1">{p.discipline}</p>
                      <p className="text-[11px] text-white/50 mb-3 line-clamp-2">{p.culturalCapitalNotes}</p>

                      {p.orchestraRecord && (
                        <div className="p-2.5 rounded-xl border border-white/10 bg-black/40 text-[10px] font-mono space-y-1 mb-3">
                          <div className="text-[var(--beam-gold)] font-semibold">
                            🎵 ORCHESTRA ROSTER RECORD
                          </div>
                          <div className="text-white/90">
                            {p.orchestraRecord.project}
                          </div>
                          <div className="text-white/60">
                            Instrument: <strong className="text-white">{p.orchestraRecord.instrument}</strong> | Status: <strong className="text-emerald-400">{p.orchestraRecord.status}</strong>
                          </div>
                          {p.uncompensatedRehearsalHours && (
                            <div className="text-amber-300 font-medium">
                              • {p.uncompensatedRehearsalHours} Uncompensated Rehearsal Hours (FCU Micro-Credit Eligible)
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
                        <span className="text-white/40">LOC: {p.location}</span>
                        {!isCurrentActive ? (
                          <button
                            type="button"
                            onClick={() => handleSelectParticipant(p)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--beam-gold)] text-black font-semibold hover:bg-[var(--beam-gold-bright)] transition uppercase tracking-wider"
                          >
                            [Select Profile as Mine]
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-bold">✓ Selected</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
