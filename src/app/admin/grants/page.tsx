"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { BEAMGrantsConsole } from "@/components/admin/grants/BEAMGrantsConsole";
import { BEAMPursuitRoster } from "@/components/admin/grants/BEAMPursuitRoster";
import { BEAMPursuitRoom } from "@/components/admin/grants/BEAMPursuitRoom";
import { BEAMInstitutionalRolesSection } from "@/components/admin/grants/BEAMInstitutionalRolesSection";
import {
  fetchBeamOpportunities,
  fetchBeamPursuits,
  loopSomeoneInToPursuit,
  REAL_PRODUCTION_SUBJECTS,
  reaimPursuitToNewSubject,
  seedOpportunityOnDiscovery,
} from "@/lib/beamGrantsService";
import type {
  BeamOpportunity,
  BeamPursuit,
  BeamSubject,
  ConsoleStateMode,
  ContextSource,
  FiveGateStageId,
} from "@/types/grantConsole";

export default function AdminGrantsPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Data Stores
  const [opportunities, setOpportunities] = useState<BeamOpportunity[]>([]);
  const [pursuits, setPursuits] = useState<BeamPursuit[]>([]);
  const [subjects] = useState<BeamSubject[]>(REAL_PRODUCTION_SUBJECTS);

  // State Machine Mode: "state_a_landing" (Default: Console full height alone)
  const [stateMode, setStateMode] = useState<ConsoleStateMode>("state_a_landing");
  const [activePursuitId, setActivePursuitId] = useState<string | null>(null);

  const [consoleSources, setConsoleSources] = useState<ContextSource[]>([
    {
      id: "src-nofo-ahw-008",
      type: "nofo",
      name: "AHW_MCW_Pilot_RFP.pdf",
      shortDescription: "Up to $50,000 · seed grant for pilot projects",
      status: "ready",
      pageCount: 18,
      attachedAt: "2026-05-16T12:00:00Z",
    },
  ]);

  const [message, setMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (user) => {
        setIsSignedIn(Boolean(user));
        setUserEmail(user?.email ?? null);
      });
    } catch {
      setIsSignedIn(false);
      return undefined;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const [oppsData, pursuitsData] = await Promise.all([
        fetchBeamOpportunities(),
        fetchBeamPursuits(),
      ]);
      if (!cancelled) {
        setOpportunities(oppsData);
        setPursuits(pursuitsData);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGoogleSignIn() {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      try {
        await signInWithPopup(getFirebaseAuth(), provider);
      } catch (popupError) {
        const code =
          typeof popupError === "object" && popupError && "code" in popupError
            ? String((popupError as { code?: string }).code)
            : "";
        if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
          await signInWithRedirect(getFirebaseAuth(), provider);
        } else {
          throw popupError;
        }
      }
    } catch (signInError) {
      setAuthError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
    }
  }

  // Live Grants.gov / Console Query Execution
  async function handleConsoleCommand(cmdInput: string) {
    setSearchError(null);
    setMessage(null);

    const trimmed = cmdInput.trim();
    let keyword = trimmed;

    if (trimmed.startsWith("/")) {
      const parts = trimmed.split(" ");
      keyword = parts.slice(1).join(" ");
    }

    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken(true);
      if (!token) throw new Error("Sign in to search official sources.");

      const res = await fetch("/api/admin/grants/opportunities", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "search", keyword }),
      });

      const payload = (await res.json()) as { error?: string; results?: BeamOpportunity[] };
      if (!res.ok) throw new Error(payload.error || "Official query failed.");

      const newOpps = payload.results ?? [];
      if (newOpps.length > 0) {
        await Promise.all(newOpps.map((opp) => seedOpportunityOnDiscovery(opp)));
        setOpportunities((prev) => {
          const ids = new Set(prev.map((o) => o.id));
          return [...prev, ...newOpps.filter((o) => !ids.has(o.id))];
        });
        setMessage(`Live Grants.gov search returned ${newOpps.length} opportunities seeded into Firestore.`);
      } else {
        setMessage(`Query completed. No new federal opportunities matched "${keyword}".`);
      }
      setStateMode("state_b_roster");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Query execution failed.");
    }
  }

  const handleAttachClick = () => {
    const dummyNewSource: ContextSource = {
      id: `src-attached-${Date.now()}`,
      type: "file",
      name: "water-sensor-grant-brief.pdf",
      shortDescription: "24 pp · attached via console",
      status: "ready",
      attachedAt: new Date().toISOString(),
    };
    setConsoleSources((prev) => [...prev, dummyNewSource]);
    setMessage("Attached new context source to console session.");
  };

  const handleOpenRoom = (pursuitId: string) => {
    setActivePursuitId(pursuitId);
    setStateMode("state_c_room");
  };

  const handleStartPursuitFromOpp = (oppId: string) => {
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp) return;

    const defaultSubject = subjects[0]!;
    const now = new Date().toISOString();
    const newPursuitId = `pursuit-${opp.sourceId}-${defaultSubject.id.replace(/^subject-/, "")}`;

    const newPursuit: BeamPursuit = {
      id: newPursuitId,
      opportunityId: opp.id,
      opportunityNumber: opp.opportunityNumber,
      opportunityTitle: opp.title,
      agencyName: opp.agencyName,
      sourceUrl: opp.sourceUrl,

      subjectId: defaultSubject.id,
      subjectName: defaultSubject.name,
      subjectType: defaultSubject.type,

      currentGate: "open",
      gateProgress: {
        open: { status: "active", updatedAt: now },
        research_qualify: { status: "idle" },
        drafting: { status: "idle" },
        submitted: { status: "idle" },
        decision: { status: "idle" },
      },

      decision: "watch",
      fitScore: 75,
      strategicFit: 4,
      eligibilityConfidence: 4,
      relationshipStrength: 2,
      effortLevel: 3,
      rationale: `Pursuit initialized from console search for ${defaultSubject.name}.`,

      targetUsd: opp.awardCeiling || 50000,
      raisedUsd: 0,
      deadlineDate: opp.closeDate || "2026-11-02",
      isFederal: opp.externalSource === "grants.gov",

      participants: [
        {
          userId: "user-detania",
          name: "DeTania",
          email: userEmail || "detania@beamcenter.org",
          roleId: "grants_lead_manager",
          roleLabel: "Grants Lead",
          assignedAt: now,
        },
      ],
      pursuitContextSources: [...opp.opportunityContextSources],
      latestActivityPull: `Initialized pursuit bound to ${defaultSubject.name} (DeTania)`,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    setPursuits((prev) => [newPursuit, ...prev]);
    setActivePursuitId(newPursuit.id);
    setStateMode("state_c_room");
    setMessage(`Started active pursuit for ${opp.opportunityNumber} bound to ${defaultSubject.name}.`);
  };

  const handleLoopSomeoneIn = async (participant: { name: string; email: string; roleLabel: string; roleId?: string }) => {
    const currentPursuit = pursuits.find((p) => p.id === activePursuitId);
    if (!currentPursuit) return;

    const actorName = userEmail?.split("@")[0] || "DeTania";
    const fullPart = {
      userId: `user-${participant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: participant.name,
      email: participant.email,
      roleId: participant.roleId,
      roleLabel: participant.roleLabel,
    };

    const updated = await loopSomeoneInToPursuit({
      pursuit: currentPursuit,
      participant: fullPart,
      actorName,
    });

    setPursuits((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setMessage(`Looped in ${participant.name} as ${participant.roleLabel}.`);
  };

  const handleReaimPursuit = async (newSubject: BeamSubject) => {
    const currentPursuit = pursuits.find((p) => p.id === activePursuitId);
    if (!currentPursuit) return;

    const actorName = userEmail?.split("@")[0] || "DeTania";
    const { oldPursuit, newPursuit } = await reaimPursuitToNewSubject({
      pursuit: currentPursuit,
      newSubject,
      actorName,
    });

    setPursuits((prev) => [newPursuit, ...prev.map((p) => (p.id === oldPursuit.id ? oldPursuit : p))]);
    setActivePursuitId(newPursuit.id);
    setMessage(`Re-aimed pursuit to ${newSubject.name}. Forked new pursuit inheriting NOFO research.`);
  };

  const handleAdvanceGate = (gate: FiveGateStageId) => {
    const currentPursuit = pursuits.find((p) => p.id === activePursuitId);
    if (!currentPursuit) return;

    const now = new Date().toISOString();
    const actorName = userEmail?.split("@")[0] || "DeTania";
    const updated: BeamPursuit = {
      ...currentPursuit,
      currentGate: gate,
      gateProgress: {
        ...currentPursuit.gateProgress,
        [gate]: { status: "active", updatedAt: now },
      },
      latestActivityPull: `Advanced gate to ${gate.toUpperCase()} (${actorName})`,
      updatedAt: now,
    };

    setPursuits((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setMessage(`Advanced gate to ${gate.toUpperCase()}.`);
  };

  if (!isSignedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050505] px-6 text-white font-mono">
        <section className="max-w-xl rounded-3xl border border-[#23221a] bg-[#0c0c08] p-10 text-center shadow-2xl space-y-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--beam-gold)] font-bold">
            BEAM Internal / Grants Console
          </p>
          <h1 className="font-serif font-normal text-4xl text-[#f0ead6]">
            Give it the source.<br />
            <span className="text-[#c8b97a]">Get back a plan.</span>
          </h1>
          <p className="text-xs leading-relaxed text-[#6f685a] font-sans">
            Sign in with an active BEAM admin account to search live sources, qualify opportunities, and run the pursuit roster.
          </p>
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            className="rounded-full bg-[var(--beam-gold)] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[var(--beam-gold-bright)] transition cursor-pointer"
          >
            Continue with Google Admin
          </button>
          {authError && <p className="text-xs text-red-400 mt-2">{authError}</p>}
        </section>
      </main>
    );
  }

  const activePursuitsCount = pursuits.filter((p) => p.status === "active").length;
  const activePursuit = pursuits.find((p) => p.id === activePursuitId);
  const presencePullText = pursuits[0]?.latestActivityPull || "DeTania opened AHW 20m ago";

  return (
    <main className="min-h-screen bg-[#080808] text-white font-mono">
      {/* Persistent Group 3 Console at Top */}
      <BEAMGrantsConsole
        signedInUser={{ name: userEmail?.split("@")[0] || "DeTania", title: "Research Co-Lead" }}
        contextSources={consoleSources}
        activePursuitsCount={activePursuitsCount}
        peopleWorkingCount={2}
        presencePullText={presencePullText}
        onCommandSubmit={(cmd) => void handleConsoleCommand(cmd)}
        onAttachClick={handleAttachClick}
        isCollapsed={stateMode !== "state_a_landing"}
        onSummonRoster={() => setStateMode("state_b_roster")}
        onReturnToLanding={() => setStateMode("state_a_landing")}
      />

      {/* STATE A: Console Landing Only */}
      {stateMode === "state_a_landing" && (
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8 text-center text-[10px] text-[#3a3428] uppercase tracking-widest">
          {message && <p className="text-emerald-400 font-mono mb-2">{message}</p>}
        </div>
      )}

      {/* STATE B or STATE C: Roster / Room / Institutional Roles */}
      {stateMode !== "state_a_landing" && (
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 space-y-6">
          {/* Status Messages */}
          {searchError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              {searchError}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              {message}
            </div>
          )}

          {/* Navigation Bar */}
          <div className="flex items-center justify-between border-b border-[#1c1c14] pb-4">
            <div className="flex items-center space-x-3 text-xs">
              <button
                type="button"
                onClick={() => setStateMode("state_b_roster")}
                className={`px-4 py-2 rounded-full uppercase tracking-wider transition ${
                  stateMode === "state_b_roster"
                    ? "bg-[var(--beam-gold)] text-black font-bold"
                    : "border border-white/10 text-white/60 hover:text-white"
                }`}
              >
                👥 Pursuit Roster ({activePursuitsCount})
              </button>
              {activePursuit && (
                <button
                  type="button"
                  onClick={() => setStateMode("state_c_room")}
                  className={`px-4 py-2 rounded-full uppercase tracking-wider transition ${
                    stateMode === "state_c_room"
                      ? "bg-[var(--beam-gold)] text-black font-bold"
                      : "border border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  🚪 Pursuit Room ({activePursuit.opportunityNumber})
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-[#5a5448]">
              <button
                type="button"
                onClick={() => setStateMode("state_a_landing")}
                className="hover:text-white transition cursor-pointer"
              >
                Console Landing (Esc) ↑
              </button>
              <span>·</span>
              <Link href="/admin" className="hover:text-white transition">
                Admin Portal
              </Link>
              <span>·</span>
              <button
                type="button"
                onClick={() => void signOut(getFirebaseAuth())}
                className="hover:text-red-400 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Roster View + Institutional Roles Section */}
          {stateMode === "state_b_roster" && (
            <div className="space-y-8">
              <BEAMPursuitRoster
                pursuits={pursuits}
                mappedOpportunities={opportunities}
                onOpenRoom={handleOpenRoom}
                onStartPursuit={handleStartPursuitFromOpp}
              />
              <BEAMInstitutionalRolesSection />
            </div>
          )}

          {/* Room View */}
          {stateMode === "state_c_room" && activePursuit && (
            <BEAMPursuitRoom
              pursuit={activePursuit}
              subjects={subjects}
              onBackToRoster={() => setStateMode("state_b_roster")}
              onLoopIn={(p) => void handleLoopSomeoneIn(p)}
              onReaim={(newSub) => void handleReaimPursuit(newSub)}
              onAdvanceGate={(gate) => handleAdvanceGate(gate)}
            />
          )}
        </div>
      )}
    </main>
  );
}
