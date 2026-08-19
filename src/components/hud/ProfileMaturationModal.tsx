"use client";

import { useState, useEffect } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";
import type { OrchestraCrossSiteRecord } from "@/types/telemetry";

const SANDBOX_EZRA_PROFILE = {
  name: "Ezra Haugabrooks",
  email: "ezra.haugabrooks@gmail.com",
  discipline: "Viola Performance / Orchestra Member",
  educationHistory: "Black Diaspora Symphony Orchestra (2025 Concert Member)",
  culturalCapitalNotes: "Confirmed Violist for Black Diaspora Symphony Orchestra annual concert performance. Uncompensated rehearsal hours & musical labor.",
  orchestraRecord: {
    project: "Black Diaspora Symphony Orchestra - 2025 Annual Concert",
    instrument: "Viola",
    status: "Confirmed",
    headshotUrl: "https://link.storjshare.io/raw/jv56mcbz6f3ebhsnssa5tqlncpfa/orchestabeam/Images%2FBlack%20Diaspora%20Symphony%2F2025%20Annual%20Concert%2FMusican%20photos/IMG_9498.jpg",
    notes: "Violist first year playing with Black Diaspora Symphony Orchestra."
  } satisfies OrchestraCrossSiteRecord,
};

export function ProfileMaturationModal() {
  const {
    isMaturingModalOpen,
    closeMaturingModal,
    userProfile,
    matureProfile,
  } = useTelemetryStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [educationHistory, setEducationHistory] = useState("");
  const [culturalCapitalNotes, setCulturalCapitalNotes] = useState("");
  const [orchestraRecord, setOrchestraRecord] = useState<OrchestraCrossSiteRecord | undefined>(undefined);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setEmail(userProfile.email || "");
      setDiscipline(userProfile.discipline || "");
      setEducationHistory(userProfile.educationHistory || "");
      setCulturalCapitalNotes(userProfile.culturalCapitalNotes || "");
      setOrchestraRecord(userProfile.orchestraRecord);
    }
  }, [userProfile]);

  if (!isMaturingModalOpen) return null;

  const handleLoadEzraPreset = () => {
    setName(SANDBOX_EZRA_PROFILE.name);
    setEmail(SANDBOX_EZRA_PROFILE.email);
    setDiscipline(SANDBOX_EZRA_PROFILE.discipline);
    setEducationHistory(SANDBOX_EZRA_PROFILE.educationHistory);
    setCulturalCapitalNotes(SANDBOX_EZRA_PROFILE.culturalCapitalNotes);
    setOrchestraRecord(SANDBOX_EZRA_PROFILE.orchestraRecord);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !discipline.trim() || !educationHistory.trim()) return;

    matureProfile({
      name: name.trim(),
      email: email.trim() || undefined,
      discipline: discipline.trim(),
      educationHistory: educationHistory.trim(),
      culturalCapitalNotes: culturalCapitalNotes.trim(),
      orchestraRecord: email.trim().toLowerCase() === "ezra.haugabrooks@gmail.com" ? (orchestraRecord || SANDBOX_EZRA_PROFILE.orchestraRecord) : orchestraRecord,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[color:var(--beam-gold)]/40 bg-[#0c0d0c] text-white shadow-2xl font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--beam-gold)]">
              CROSS-SITE PROFILE MATURATION PIPELINE
            </span>
            <h2 className="font-serif text-xl font-bold text-white">
              Mature Zero-Knowledge Record
            </h2>
          </div>
          <button
            type="button"
            onClick={closeMaturingModal}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Quick Sandbox Preset Banner */}
        <div className="bg-[rgba(214,183,122,0.08)] border-b border-[color:var(--beam-gold)]/20 px-6 py-3 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="text-white/90">
            <span className="text-[var(--beam-gold)] font-semibold">⚡ CROSS-SITE SANDBOX:</span> Tether record with Orchestra account
          </div>
          <button
            type="button"
            onClick={handleLoadEzraPreset}
            className="rounded-lg bg-[var(--beam-gold)]/20 border border-[var(--beam-gold)]/40 px-3 py-1 text-[11px] text-[var(--beam-gold-bright)] hover:bg-[var(--beam-gold)] hover:text-black transition uppercase font-semibold tracking-wider"
          >
            Load ezra.haugabrooks@gmail.com ↗
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-white/70 leading-relaxed font-mono">
            Layer identity and domain-specific labor onto your zero-knowledge baseline. Tethering your email aggregates performance records from <strong className="text-white">orchestra.beamthinktank.space</strong> directly into the BEAM master HUD.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--beam-gold)] mb-1.5">
                Full Name / Identifier *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ezra Haugabrooks"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[var(--beam-gold)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--beam-gold)] mb-1.5">
                Google / SSO Email (Cross-Site Key)
              </label>
              <input
                type="email"
                placeholder="e.g. ezra.haugabrooks@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[var(--beam-gold)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--beam-gold)] mb-1.5">
                Discipline / Specialty *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Viola Performance / Urban Planning"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[var(--beam-gold)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--beam-gold)] mb-1.5">
                Education &amp; History *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BDSO Concert Member / UWM Graduate"
                value={educationHistory}
                onChange={(e) => setEducationHistory(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[var(--beam-gold)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--beam-gold)] mb-1.5">
              Uncompensated Cultural Capital &amp; Labor Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Classical music trajectory, uncompensated rehearsal hours, local commons advocacy..."
              value={culturalCapitalNotes}
              onChange={(e) => setCulturalCapitalNotes(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[var(--beam-gold)] focus:outline-none"
            />
          </div>

          {/* Orchestra Cross-Site Tether Preview */}
          {orchestraRecord && (
            <div className="rounded-xl border border-[color:var(--beam-gold)]/40 bg-[rgba(214,183,122,0.06)] p-3 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)] uppercase tracking-widest font-semibold">
                <span>ORCHESTRA.BEAMTHINKTANK.SPACE TETHERED PROFILE</span>
                <span className="text-emerald-400">✓ LINKED</span>
              </div>
              <p className="text-white font-medium">{orchestraRecord.project}</p>
              <p className="text-white/70 text-[11px]">
                Instrument: <strong className="text-white">{orchestraRecord.instrument}</strong> | Status: <strong className="text-white">{orchestraRecord.status}</strong>
              </p>
            </div>
          )}

          {/* Division Bridges Preview */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 block">
              AUTOMATIC MULTI-SUBDOMAIN CROSS-SITE ROUTING BRIDGES
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded border border-white/5 bg-white/5 text-white/80">
                <span className="text-[var(--beam-gold)] block">GROUNDS</span>
                Rehearsal Isochrone
              </div>
              <div className="p-2 rounded border border-white/5 bg-white/5 text-white/80">
                <span className="text-[var(--beam-gold)] block">ORCHESTRA</span>
                BDSO Musician Roster
              </div>
              <div className="p-2 rounded border border-white/5 bg-white/5 text-white/80">
                <span className="text-[var(--beam-gold)] block">LAW</span>
                Performer Easement Codes
              </div>
              <div className="p-2 rounded border border-white/5 bg-white/5 text-white/80">
                <span className="text-[var(--beam-gold)] block">BEAM FCU</span>
                Rehearsal Micro-Credit
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-1">
            <button
              type="button"
              onClick={closeMaturingModal}
              className="rounded-xl border border-white/15 px-5 py-2 text-xs uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--beam-gold)] px-6 py-2 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[var(--beam-gold-bright)] transition"
            >
              Authenticate &amp; Tether Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
