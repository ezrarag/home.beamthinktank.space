"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import type { ParticipantIdentitySummary } from "@/types/participantIdentity";

function formatTimestamp(value?: string | null): string {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ParticipantIdentityAdminPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ParticipantIdentitySummary | null>(null);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsSignedIn(Boolean(user));
      });
      return unsubscribe;
    } catch {
      setIsSignedIn(false);
      return undefined;
    }
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError) {
        const code =
          typeof popupError === "object" && popupError !== null && "code" in popupError
            ? String((popupError as { code?: string }).code ?? "")
            : "";
        if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
    }
  }

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error("Sign in with a Firebase admin account first.");
    }
    const token = await auth.currentUser.getIdToken(true);
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/participant-identity/summary", {
        method: "GET",
        headers: await getAuthHeaders(),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ParticipantIdentitySummary & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load participant identity summary.");
      }
      setSummary(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load participant identity summary.");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  async function handleSeed() {
    setIsSeeding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/participant-identity/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        result?: {
          organizations: Array<{ id: string; status: string }>;
          cohorts: Array<{ id: string; status: string }>;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to seed participant identity data.");
      }

      const organizationCount = payload.result?.organizations.length ?? 0;
      const cohortCount = payload.result?.cohorts.length ?? 0;
      setSuccessMessage(`Seeded ${organizationCount} organizations and ${cohortCount} cohorts.`);
      await loadSummary();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed participant identity data.");
    } finally {
      setIsSeeding(false);
    }
  }

  useEffect(() => {
    if (!isSignedIn) return;
    void loadSummary();
  }, [isSignedIn, loadSummary]);

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Participant Identity
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
            Debug viewer for the canonical participant identity and membership layer. This page reads
            the new Firestore collections without affecting existing onboarding or BEAM game data.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              {isSignedIn ? "Signed In" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => void loadSummary()}
              disabled={!isSignedIn || isLoading}
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void handleSeed()}
              disabled={!isSignedIn || isSeeding}
              className="inline-flex rounded-full border border-[#91B5FF]/40 bg-[#91B5FF]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#C9D8FF] transition hover:border-[#91B5FF]/70 hover:text-white disabled:opacity-50"
            >
              {isSeeding ? "Seeding..." : "Seed Initial Records"}
            </button>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Back To Admin
            </Link>
          </div>
          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-4 text-sm text-emerald-300">{successMessage}</p> : null}
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">Count</p>
            <h2 className="mt-2 text-2xl font-medium">{summary?.counts.participantProfiles ?? 0}</h2>
            <p className="mt-1 text-sm text-white/70">participantProfiles</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">Count</p>
            <h2 className="mt-2 text-2xl font-medium">{summary?.counts.organizationMemberships ?? 0}</h2>
            <p className="mt-1 text-sm text-white/70">organizationMemberships</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">Count</p>
            <h2 className="mt-2 text-2xl font-medium">{summary?.counts.cohortMemberships ?? 0}</h2>
            <p className="mt-1 text-sm text-white/70">cohortMemberships</p>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">Collection</p>
                <h2 className="mt-2 text-xl font-medium">organizations</h2>
              </div>
              <p className="text-sm text-white/50">{summary?.organizations.length ?? 0} docs</p>
            </div>
            <div className="mt-5 space-y-3">
              {(summary?.organizations ?? []).map((organization) => (
                <div key={organization.id} className="rounded-xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{organization.name}</p>
                      <p className="mt-1 text-xs text-white/50">{organization.id}</p>
                    </div>
                    <div className="text-right text-xs text-white/60">
                      <p>{organization.type}</p>
                      <p>{organization.status}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-white/60">
                    Primary region: {organization.primaryRegionId ?? "none"}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Updated: {formatTimestamp(organization.updatedAt)}
                  </p>
                </div>
              ))}
              {!summary?.organizations.length ? (
                <p className="text-sm text-white/55">No organizations found yet.</p>
              ) : null}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">Collection</p>
                <h2 className="mt-2 text-xl font-medium">cohorts</h2>
              </div>
              <p className="text-sm text-white/50">{summary?.cohorts.length ?? 0} docs</p>
            </div>
            <div className="mt-5 space-y-3">
              {(summary?.cohorts ?? []).map((cohort) => (
                <div key={cohort.id} className="rounded-xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{cohort.name}</p>
                      <p className="mt-1 text-xs text-white/50">{cohort.id}</p>
                    </div>
                    <div className="text-right text-xs text-white/60">
                      <p>{cohort.ownershipModel}</p>
                      <p>{cohort.status}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-white/60">
                    Owner: {cohort.primaryOwnerOrganizationId}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Sponsors: {(cohort.sponsorOrganizationIds ?? []).join(", ") || "none"}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Updated: {formatTimestamp(cohort.updatedAt)}
                  </p>
                </div>
              ))}
              {!summary?.cohorts.length ? (
                <p className="text-sm text-white/55">No cohorts found yet.</p>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
