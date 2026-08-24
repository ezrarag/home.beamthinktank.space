"use client";

import React, { useEffect, useState } from "react";
import { fetchBeamInstitutionalRoles } from "@/lib/beamGrantsService";
import { ROLE_MAP, unfilledRequiredSeats } from "@/lib/grants/grantRoles";
import type { BeamInstitutionalRole, BeamOpportunity, BeamPursuit } from "@/types/grantConsole";

interface BEAMPursuitRosterProps {
  pursuits: BeamPursuit[];
  mappedOpportunities: BeamOpportunity[];
  onOpenRoom: (pursuitId: string) => void;
  onStartPursuit: (oppId: string) => void;
}

const GATE_LABELS: Record<string, string> = {
  open: "01 / Open",
  research_qualify: "02 / Research & Qualify",
  drafting: "03 / Drafting",
  submitted: "04 / Submitted",
  decision: "05 / Decision",
};

export function BEAMPursuitRoster({
  pursuits,
  mappedOpportunities,
  onOpenRoom,
  onStartPursuit,
}: BEAMPursuitRosterProps) {
  const [institutionalRoles, setInstitutionalRoles] = useState<BeamInstitutionalRole[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      const data = await fetchBeamInstitutionalRoles();
      if (!cancelled) setInstitutionalRoles(data);
    }
    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  const activePursuits = pursuits.filter((p) => p.status === "active");
  const reaimedOrClosedPursuits = pursuits.filter((p) => p.status !== "active");

  const unpursuedOpportunities = mappedOpportunities.filter(
    (opp) => !pursuits.some((p) => p.opportunityId === opp.id && p.status === "active")
  );

  const getTierChipClass = (roleId?: string) => {
    const tier = roleId && ROLE_MAP[roleId] ? ROLE_MAP[roleId]!.tier : "development";
    switch (tier) {
      case "hard_gate":
        return "border-red-400/40 bg-red-400/10 text-red-200 font-bold";
      case "signoff_gate":
        return "border-amber-400/40 bg-amber-400/10 text-amber-200";
      case "development":
        return "border-[var(--beam-gold)]/40 bg-[var(--beam-gold)]/10 text-[var(--beam-gold-bright)]";
      case "stewardship":
        return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
      default:
        return "border-white/10 bg-white/5 text-white/60";
    }
  };

  return (
    <div className="w-full space-y-8 font-mono">
      {/* 1. Active Pursuits Roster Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#23221a] pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--beam-gold)] font-bold">
              PORTFOLIO / ACTIVE PURSUITS
            </p>
            <h2 className="font-serif text-2xl text-white font-normal mt-1">
              BEAM Pursuit Roster ({activePursuits.length})
            </h2>
          </div>
          <span className="text-xs text-[#6f685a]">
            Every pursuit binds 1 opportunity to 1 subject with a named team and gate.
          </span>
        </div>

        {activePursuits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#23221a] p-8 text-center text-xs text-[#6f685a]">
            No active pursuits currently running. Use the console above or select a mapped opportunity.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activePursuits.map((pursuit) => {
              const isFederal = pursuit.isFederal ?? pursuit.sourceUrl.includes("grants.gov");
              const unfilledSeats = isFederal
                ? unfilledRequiredSeats(pursuit.participants, institutionalRoles)
                : [];

              // Sort participants with hard_gate roles first
              const sortedParticipants = [...pursuit.participants].sort((a, b) => {
                const tierA = a.roleId && ROLE_MAP[a.roleId] ? ROLE_MAP[a.roleId]!.tier : "development";
                const tierB = b.roleId && ROLE_MAP[b.roleId] ? ROLE_MAP[b.roleId]!.tier : "development";
                if (tierA === "hard_gate" && tierB !== "hard_gate") return -1;
                if (tierB === "hard_gate" && tierA !== "hard_gate") return 1;
                return 0;
              });

              return (
                <article
                  key={pursuit.id}
                  className="group relative rounded-2xl border border-[#23221a] bg-[#0c0c08] p-5 sm:p-6 transition-all hover:border-[var(--beam-gold)]/50 hover:bg-[#10100a]"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#181710] pb-4">
                    <div>
                      <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider text-[var(--beam-gold)]">
                        <span>GATE: {GATE_LABELS[pursuit.currentGate]}</span>
                        <span>·</span>
                        <span>FIT SCORE: {pursuit.fitScore}/100</span>
                        <span>·</span>
                        <span className="text-white/60">{pursuit.agencyName}</span>
                      </div>
                      <h3 className="font-serif text-xl font-normal text-white mt-1 group-hover:text-[var(--beam-gold-bright)] transition">
                        {pursuit.opportunityTitle}
                      </h3>
                      <p className="text-xs text-[#6f685a] font-mono mt-1">
                        NOFO: <strong className="text-white">{pursuit.opportunityNumber}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="rounded-full border border-[var(--beam-gold)]/30 bg-[rgba(214,183,122,0.08)] px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--beam-gold-bright)] font-bold">
                        SUBJECT: {pursuit.subjectName} ({pursuit.subjectType.toUpperCase()})
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenRoom(pursuit.id)}
                        className="rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--beam-gold-bright)] transition uppercase tracking-wider cursor-pointer"
                      >
                        Open Pursuit Room ↗
                      </button>
                    </div>
                  </div>

                  {/* Attached Participants & Tier Chips (Hard Gate sorted first) */}
                  <div className="py-4 border-b border-[#181710] flex flex-wrap items-center gap-4 text-xs">
                    <span className="text-[10px] uppercase tracking-widest text-[#5a5448]">TEAM ROLES:</span>
                    <div className="flex flex-wrap gap-2">
                      {sortedParticipants.map((p) => (
                        <span
                          key={p.userId}
                          className={`inline-flex items-center space-x-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${getTierChipClass(p.roleId)}`}
                        >
                          <span className="font-bold">{p.name}</span>
                          <span className="opacity-80">({p.roleLabel})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Unfilled Federal Required Gate Warning Line */}
                  {unfilledSeats.length > 0 && (
                    <div className="py-2 text-[10px] text-amber-200 border-b border-[#181710] flex items-center space-x-2 font-mono">
                      <span className="font-bold uppercase tracking-wider text-amber-400">
                        ⚠️ UNFILLED REQUIRED GATES:
                      </span>
                      <span>{unfilledSeats.map((s) => s.label).join(", ")}</span>
                    </div>
                  )}

                  {/* Activity Pull & Financial Target Bar */}
                  <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2 text-[11px] text-[#8a8070] italic">
                      <span className="text-[var(--beam-gold)] font-mono not-italic">LATEST ACTIVITY:</span>
                      <span>{pursuit.latestActivityPull}</span>
                    </div>

                    <div className="flex items-center space-x-4 text-[10px] text-[#6f685a] uppercase font-mono">
                      <span>
                        TARGET: ${pursuit.targetUsd.toLocaleString()} USD
                      </span>
                      <span>·</span>
                      <span>DUE: {pursuit.deadlineDate}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Mapped-but-Unpursued Opportunities */}
      <section className="space-y-3 pt-4 border-t border-[#23221a]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f685a]">
              UNPURSUED OPPORTUNITIES
            </p>
            <h3 className="font-serif text-lg text-white font-normal">
              Mapped Opportunities Awaiting Subject Pursuit ({unpursuedOpportunities.length})
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {unpursuedOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="p-4 rounded-xl border border-[#1e1e14] bg-white/[0.015] hover:border-[#23221a] transition text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] text-[var(--beam-gold)] uppercase font-bold">
                    {opp.agencyName || opp.agencyCode}
                  </span>
                  <h4 className="font-medium text-white text-sm mt-0.5">{opp.title}</h4>
                  <p className="text-[10px] text-[#6f685a] font-mono">{opp.opportunityNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onStartPursuit(opp.id)}
                  className="shrink-0 rounded-lg border border-[var(--beam-gold)]/40 bg-[var(--beam-gold)]/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--beam-gold-bright)] hover:bg-[var(--beam-gold)] hover:text-black transition font-bold cursor-pointer"
                >
                  [+ Start Pursuit]
                </button>
              </div>
              <p className="text-[11px] text-[#6f685a] line-clamp-2">{opp.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Re-aimed & Reusable Historical Pursuits */}
      {reaimedOrClosedPursuits.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-[#23221a]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5448]">
            HISTORICAL &amp; RE-AIMED ASSETS ({reaimedOrClosedPursuits.length})
          </p>
          <div className="divide-y divide-[#181710] text-xs">
            {reaimedOrClosedPursuits.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-[#6f685a]">
                <span>
                  {p.opportunityTitle} ({p.opportunityNumber}) · Re-aimed from {p.subjectName}
                </span>
                <span className="text-[10px] uppercase font-mono text-[#5a5448]">
                  Research &amp; NOFO Preserved
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
