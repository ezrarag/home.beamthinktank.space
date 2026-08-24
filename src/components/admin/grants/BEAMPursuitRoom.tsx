"use client";

import React, { useEffect, useState } from "react";
import { BEAMRoleCombobox } from "@/components/admin/grants/BEAMRoleCombobox";
import {
  addFunderContactToPursuit,
  fetchBeamInstitutionalRoles,
  fetchPursuitActivityFeed,
} from "@/lib/beamGrantsService";
import { ROLE_MAP, unfilledRequiredSeats } from "@/lib/grants/grantRoles";
import type {
  ActivityLogEntry,
  BeamInstitutionalRole,
  BeamPursuit,
  BeamSubject,
  FiveGateStageId,
  FunderContact,
} from "@/types/grantConsole";

interface BEAMPursuitRoomProps {
  pursuit: BeamPursuit;
  subjects: BeamSubject[];
  onBackToRoster: () => void;
  onLoopIn: (participant: { name: string; email: string; roleLabel: string; roleId?: string }) => void;
  onReaim: (newSubject: BeamSubject) => void;
  onAdvanceGate: (gate: FiveGateStageId) => void;
}

const GATES: { id: FiveGateStageId; label: string; desc: string }[] = [
  { id: "open", label: "01 / Open", desc: "Sighted and mapped from Grants.gov or source desk" },
  { id: "research_qualify", label: "02 / Research & Qualify", desc: "Confirm legal eligibility, match, & partner alignment" },
  { id: "drafting", label: "03 / Drafting", desc: "Develop narrative, budget, work plan, & attachments" },
  { id: "submitted", label: "04 / Submitted", desc: "Routed for authorization and submitted before deadline" },
  { id: "decision", label: "05 / Decision", desc: "Award decision captured and post-award stewardship" },
];

export function BEAMPursuitRoom({
  pursuit,
  subjects,
  onBackToRoster,
  onLoopIn,
  onReaim,
  onAdvanceGate,
}: BEAMPursuitRoomProps) {
  const [activityFeed, setActivityFeed] = useState<ActivityLogEntry[]>([]);
  const [institutionalRoles, setInstitutionalRoles] = useState<BeamInstitutionalRole[]>([]);

  // Loop Someone In State
  const [isLoopingIn, setIsLoopingIn] = useState(false);
  const [loopName, setLoopName] = useState("");
  const [loopEmail, setLoopEmail] = useState("");
  const [loopRoleId, setLoopRoleId] = useState<string | undefined>();
  const [loopRoleLabel, setLoopRoleLabel] = useState("");
  const [loopRoleNote, setLoopRoleNote] = useState<string | undefined>();

  // Add Funder Contact State
  const [isAddingFunderContact, setIsAddingFunderContact] = useState(false);
  const [fcName, setFcName] = useState("");
  const [fcRoleTitle, setFcRoleTitle] = useState("Program Officer (PO)");
  const [fcOrgName, setFcOrgName] = useState(pursuit.agencyName || "");
  const [fcEmail, setFcEmail] = useState("");
  const [fcPhone, setFcPhone] = useState("");
  const [fcNotes, setFcNotes] = useState("");

  const [isReaiming, setIsReaiming] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const [logs, instRoles] = await Promise.all([
        fetchPursuitActivityFeed(pursuit.id),
        fetchBeamInstitutionalRoles(),
      ]);
      if (!cancelled) {
        setActivityFeed(logs);
        setInstitutionalRoles(instRoles);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [pursuit.id]);

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

  const handleLoopInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loopName.trim() || !loopRoleLabel.trim()) return;
    onLoopIn({
      name: loopName.trim(),
      email: loopEmail.trim() || `${loopName.toLowerCase().replace(/\s+/g, ".")}@beamthinktank.space`,
      roleLabel: loopRoleLabel.trim(),
      roleId: loopRoleId,
    });
    setLoopName("");
    setLoopEmail("");
    setLoopRoleId(undefined);
    setLoopRoleLabel("");
    setLoopRoleNote(undefined);
    setIsLoopingIn(false);
  };

  const handleAddFunderContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcName.trim() || !fcRoleTitle.trim()) return;

    const contactPayload: Omit<FunderContact, "id"> = {
      name: fcName.trim(),
      roleTitle: fcRoleTitle.trim(),
      organizationName: fcOrgName.trim() || pursuit.agencyName,
      email: fcEmail.trim() || undefined,
      phone: fcPhone.trim() || undefined,
      notes: fcNotes.trim() || undefined,
      lastContactDate: new Date().toISOString().slice(0, 10),
    };

    await addFunderContactToPursuit({
      pursuit,
      contact: contactPayload,
      actorName: "DeTania",
    });

    setFcName("");
    setFcRoleTitle("Program Officer (PO)");
    setFcEmail("");
    setFcPhone("");
    setFcNotes("");
    setIsAddingFunderContact(false);
  };

  const handleReaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSub = subjects.find((s) => s.id === selectedSubjectId);
    if (!targetSub) return;
    onReaim(targetSub);
    setIsReaiming(false);
  };

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
    <div className="w-full space-y-6 font-mono text-white">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#23221a] pb-4">
        <button
          type="button"
          onClick={onBackToRoster}
          className="text-xs uppercase tracking-widest text-[var(--beam-gold)] hover:text-white transition cursor-pointer"
        >
          ← Back to Pursuit Roster
        </button>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-[#6f685a]">STATUS:</span>
          <span className="rounded bg-[var(--beam-gold)]/10 px-2 py-0.5 font-bold uppercase text-[var(--beam-gold-bright)]">
            {pursuit.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Room Header Banner */}
      <div className="rounded-2xl border border-[#23221a] bg-[#0c0c08] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#181710] pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#5a5448]">
              PURSUIT ROOM · {pursuit.opportunityNumber} {isFederal ? "(FEDERAL)" : "(NON-FEDERAL)"}
            </span>
            <h2 className="font-serif text-2xl text-white font-normal mt-1">
              {pursuit.opportunityTitle}
            </h2>
            <a
              href={pursuit.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 text-xs text-[var(--beam-gold)] hover:underline mt-1"
            >
              <span>View Official NOFO Source ↗</span>
            </a>
          </div>

          {/* Bound Subject Card & Re-aim Trigger */}
          <div className="flex flex-col items-end gap-2 bg-[#12120a] p-3 rounded-xl border border-[var(--beam-gold)]/20">
            <span className="text-[9px] uppercase tracking-widest text-[#6f685a]">BOUND SUBJECT:</span>
            <span className="text-sm font-bold text-[var(--beam-gold-bright)]">
              {pursuit.subjectName}
            </span>
            <button
              type="button"
              onClick={() => setIsReaiming(true)}
              className="text-[10px] uppercase tracking-wider text-amber-300 hover:underline cursor-pointer"
            >
              [⚡ Re-Aim Pursuit]
            </button>
          </div>
        </div>

        {/* Unfilled Required Federal Gate Warning Line */}
        {unfilledSeats.length > 0 && (
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider text-amber-400">
              ⚠️ UNFILLED REQUIRED GATE SEATS:
            </span>
            <span>{unfilledSeats.map((s) => s.label).join(", ")}</span>
          </div>
        )}

        {/* 5-Gate Tracker Stage Ladder */}
        <div className="space-y-2 pt-2">
          <p className="text-[10px] uppercase tracking-widest text-[#5a5448]">5-GATE PIPELINE TRACKER</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {GATES.map((gate) => {
              const isCurrent = pursuit.currentGate === gate.id;
              const isComplete = pursuit.gateProgress[gate.id]?.status === "complete";

              return (
                <button
                  key={gate.id}
                  type="button"
                  onClick={() => onAdvanceGate(gate.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    isCurrent
                      ? "border-[var(--beam-gold)] bg-[rgba(214,183,122,0.12)] text-white"
                      : isComplete
                      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"
                      : "border-[#1e1e14] bg-white/[0.01] text-[#6f685a] hover:border-[#23221a]"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1">
                    {gate.label}
                  </div>
                  <div className="text-[9px] font-sans opacity-75">{gate.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Context Sources & Participants Column + Funder Contacts & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Participants & Sources */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attached Participants Section */}
          <div className="rounded-2xl border border-[#23221a] bg-[#0c0c08] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#181710] pb-3">
              <div>
                <h3 className="font-serif text-lg text-white">Pursuit Team &amp; Participant Roles</h3>
                <p className="text-xs text-[#6f685a] font-sans">
                  Sorted by tier (Hard Gates first). Linked back to the 48-role grant taxonomy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoopingIn(true)}
                className="rounded-full bg-[var(--beam-gold)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[var(--beam-gold-bright)] transition cursor-pointer"
              >
                + Loop Someone In
              </button>
            </div>

            {/* Loop Someone In Form Modal with Searchable Role Combobox */}
            {isLoopingIn && (
              <form onSubmit={handleLoopInSubmit} className="p-4 rounded-xl border border-[var(--beam-gold)]/40 bg-black/90 space-y-3">
                <p className="text-xs text-[var(--beam-gold)] font-bold uppercase tracking-wider">
                  Loop Team Member into Pursuit
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#a29885] mb-1">Member Name:</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name (e.g. DeTania)"
                      value={loopName}
                      onChange={(e) => setLoopName(e.target.value)}
                      className="w-full rounded bg-[#151515] border border-white/10 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#a29885] mb-1">Member Email:</label>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={loopEmail}
                      onChange={(e) => setLoopEmail(e.target.value)}
                      className="w-full rounded bg-[#151515] border border-white/10 p-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#a29885] mb-1">Assign Role (48-Role Searchable Library or Custom):</label>
                  <BEAMRoleCombobox
                    value={loopRoleLabel}
                    selectedRoleId={loopRoleId}
                    onChange={(roleId, roleLabel, roleNote) => {
                      setLoopRoleId(roleId);
                      setLoopRoleLabel(roleLabel);
                      setLoopRoleNote(roleNote);
                    }}
                    contextFlags={{
                      isFederal,
                      isHealth: pursuit.opportunityTitle.toLowerCase().includes("health"),
                      isArts: pursuit.opportunityTitle.toLowerCase().includes("arts") || pursuit.opportunityTitle.toLowerCase().includes("performance"),
                      isResearch: pursuit.opportunityTitle.toLowerCase().includes("research") || pursuit.opportunityTitle.toLowerCase().includes("endowment"),
                    }}
                  />
                </div>

                <div className="flex items-center space-x-2 text-xs pt-1">
                  <button
                    type="submit"
                    className="rounded bg-[var(--beam-gold)] px-3 py-1 text-black font-bold uppercase text-[10px]"
                  >
                    Assign &amp; Loop In
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLoopingIn(false)}
                    className="text-[#6f685a] text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {sortedParticipants.map((p) => {
                const roleDef = p.roleId ? ROLE_MAP[p.roleId] : undefined;

                return (
                  <div
                    key={p.userId}
                    className="p-3.5 rounded-xl border border-[#181710] bg-white/[0.02] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-sm">{p.name}</p>
                      <span className={`px-2 py-0.5 rounded text-[8.5px] uppercase font-mono border ${getTierChipClass(p.roleId)}`}>
                        {roleDef ? roleDef.tier.replace("_", " ") : "custom"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--beam-gold)]">{p.email}</p>
                    <p className="text-[11px] text-[#f0ead6] font-mono font-medium">{p.roleLabel}</p>
                    {roleDef?.note && (
                      <p className="text-[9.5px] text-amber-200 font-sans leading-relaxed pt-1 border-t border-white/5">
                        ⚠️ {roleDef.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Context Sources Section */}
          <div className="rounded-2xl border border-[#23221a] bg-[#0c0c08] p-5 space-y-4">
            <h3 className="font-serif text-lg text-white border-b border-[#181710] pb-3">
              Context Sources Attached to Pursuit ({pursuit.pursuitContextSources.length})
            </h3>
            {pursuit.pursuitContextSources.length === 0 ? (
              <p className="text-xs text-[#6f685a]">No context sources attached directly to pursuit yet.</p>
            ) : (
              <div className="divide-y divide-[#181710] text-xs">
                {pursuit.pursuitContextSources.map((source) => (
                  <div key={source.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-[#f0ead6] font-medium">{source.name}</span>
                    <span className="text-[10px] text-[#6f685a]">{source.shortDescription}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Funder Contacts & Activity Feed */}
        <div className="space-y-6">
          {/* Funder Contacts (Tracked, Not Staffed) */}
          <div className="rounded-2xl border border-[#23221a] bg-[#0c0c08] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#181710] pb-3">
              <div>
                <h3 className="font-serif text-lg text-white">Funder Contacts</h3>
                <p className="text-xs text-[#6f685a] font-sans">
                  Tracked program officer &amp; trustee relationships.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingFunderContact(true)}
                className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200 hover:bg-amber-400 hover:text-black transition cursor-pointer"
              >
                + Track Contact
              </button>
            </div>

            {/* Add Funder Contact Form */}
            {isAddingFunderContact && (
              <form onSubmit={handleAddFunderContactSubmit} className="p-3 rounded-xl border border-amber-500/40 bg-black/90 space-y-2 text-xs">
                <p className="text-[10px] uppercase font-bold text-amber-300">Track External Funder Contact</p>
                <input
                  type="text"
                  required
                  placeholder="Contact Name (e.g. Dr. Sarah Jenkins)"
                  value={fcName}
                  onChange={(e) => setFcName(e.target.value)}
                  className="w-full rounded bg-[#151515] border border-white/10 p-2 text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Role Title (e.g. Program Officer)"
                  value={fcRoleTitle}
                  onChange={(e) => setFcRoleTitle(e.target.value)}
                  className="w-full rounded bg-[#151515] border border-white/10 p-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Organization (e.g. MCW Endowment)"
                  value={fcOrgName}
                  onChange={(e) => setFcOrgName(e.target.value)}
                  className="w-full rounded bg-[#151515] border border-white/10 p-2 text-white"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={fcEmail}
                  onChange={(e) => setFcEmail(e.target.value)}
                  className="w-full rounded bg-[#151515] border border-white/10 p-2 text-white"
                />
                <textarea
                  rows={2}
                  placeholder="Relationship notes or last conversation..."
                  value={fcNotes}
                  onChange={(e) => setFcNotes(e.target.value)}
                  className="w-full rounded bg-[#151515] border border-white/10 p-2 text-white"
                />
                <div className="flex items-center space-x-2 text-xs pt-1">
                  <button
                    type="submit"
                    className="rounded bg-amber-400 px-3 py-1 text-black font-bold uppercase text-[10px]"
                  >
                    Save Funder Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingFunderContact(false)}
                    className="text-[#6f685a] text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* List of Funder Contacts */}
            {(!pursuit.funderContacts || pursuit.funderContacts.length === 0) ? (
              <p className="text-xs text-[#6f685a]">No funder contacts recorded yet.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {pursuit.funderContacts.map((fc) => (
                  <div key={fc.id} className="p-3 rounded-xl border border-[#181710] bg-white/[0.015] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-amber-300">
                      <span className="font-bold">{fc.name}</span>
                      <span className="text-[#6f685a]">{fc.lastContactDate}</span>
                    </div>
                    <p className="text-white font-medium text-[11px]">{fc.roleTitle} · {fc.organizationName}</p>
                    {fc.email && <p className="text-[10px] text-[var(--beam-gold)]">{fc.email}</p>}
                    {fc.notes && <p className="text-[10px] text-[#6f685a] font-sans italic">{fc.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subcollection Activity Feed */}
          <div className="rounded-2xl border border-[#23221a] bg-[#0c0c08] p-5 space-y-4">
            <h3 className="font-serif text-lg text-white border-b border-[#181710] pb-3">
              Subcollection Activity Feed
            </h3>

            <div className="space-y-3 text-xs">
              {activityFeed.map((log) => (
                <div key={log.id} className="p-3 rounded-xl border border-[#181710] bg-white/[0.015] space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)]">
                    <span className="font-bold">{log.actorName}</span>
                    <span className="text-[#5a5448]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[#f0ead6] text-[11px] font-sans leading-relaxed">{log.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Re-aim Modal Overlay */}
      {isReaiming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-amber-500/40 bg-[#0c0c08] p-6 space-y-4 shadow-2xl">
            <div className="border-b border-[#23221a] pb-3">
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                ⚡ RE-AIM PURSUIT (FIRST-CLASS FORK MODEL)
              </span>
              <h3 className="font-serif text-xl text-white mt-1">Re-aim {pursuit.opportunityNumber} to New Subject</h3>
              <p className="text-xs text-[#6f685a] font-sans mt-1">
                Forks a new Pursuit for the new Subject while preserving opportunity-level NOFO research ({pursuit.opportunityTitle}).
              </p>
            </div>

            <form onSubmit={handleReaimSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#a29885] mb-2">Select Target Subject:</label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded bg-[#151515] border border-white/10 p-3 text-white focus:outline-none"
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects
                    .filter((s) => s.id !== pursuit.subjectId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReaiming(false)}
                  className="text-[#6f685a] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-[var(--beam-gold)] px-4 py-2 text-black font-bold uppercase text-[10px]"
                >
                  Fork &amp; Re-Aim Pursuit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
