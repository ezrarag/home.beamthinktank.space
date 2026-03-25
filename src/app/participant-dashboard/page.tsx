"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseApp, getFirebaseDb } from "@/lib/firebaseClient";
import type { BeamHandoffRecord } from "@/lib/beamHandoff";
import {
  deriveDefaultParticipantDashboardPreferences,
  getParticipantCohorts,
  getParticipantOrganizations,
  getParticipantWorkContexts,
  normalizeParticipantDashboardPreferences,
  type ParticipantArea,
  type ParticipantCohortCard,
  type ParticipantDashboardPreferences,
  type ParticipantOnboardingProfile,
} from "@/lib/participantDashboard";
import { useAuthStore } from "@/store/authStore";

interface WorkContextResolutionState {
  method: string;
  usedFallback: boolean;
  reason?: string;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

function toggleId(ids: string[], target: string): string[] {
  return ids.includes(target) ? ids.filter((id) => id !== target) : [...ids, target];
}

function findAreaById(items: ParticipantArea[], id: string | null | undefined): ParticipantArea | null {
  if (!id) return null;
  return items.find((item) => item.id === id) ?? null;
}

function buildCurrentAreaList(
  allItems: ParticipantArea[],
  activeId: string | null,
  interestedIds: string[]
): ParticipantArea[] {
  return uniqueById(
    allItems.filter(
      (item) =>
        item.id === activeId ||
        interestedIds.includes(item.id) ||
        item.source === "handoff" ||
        item.source === "readyaimgo"
    )
  );
}

function buildExplorationList(
  allItems: ParticipantArea[],
  activeId: string | null,
  interestedIds: string[]
): ParticipantArea[] {
  return allItems.filter(
    (item) => item.source === "catalog" && item.id !== activeId && !interestedIds.includes(item.id)
  );
}

function buildCurrentCohorts(
  cohorts: ParticipantCohortCard[],
  activeOrganizationId: string | null,
  activeWorkContext: ParticipantArea | null,
  handoff: BeamHandoffRecord | null
): ParticipantCohortCard[] {
  const activeOrganizationIds = [
    activeOrganizationId,
    ...(activeWorkContext?.linkedOrganizationIds ?? []),
    handoff?.organizationId ?? null,
  ].filter((value): value is string => Boolean(value));

  return uniqueById(
    cohorts.filter(
      (cohort) =>
        (handoff?.cohortId ? cohort.id === handoff.cohortId : false) ||
        cohort.organizationIds.some((organizationId) => activeOrganizationIds.includes(organizationId))
    )
  );
}

function getRoleLabel(role: string | undefined): string {
  switch (role) {
    case "student":
      return "Student Path";
    case "business":
      return "Business / Partner Path";
    case "community":
      return "Community Path";
    default:
      return "Participant Path";
  }
}

function getAreaDetail(area: ParticipantArea): string {
  switch (area.source) {
    case "handoff":
      return "Derived from your recent entry context.";
    case "readyaimgo":
      return "Derived from Readyaimgo unified inputs for your matched client.";
    default:
      return "Available from the local participant dashboard catalog.";
  }
}

function getWorkContextResolutionText(resolution: WorkContextResolutionState | null): string | null {
  if (!resolution) return null;
  if (resolution.usedFallback) {
    return "Using legacy fallback matching. Add sourceDocumentId or sourceStoryId to the handoff for deterministic ReadyAimGo context lookup.";
  }

  if (resolution.method === "source_document_id") {
    return "Matched through the ReadyAimGo participant-context export by source document id.";
  }

  if (resolution.method === "source_story_id") {
    return "Matched through the ReadyAimGo participant-context export by source story id.";
  }

  return null;
}

async function readProfileDoc<T>(uid: string, docId: string): Promise<T | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid, "profiles", docId));
  return snapshot.exists() ? (snapshot.data() as T) : null;
}

function DashboardCard({
  title,
  subtitle,
  detail,
  href,
  isActive,
  isInterested,
  onSetActive,
  onToggleInterest,
  activeLabel = "Active",
}: {
  title: string;
  subtitle: string;
  detail?: string;
  href?: string;
  isActive: boolean;
  isInterested: boolean;
  onSetActive?: () => void;
  onToggleInterest?: () => void;
  activeLabel?: string;
}) {
  return (
    <article className={`rounded-2xl border p-5 ${isActive ? "border-[#89C0D0]/60 bg-[#111820]" : "border-[#23262B] bg-[#1D2127]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        {isActive ? (
          <span className="rounded-full border border-[#89C0D0]/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#89C0D0]">
            {activeLabel}
          </span>
        ) : null}
        {!isActive && isInterested ? (
          <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
            Interested
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-neutral-300">{subtitle}</p>
      {detail ? <p className="mt-3 text-xs text-neutral-500">{detail}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md border border-[#2b2f36] px-3 py-2 text-sm hover:bg-white/5"
          >
            Visit Site
          </a>
        ) : null}
        {onSetActive ? (
          <button
            type="button"
            onClick={onSetActive}
            className="inline-flex rounded-md bg-[#89C0D0] px-3 py-2 text-sm font-medium text-[#0c1215] hover:brightness-95"
          >
            {isActive ? "Current Context" : "Set Active"}
          </button>
        ) : null}
        {onToggleInterest ? (
          <button
            type="button"
            onClick={onToggleInterest}
            className="inline-flex rounded-md border border-[#2b2f36] px-3 py-2 text-sm hover:bg-white/5"
          >
            {isInterested ? "Remove Interest" : "Mark Interest"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function ParticipantDashboard() {
  const { user } = useAuthStore();
  const [handoff, setHandoff] = useState<BeamHandoffRecord | null>(null);
  const [onboarding, setOnboarding] = useState<ParticipantOnboardingProfile | null>(null);
  const [preferences, setPreferences] = useState<ParticipantDashboardPreferences>(
    deriveDefaultParticipantDashboardPreferences(null)
  );
  const [externalWorkContexts, setExternalWorkContexts] = useState<ParticipantArea[]>([]);
  const [matchedClientName, setMatchedClientName] = useState<string | null>(null);
  const [workContextResolution, setWorkContextResolution] = useState<WorkContextResolutionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkContextLoading, setIsWorkContextLoading] = useState(false);
  const [workContextLoadError, setWorkContextLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getFirebaseApp();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setHandoff(null);
      setOnboarding(null);
      setPreferences(deriveDefaultParticipantDashboardPreferences(null));
      setExternalWorkContexts([]);
      setMatchedClientName(null);
      setWorkContextResolution(null);
      setWorkContextLoadError(null);
      setIsWorkContextLoading(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      readProfileDoc<BeamHandoffRecord>(user.uid, "beamHandoff"),
      readProfileDoc<ParticipantOnboardingProfile>(user.uid, "onboarding"),
      readProfileDoc<ParticipantDashboardPreferences>(user.uid, "participantDashboard"),
    ])
      .then(([beamHandoff, onboardingProfile, dashboardPreferences]) => {
        if (cancelled) return;
        setHandoff(beamHandoff);
        setOnboarding(onboardingProfile);
        setPreferences(normalizeParticipantDashboardPreferences(dashboardPreferences, beamHandoff));
      })
      .catch((error) => {
        if (cancelled) return;
        setSaveError(error instanceof Error ? error.message : "Failed to load participant dashboard.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !handoff) {
      setExternalWorkContexts([]);
      setMatchedClientName(null);
      setWorkContextResolution(null);
      setWorkContextLoadError(null);
      setIsWorkContextLoading(false);
      return;
    }

    const sourceSystem = handoff.sourceSystem.trim().toLowerCase();
    if (handoff.sourceType !== "readyaimgo_site" && !sourceSystem.includes("readyaimgo")) {
      setExternalWorkContexts([]);
      setMatchedClientName(null);
      setWorkContextResolution(null);
      setWorkContextLoadError(null);
      setIsWorkContextLoading(false);
      return;
    }

    let cancelled = false;
    setIsWorkContextLoading(true);
    setWorkContextLoadError(null);

    const searchParams = new URLSearchParams();
    const handoffFields: Array<[string, string]> = [
      ["sourceType", handoff.sourceType],
      ["sourceSystem", handoff.sourceSystem],
      ["scenarioLabel", handoff.scenarioLabel],
      ["entryChannel", handoff.entryChannel],
      ["sourceDocumentId", String(handoff.sourceDocumentId ?? "")],
      ["sourceStoryId", String(handoff.sourceStoryId ?? "")],
      ["organizationId", handoff.organizationId],
      ["organizationName", handoff.organizationName],
      ["siteUrl", handoff.siteUrl],
      ["landingPageUrl", handoff.landingPageUrl],
      ["referrerUrl", handoff.referrerUrl],
    ];

    for (const [key, value] of handoffFields) {
      const trimmed = value.trim();
      if (trimmed) {
        searchParams.set(key, trimmed);
      }
    }

    fetch(`/api/participant/work-contexts?${searchParams.toString()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        setExternalWorkContexts(Array.isArray(payload?.contexts) ? (payload.contexts as ParticipantArea[]) : []);
        setMatchedClientName(
          payload?.matchedClient && typeof payload.matchedClient.name === "string"
            ? payload.matchedClient.name
            : null
        );
        setWorkContextResolution(
          payload?.resolution && typeof payload.resolution.method === "string"
            ? {
                method: payload.resolution.method,
                usedFallback: payload.resolution.usedFallback === true,
                reason: typeof payload.resolution.reason === "string" ? payload.resolution.reason : undefined,
              }
            : null
        );
        setWorkContextLoadError(typeof payload?.error === "string" ? payload.error : null);
      })
      .catch((error) => {
        if (cancelled) return;
        setExternalWorkContexts([]);
        setMatchedClientName(null);
        setWorkContextResolution(null);
        setWorkContextLoadError(
          error instanceof Error ? error.message : "Unable to load Readyaimgo work contexts right now."
        );
      })
      .finally(() => {
        if (!cancelled) setIsWorkContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [handoff, user?.uid]);

  const organizations = getParticipantOrganizations(handoff);
  const workContexts = getParticipantWorkContexts(handoff, externalWorkContexts);
  const cohorts = getParticipantCohorts(handoff);
  const activeOrganization = findAreaById(organizations, preferences.activeOrganizationId);
  const activeWorkContext = findAreaById(workContexts, preferences.activeWorkContextId);
  const currentOrganizations = buildCurrentAreaList(
    organizations,
    preferences.activeOrganizationId,
    preferences.interestedOrganizationIds
  );
  const currentWorkContexts = buildCurrentAreaList(
    workContexts,
    preferences.activeWorkContextId,
    preferences.interestedWorkContextIds
  );
  const exploreOrganizations = buildExplorationList(
    organizations,
    preferences.activeOrganizationId,
    preferences.interestedOrganizationIds
  );
  const exploreWorkContexts = buildExplorationList(
    workContexts,
    preferences.activeWorkContextId,
    preferences.interestedWorkContextIds
  );
  const currentCohorts = buildCurrentCohorts(
    cohorts,
    preferences.activeOrganizationId,
    activeWorkContext,
    handoff
  );

  async function persistPreferences(nextPreferences: ParticipantDashboardPreferences) {
    if (!user?.uid) return;

    setSaveError(null);
    setSaveMessage(null);
    setIsSaving(true);
    setPreferences(nextPreferences);

    try {
      await setDoc(
        doc(getFirebaseDb(), "users", user.uid, "profiles", "participantDashboard"),
        {
          ...nextPreferences,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveMessage("Participant dashboard preferences updated.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save participant dashboard preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSetActiveOrganization(organizationId: string) {
    void persistPreferences({
      ...preferences,
      activeOrganizationId: organizationId,
      interestedOrganizationIds: preferences.interestedOrganizationIds.filter((id) => id !== organizationId),
    });
  }

  function handleSetActiveWorkContext(workContextId: string) {
    void persistPreferences({
      ...preferences,
      activeWorkContextId: workContextId,
      interestedWorkContextIds: preferences.interestedWorkContextIds.filter((id) => id !== workContextId),
    });
  }

  function handleToggleOrganizationInterest(organizationId: string) {
    void persistPreferences({
      ...preferences,
      interestedOrganizationIds: toggleId(preferences.interestedOrganizationIds, organizationId),
    });
  }

  function handleToggleWorkContextInterest(workContextId: string) {
    void persistPreferences({
      ...preferences,
      interestedWorkContextIds: toggleId(preferences.interestedWorkContextIds, workContextId),
    });
  }

  const interestChips = uniqueById(
    (onboarding?.interests ?? []).map((interest) => ({ id: interest, label: interest }))
  );
  const focusChips = uniqueById(
    (onboarding?.focus ?? []).map((focus) => ({ id: focus, label: focus }))
  );
  const participantRole = onboarding?.role ?? handoff?.role;

  return (
    <main className="min-h-screen bg-[#17191f] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Participant Dashboard</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {user?.displayName ? `${user.displayName}'s BEAM Dashboard` : "My BEAM Dashboard"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-neutral-300">
                Your organizations, cohorts, areas of interest, and current BEAM pathways live here. Entry and handoff
                details are still available, but they are supporting context rather than the main frame.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/"
                className="rounded-full border border-white/10 px-4 py-2 text-white/85 transition hover:border-white/30 hover:text-white"
              >
                Home
              </Link>
              <Link
                href="/onboard/handoff"
                className="rounded-full border border-white/10 px-4 py-2 text-white/85 transition hover:border-white/30 hover:text-white"
              >
                Edit Source Details
              </Link>
            </div>
          </div>
        </header>

        {!user ? (
          <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
            <h2 className="text-xl font-medium">Participant Overview</h2>
            <p className="mt-3 text-sm text-neutral-300">
              Sign in with Google through BEAM to make this dashboard specific to you. The dashboard uses your own Firebase
              user path, so each signed-in participant sees their own organizations, contexts, and interests.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/onboard/handoff"
                className="rounded-full bg-[#89C0D0] px-4 py-2 text-sm font-medium text-[#0c1215] hover:brightness-95"
              >
                Start BEAM Sign-In
              </Link>
            </div>
          </section>
        ) : isLoading ? (
          <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
            <p className="text-sm text-neutral-300">Loading participant profile...</p>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-medium">Participant Overview</h2>
                  <p className="text-sm text-neutral-300">{user.email ?? "Signed in participant"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                  <p className="text-white/45">Current path</p>
                  <p className="mt-1 font-medium text-white">{getRoleLabel(participantRole)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Active NGO Context</p>
                  <p className="mt-2 text-lg font-medium text-white">{activeOrganization?.name ?? "Not set yet"}</p>
                  <p className="mt-2 text-sm text-neutral-300">
                    {activeOrganization?.description ?? "Choose the BEAM organization context you want to foreground."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Active Work Context</p>
                  <p className="mt-2 text-lg font-medium text-white">{activeWorkContext?.name ?? "Not set yet"}</p>
                  <p className="mt-2 text-sm text-neutral-300">
                    {activeWorkContext?.description ?? "Choose the client or work context you want to foreground."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Engagement</p>
                  <p className="mt-2 text-lg font-medium text-white">{onboarding?.engagement ?? "Not captured yet"}</p>
                  <p className="mt-2 text-sm text-neutral-300">
                    {onboarding?.completedAt
                      ? `Onboarding completed ${new Date(onboarding.completedAt).toLocaleDateString()}.`
                      : "Finish onboarding to capture your full participant profile."}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Interests</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {interestChips.length > 0 ? interestChips.map((interest) => (
                      <span key={interest.id} className="rounded-full border border-[#89C0D0]/30 px-3 py-1 text-xs text-[#89C0D0]">
                        {interest.label}
                      </span>
                    )) : (
                      <span className="text-sm text-neutral-400">No interests saved yet.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Focus Areas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {focusChips.length > 0 ? focusChips.map((focus) => (
                      <span key={focus.id} className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-300">
                        {focus.label}
                      </span>
                    )) : (
                      <span className="text-sm text-neutral-400">No focus areas saved yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium">My Organizations</h2>
                  <p className="mt-2 text-sm text-neutral-300">
                    BEAM NGO and division contexts that are active for you or marked as interests.
                  </p>
                </div>
                <span className="text-xs text-neutral-500">{isSaving ? "Saving..." : "Saved to your participant profile"}</span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {currentOrganizations.length > 0 ? currentOrganizations.map((organization) => (
                  <DashboardCard
                    key={organization.id}
                    title={organization.name}
                    subtitle={organization.description}
                    href={organization.href}
                    detail={getAreaDetail(organization)}
                    isActive={preferences.activeOrganizationId === organization.id}
                    isInterested={preferences.interestedOrganizationIds.includes(organization.id)}
                    onSetActive={() => handleSetActiveOrganization(organization.id)}
                    onToggleInterest={() => handleToggleOrganizationInterest(organization.id)}
                  />
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-5 text-sm text-neutral-400 md:col-span-2 xl:col-span-3">
                    No organization context is active yet. Use Explore Other BEAM Areas to add one.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
              <div>
                <h2 className="text-xl font-medium">My Client / Work Contexts</h2>
                <p className="mt-2 text-sm text-neutral-300">
                  Client and work pathways linked to your current participation. Handoff gives the client context, and
                  Readyaimgo unified inputs add work-context suggestions when they exist upstream.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
                  {matchedClientName ? <span>Matched Readyaimgo client: {matchedClientName}</span> : null}
                  {getWorkContextResolutionText(workContextResolution) ? (
                    <span className={workContextResolution?.usedFallback ? "text-amber-300" : undefined}>
                      {getWorkContextResolutionText(workContextResolution)}
                    </span>
                  ) : null}
                  {isWorkContextLoading ? <span>Syncing Readyaimgo unified inputs...</span> : null}
                  {workContextLoadError ? <span className="text-amber-300">{workContextLoadError}</span> : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {currentWorkContexts.length > 0 ? currentWorkContexts.map((workContext) => (
                  <DashboardCard
                    key={workContext.id}
                    title={workContext.name}
                    subtitle={workContext.description}
                    href={workContext.href}
                    detail={getAreaDetail(workContext)}
                    isActive={preferences.activeWorkContextId === workContext.id}
                    isInterested={preferences.interestedWorkContextIds.includes(workContext.id)}
                    onSetActive={() => handleSetActiveWorkContext(workContext.id)}
                    onToggleInterest={() => handleToggleWorkContextInterest(workContext.id)}
                    activeLabel="Active Work Context"
                  />
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-5 text-sm text-neutral-400 md:col-span-2 xl:col-span-3">
                    No client or work context is active yet. Add one from Explore Other BEAM Areas or re-enter through a
                    Readyaimgo handoff to pull unified work-context inputs.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
              <div>
                <h2 className="text-xl font-medium">My Cohorts</h2>
                <p className="mt-2 text-sm text-neutral-300">
                  Cohorts are shown from your entry context today and can later be driven from BEAM membership collections.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {currentCohorts.length > 0 ? currentCohorts.map((cohort) => (
                  <article key={cohort.id} className="rounded-2xl border border-[#23262B] bg-black/20 p-5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-white">{cohort.name}</h3>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/55">
                        {cohort.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-300">{cohort.description}</p>
                    <p className="mt-3 text-xs text-neutral-500">
                      {cohort.source === "handoff"
                        ? "Derived from your recent BEAM entry."
                        : "Matched from the current BEAM cohort seed set."}
                    </p>
                  </article>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-5 text-sm text-neutral-400 md:col-span-2 xl:col-span-3">
                    No current cohort is connected yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
              <div>
                <h2 className="text-xl font-medium">Explore Other BEAM Areas</h2>
                <p className="mt-2 text-sm text-neutral-300">
                  Mark new NGOs, divisions, and work pathways as interesting even before formal membership is wired up.
                </p>
              </div>

              <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">BEAM NGOs / Divisions</p>
                  <div className="mt-4 grid gap-4">
                    {exploreOrganizations.map((organization) => (
                      <DashboardCard
                        key={organization.id}
                        title={organization.name}
                        subtitle={organization.description}
                        href={organization.href}
                        isActive={preferences.activeOrganizationId === organization.id}
                        isInterested={preferences.interestedOrganizationIds.includes(organization.id)}
                        onSetActive={() => handleSetActiveOrganization(organization.id)}
                        onToggleInterest={() => handleToggleOrganizationInterest(organization.id)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">Client / Work Contexts</p>
                  <div className="mt-4 grid gap-4">
                    {exploreWorkContexts.length > 0 ? exploreWorkContexts.map((workContext) => (
                      <DashboardCard
                        key={workContext.id}
                        title={workContext.name}
                        subtitle={workContext.description}
                        href={workContext.href}
                        detail={getAreaDetail(workContext)}
                        isActive={preferences.activeWorkContextId === workContext.id}
                        isInterested={preferences.interestedWorkContextIds.includes(workContext.id)}
                        onSetActive={() => handleSetActiveWorkContext(workContext.id)}
                        onToggleInterest={() => handleToggleWorkContextInterest(workContext.id)}
                        activeLabel="Active Work Context"
                      />
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-5 text-sm text-neutral-400">
                        Additional local work-context options are not seeded yet. Unified Readyaimgo inputs appear in My
                        Client / Work Contexts when a matched client has them.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
              <div>
                <h2 className="text-xl font-medium">Recent Entry / Handoff Context</h2>
                <p className="mt-2 text-sm text-neutral-300">
                  Source data from your latest BEAM entry path. This is supporting context rather than the main structure of the dashboard.
                </p>
              </div>

              {handoff ? (
                <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Source</p>
                    <p className="mt-2">{handoff.sourceType}</p>
                    <p className="text-neutral-400">{handoff.sourceSystem}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Entry Channel</p>
                    <p className="mt-2">{handoff.entryChannel || "n/a"}</p>
                    <p className="text-neutral-400">{handoff.scenarioLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Organization / Cohort</p>
                    <p className="mt-2">{handoff.organizationName || handoff.organizationId || "n/a"}</p>
                    <p className="text-neutral-400">{handoff.cohortName || handoff.cohortId || "No cohort captured"}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 p-5 text-sm text-neutral-400">
                  No recent handoff data is saved for this participant yet.
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/onboard/handoff"
                  className="rounded-md border border-[#2b2f36] px-4 py-2 text-sm hover:bg-white/5"
                >
                  Edit Source Details
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
              <div>
                <h2 className="text-xl font-medium">Next Steps</h2>
                <p className="mt-2 text-sm text-neutral-300">
                  Practical actions based on the profile, organizations, and contexts currently attached to you.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Link
                  href={participantRole ? `/onboard/${participantRole}` : "/onboard/community"}
                  className="rounded-2xl border border-[#23262B] bg-black/20 p-5 transition hover:border-white/20"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Profile</p>
                  <h3 className="mt-2 text-lg font-medium text-white">Continue Onboarding</h3>
                  <p className="mt-2 text-sm text-neutral-300">Refine role-specific profile choices and declared interests.</p>
                </Link>

                <a
                  href={activeOrganization?.href ?? "https://beamthinktank.space"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-[#23262B] bg-black/20 p-5 transition hover:border-white/20"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Organization</p>
                  <h3 className="mt-2 text-lg font-medium text-white">Visit Active NGO</h3>
                  <p className="mt-2 text-sm text-neutral-300">
                    Move into the currently selected BEAM organization context.
                  </p>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (exploreOrganizations[0]) {
                      handleToggleOrganizationInterest(exploreOrganizations[0].id);
                    }
                  }}
                  className="rounded-2xl border border-[#23262B] bg-black/20 p-5 text-left transition hover:border-white/20"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Discovery</p>
                  <h3 className="mt-2 text-lg font-medium text-white">Signal New NGO Interest</h3>
                  <p className="mt-2 text-sm text-neutral-300">
                    Save interest in another BEAM area directly from this dashboard.
                  </p>
                </button>

                <Link
                  href="/onboard/handoff?preset=paynepros-business"
                  className="rounded-2xl border border-[#23262B] bg-black/20 p-5 transition hover:border-white/20"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Entry</p>
                  <h3 className="mt-2 text-lg font-medium text-white">Test Another Handoff</h3>
                  <p className="mt-2 text-sm text-neutral-300">
                    Re-enter BEAM from a different client or partner context.
                  </p>
                </Link>
              </div>
            </section>

            {saveError ? <p className="text-sm text-red-300">{saveError}</p> : null}
            {saveMessage ? <p className="text-sm text-emerald-300">{saveMessage}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
