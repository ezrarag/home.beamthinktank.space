"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, type User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseApp, getFirebaseAuth, getFirebaseDb } from "@/lib/firebaseClient";
import {
  applyBeamHandoffPreset,
  applyBeamHandoffSearchParams,
  BEAM_HANDOFF_PRESETS,
  buildBeamHandoffInitialState,
  type BeamHandoffRecord,
  type BeamHandoffFormState,
} from "@/lib/beamHandoff";
import { useAuthStore } from "@/store/authStore";

const REDIRECT_PENDING_STORAGE_KEY = "beam-handoff-auth-pending";
const BEAM_RETURN_HASH_FLAG = "beamAuthReturn";
const BEAM_RETURN_ID_TOKEN_HASH_KEY = "beamIdToken";

interface AuthDebugState {
  origin: string;
  authDomain: string | null;
  projectId: string | null;
  storageBucket: string | null;
  hasApiKey: boolean;
  beamHomeUrl: string | null;
  redirectPending: boolean;
}

function hasAutoHandoffContext(form: BeamHandoffFormState) {
  return (
    form.sourceType === "ngo_site" &&
    Boolean(form.organizationId.trim()) &&
    Boolean(form.organizationName.trim()) &&
    Boolean(form.entryChannel.trim()) &&
    Boolean(form.landingPageUrl.trim())
  );
}

function shouldFallbackToRedirect(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: string }).code ?? "");
  return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
}

function shouldRedirectToExternalLandingPage(landingPageUrl: string) {
  if (typeof window === "undefined") return false;
  const trimmedUrl = landingPageUrl.trim();
  if (!trimmedUrl) return false;

  try {
    return new URL(trimmedUrl).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function buildExternalLandingPageUrl(landingPageUrl: string, idToken: string): string | null {
  try {
    const url = new URL(landingPageUrl);
    const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
    hashParams.set(BEAM_RETURN_HASH_FLAG, "1");
    hashParams.set(BEAM_RETURN_ID_TOKEN_HASH_KEY, idToken);
    url.hash = hashParams.toString();
    return url.toString();
  } catch {
    return null;
  }
}

function BeamHandoffPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const [form, setForm] = useState<BeamHandoffFormState>(() => buildBeamHandoffInitialState());
  const [hasHydratedFromSearch, setHasHydratedFromSearch] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState<"idle" | "popup" | "redirect" | "persist">("idle");
  const [debugState, setDebugState] = useState<AuthDebugState | null>(null);

  useEffect(() => {
    getFirebaseApp();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let authDomain: string | null = null;
    try {
      authDomain = String(getFirebaseAuth().app.options.authDomain ?? "") || null;
    } catch {
      authDomain = null;
    }

    setDebugState({
      origin: window.location.origin,
      authDomain,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
      hasApiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      beamHomeUrl: process.env.NEXT_PUBLIC_BEAM_HOME_URL ?? null,
      redirectPending: window.sessionStorage.getItem(REDIRECT_PENDING_STORAGE_KEY) === "1",
    });
  }, [user]);

  useEffect(() => {
    if (hasHydratedFromSearch) return;
    setForm((prev) => applyBeamHandoffSearchParams(prev, searchParams));
    setHasHydratedFromSearch(true);
  }, [hasHydratedFromSearch, searchParams]);

  const selectedPreset = useMemo(
    () => BEAM_HANDOFF_PRESETS.find((preset) => preset.id === form.presetId) ?? null,
    [form.presetId]
  );
  const autoHandoffReady = useMemo(() => hasAutoHandoffContext(form), [form]);

  function updateField<Key extends keyof BeamHandoffFormState>(key: Key, value: BeamHandoffFormState[Key]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePresetSelect(presetId: string) {
    const preset = BEAM_HANDOFF_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    setForm((prev) => applyBeamHandoffPreset(prev, preset));
  }

  const persistHandoff = useCallback(async (firebaseUser: User) => {
    setError(null);
    setIsSubmitting(true);
    setAuthMethod("persist");

    try {
      const payload: BeamHandoffRecord = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? null,
        displayName: firebaseUser.displayName ?? null,
        scenarioLabel: form.scenarioLabel.trim() || selectedPreset?.name || "Custom BEAM handoff",
        role: form.role,
        sourceType: form.sourceType,
        sourceSystem: form.sourceSystem.trim() || "beam",
        entryChannel: form.entryChannel.trim() || "beam-home",
        sourceDocumentId: form.sourceDocumentId.trim(),
        sourceStoryId: form.sourceStoryId.trim(),
        organizationId: form.organizationId.trim(),
        organizationName: form.organizationName.trim(),
        cohortId: form.cohortId.trim(),
        cohortName: form.cohortName.trim(),
        siteUrl: form.siteUrl.trim(),
        landingPageUrl: form.landingPageUrl.trim(),
        referrerUrl: form.referrerUrl.trim(),
        redirectTarget: form.redirectTarget,
        completedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(getFirebaseDb(), "users", firebaseUser.uid, "profiles", "beamHandoff"),
        {
          ...payload,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (typeof window !== "undefined") {
        window.localStorage.setItem("beam-handoff", JSON.stringify(payload));
      }

      if (shouldRedirectToExternalLandingPage(payload.landingPageUrl)) {
        const beamIdToken = await firebaseUser.getIdToken(true);
        const externalLandingPageUrl = buildExternalLandingPageUrl(payload.landingPageUrl, beamIdToken);

        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(REDIRECT_PENDING_STORAGE_KEY);
        }

        if (externalLandingPageUrl && typeof window !== "undefined") {
          window.location.assign(externalLandingPageUrl);
          return;
        }
      }

      const nextPath = payload.redirectTarget === "role_onboarding" ? `/onboard/${payload.role}` : "/participant-dashboard";
      router.push(nextPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create BEAM handoff.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }, [form, router, selectedPreset]);

  const handleContinue = useCallback(async (options?: { preferRedirect?: boolean }) => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const firebaseUser = auth.currentUser;

    if (firebaseUser) {
      await persistHandoff(firebaseUser);
      return;
    }

    if (options?.preferRedirect) {
      setAuthMethod("redirect");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(REDIRECT_PENDING_STORAGE_KEY, "1");
      }
      await signInWithRedirect(auth, provider);
      return;
    }

    try {
      setAuthMethod("popup");
      const signInResult = await signInWithPopup(auth, provider);
      await persistHandoff(signInResult.user);
    } catch (error) {
      if (shouldFallbackToRedirect(error)) {
        setAuthMethod("redirect");
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(REDIRECT_PENDING_STORAGE_KEY, "1");
        }
        await signInWithRedirect(auth, provider);
        return;
      }

      setError(error instanceof Error ? error.message : "Failed to create BEAM handoff.");
      setIsSubmitting(false);
    }
  }, [persistHandoff]);

  useEffect(() => {
    if (!hasHydratedFromSearch || hasAutoSubmitted || isSubmitting || !autoHandoffReady || isAuthLoading) return;
    const redirectPending =
      typeof window !== "undefined" && window.sessionStorage.getItem(REDIRECT_PENDING_STORAGE_KEY) === "1";

    if (user?.uid) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(REDIRECT_PENDING_STORAGE_KEY);
      }
      setHasAutoSubmitted(true);
      void handleContinue();
      return;
    }

    if (redirectPending) return;

    setHasAutoSubmitted(true);
    void handleContinue({ preferRedirect: true });
  }, [autoHandoffReady, handleContinue, hasAutoSubmitted, hasHydratedFromSearch, isAuthLoading, isSubmitting, user]);

  return (
    <main className="min-h-screen bg-[#0b0d10] px-4 py-10 text-slate-200">
      {autoHandoffReady ? (
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">BEAM Entry</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{form.organizationName.trim()}</h1>
            <p className="mt-4 text-base text-slate-300 sm:text-lg">
              Joining {form.organizationName.trim()} through BEAM.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Continue with Google to connect your account and finish the handoff.
            </p>

            {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
            {autoHandoffReady && error ? (
              <p className="mt-2 text-sm text-slate-400">
                If the browser blocked the popup, use the button below to continue manually.
              </p>
            ) : null}

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={isSubmitting}
                className="rounded-full bg-[#91B5FF] px-6 py-3 text-sm font-medium text-[#0c1215] transition hover:brightness-95 disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Sign in with Google"}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">BEAM Entry</p>
            <h1 className="text-3xl font-semibold text-[#91B5FF] sm:text-4xl">Readyaimgo to BEAM Handoff Tester</h1>
            <p className="mx-auto max-w-3xl text-sm text-slate-400 sm:text-base">
              Use your own Google profile to test how BEAM Home records the source organization, site, and intended role when
              someone enters from a client or partner context.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/10 px-3 py-1">
                Current auth: {user?.email ?? "not signed in"}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Auth mode: {authMethod}
              </span>
              <Link
                href="/participant-dashboard"
                className="rounded-full border border-white/10 px-3 py-1 transition hover:border-white/30 hover:text-white"
              >
                Participant Dashboard
              </Link>
            </div>
          </header>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-medium text-white">Presets</h2>
            <p className="mt-2 text-sm text-slate-400">
              Start with a preset, then tweak any of the handoff fields before you sign in.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {BEAM_HANDOFF_PRESETS.map((preset) => {
                const isActive = preset.id === form.presetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-[#91B5FF]/70 bg-[#91B5FF]/10"
                        : "border-white/10 bg-black/20 hover:border-white/25"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{preset.entryChannel}</p>
                    <h3 className="mt-2 text-lg font-medium text-white">{preset.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {debugState ? (
            <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
              <h2 className="text-lg font-medium text-white">Auth Debug</h2>
              <p className="mt-2 text-sm text-slate-400">
                Runtime values for diagnosing Firebase and popup vs redirect behavior on this page.
              </p>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">window.location.origin</dt>
                  <dd className="text-slate-200">{debugState.origin}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">auth.app.options.authDomain</dt>
                  <dd className="text-slate-200">{debugState.authDomain ?? "missing"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">NEXT_PUBLIC_FIREBASE_PROJECT_ID</dt>
                  <dd className="text-slate-200">{debugState.projectId ?? "missing"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</dt>
                  <dd className="text-slate-200">{debugState.storageBucket ?? "missing"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">NEXT_PUBLIC_FIREBASE_API_KEY present</dt>
                  <dd className="text-slate-200">{debugState.hasApiKey ? "true" : "false"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">NEXT_PUBLIC_BEAM_HOME_URL</dt>
                  <dd className="text-slate-200">{debugState.beamHomeUrl ?? "unset"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Redirect pending</dt>
                  <dd className="text-slate-200">{debugState.redirectPending ? "true" : "false"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Current auth mode</dt>
                  <dd className="text-slate-200">{authMethod}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-white">Handoff Payload</h2>
              <p className="mt-2 text-sm text-slate-400">
                This is what BEAM will store under your own profile path at
                <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 text-xs">users/&lt;uid&gt;/profiles/beamHandoff</code>.
                For Readyaimgo-origin entries, prefer filling in{" "}
                <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 text-xs">sourceDocumentId</code> or
                <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 text-xs">sourceStoryId</code> so participant context lookup can stay deterministic.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                Scenario Label
                <input
                  value={form.scenarioLabel}
                  onChange={(event) => updateField("scenarioLabel", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Role
                <select
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value as BeamHandoffFormState["role"])}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                >
                  <option value="student">Student</option>
                  <option value="business">Business</option>
                  <option value="community">Community</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Source Type
                <select
                  value={form.sourceType}
                  onChange={(event) => updateField("sourceType", event.target.value as BeamHandoffFormState["sourceType"])}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                >
                  <option value="readyaimgo_site">Readyaimgo Site</option>
                  <option value="ngo_site">NGO Site</option>
                  <option value="beam_direct">BEAM Direct</option>
                  <option value="referral">Referral</option>
                  <option value="admin_created">Admin Created</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Redirect After Sign-In
                <select
                  value={form.redirectTarget}
                  onChange={(event) =>
                    updateField("redirectTarget", event.target.value as BeamHandoffFormState["redirectTarget"])
                  }
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                >
                  <option value="dashboard">Participant Dashboard</option>
                  <option value="role_onboarding">Role Onboarding</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Source System
                <input
                  value={form.sourceSystem}
                  onChange={(event) => updateField("sourceSystem", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Entry Channel
                <input
                  value={form.entryChannel}
                  onChange={(event) => updateField("entryChannel", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Source Document ID
                <input
                  value={form.sourceDocumentId}
                  onChange={(event) => updateField("sourceDocumentId", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  placeholder="Readyaimgo client document id"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Source Story ID
                <input
                  value={form.sourceStoryId}
                  onChange={(event) => updateField("sourceStoryId", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  placeholder="paynepros"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Organization ID
                <input
                  value={form.organizationId}
                  onChange={(event) => updateField("organizationId", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Organization Name
                <input
                  value={form.organizationName}
                  onChange={(event) => updateField("organizationName", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Cohort ID
                <input
                  value={form.cohortId}
                  onChange={(event) => updateField("cohortId", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Cohort Name
                <input
                  value={form.cohortName}
                  onChange={(event) => updateField("cohortName", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                Site URL
                <input
                  value={form.siteUrl}
                  onChange={(event) => updateField("siteUrl", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  placeholder="https://paynepros.com"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                Landing Page URL
                <input
                  value={form.landingPageUrl}
                  onChange={(event) => updateField("landingPageUrl", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                Referrer URL
                <input
                  value={form.referrerUrl}
                  onChange={(event) => updateField("referrerUrl", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>
            </div>

            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={isSubmitting}
                className="rounded-full bg-[#91B5FF] px-5 py-2 text-sm font-medium text-[#0c1215] transition hover:brightness-95 disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : user ? "Continue as Current User" : "Sign In with Google"}
              </button>
              <Link
                href="/admin"
                className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/85 transition hover:border-white/35 hover:text-white"
              >
                Back to Admin
              </Link>
            </div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-black/20 p-6"
          >
            <h2 className="text-lg font-medium text-white">What This Tests</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Google sign-in on the BEAM Home side.</li>
              <li>Source attribution storage for the active user profile.</li>
              <li>Client or partner context like PaynePros without needing to alter live Readyaimgo data first.</li>
            </ul>
          </motion.section>
        </div>
      )}
    </main>
  );
}

function HandoffPageFallback() {
  return (
    <main className="min-h-screen bg-[#0b0d10] px-4 py-10 text-slate-200">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-slate-400">Loading BEAM handoff tester...</p>
      </div>
    </main>
  );
}

export default function BeamHandoffPage() {
  return (
    <Suspense fallback={<HandoffPageFallback />}>
      <BeamHandoffPageContent />
    </Suspense>
  );
}
