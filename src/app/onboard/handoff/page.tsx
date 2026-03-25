"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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

function hasAutoHandoffContext(form: BeamHandoffFormState) {
  return (
    form.sourceType === "ngo_site" &&
    Boolean(form.organizationId.trim()) &&
    Boolean(form.organizationName.trim()) &&
    Boolean(form.entryChannel.trim()) &&
    Boolean(form.landingPageUrl.trim())
  );
}

function BeamHandoffPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [form, setForm] = useState<BeamHandoffFormState>(() => buildBeamHandoffInitialState());
  const [hasHydratedFromSearch, setHasHydratedFromSearch] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getFirebaseApp();
  }, []);

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

  const handleContinue = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      let firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        const provider = new GoogleAuthProvider();
        const signInResult = await signInWithPopup(auth, provider);
        firebaseUser = signInResult.user;
      }

      if (!firebaseUser) {
        throw new Error("Unable to resolve your BEAM sign-in.");
      }

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

      const nextPath = payload.redirectTarget === "role_onboarding" ? `/onboard/${payload.role}` : "/participant-dashboard";
      router.push(nextPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create BEAM handoff.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }, [form, router, selectedPreset]);

  useEffect(() => {
    if (!hasHydratedFromSearch || hasAutoSubmitted || isSubmitting || !autoHandoffReady) return;
    setHasAutoSubmitted(true);
    void handleContinue();
  }, [autoHandoffReady, handleContinue, hasAutoSubmitted, hasHydratedFromSearch, isSubmitting]);

  return (
    <main className="min-h-screen bg-[#0b0d10] px-4 py-10 text-slate-200">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">BEAM Entry</p>
          <h1 className="text-3xl font-semibold text-[#91B5FF] sm:text-4xl">Readyaimgo to BEAM Handoff Tester</h1>
          <p className="mx-auto max-w-3xl text-sm text-slate-400 sm:text-base">
            Use your own Google profile to test how BEAM Home records the source organization, site, and intended role when
            someone enters from a client or partner context.
          </p>
          {autoHandoffReady ? (
            <p className="mx-auto max-w-3xl text-sm text-emerald-300/90">
              Environment handoff detected. BEAM Home will try to sign you in and continue automatically.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 px-3 py-1">
              Current auth: {user?.email ?? "not signed in"}
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

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white">Handoff Payload</h2>
            <p className="mt-2 text-sm text-slate-400">
              This is what BEAM will store under your own profile path at
              <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 text-xs">users/&lt;uid&gt;/profiles/beamHandoff</code>.
              For Readyaimgo-origin entries, prefer filling in <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 text-xs">sourceDocumentId</code> or
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
          {autoHandoffReady && error ? (
            <p className="mt-2 text-sm text-slate-400">
              If the browser blocked the popup, use the button below to continue manually.
            </p>
          ) : null}

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
