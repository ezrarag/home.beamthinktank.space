"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { BEAM_TAXONOMY } from "@/lib/beamTaxonomy";
import { slugifyRegionName } from "@/lib/beamGame";

interface LoggerFormState {
  regionId: string;
  projectId: string;
  assetId: string;
  actionType: string;
  weight: number;
  summaryRaw: string;
  visibility: "public" | "private";
}

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  0?: SpeechRecognitionAlternativeLike;
  isFinal?: boolean;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

const INITIAL_FORM: LoggerFormState = {
  regionId: slugifyRegionName(BEAM_TAXONOMY.regions[0] ?? "Milwaukee"),
  projectId: "",
  assetId: "",
  actionType: BEAM_TAXONOMY.actionTypes[0] ?? "Meeting",
  weight: 3,
  summaryRaw: "",
  visibility: "public",
};

export default function AdminActionLoggerPage() {
  const [form, setForm] = useState<LoggerFormState>(INITIAL_FORM);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationBaseRef = useRef("");

  const regionOptions = useMemo(
    () => BEAM_TAXONOMY.regions.map((name) => ({ id: slugifyRegionName(name), name })),
    []
  );
  const submitStatus = useMemo(() => {
    if (!form.summaryRaw.trim()) return "Status: Add an action summary to submit.";
    if (!isSignedIn) return "Status: Ready to submit (dev bypass mode, not signed in).";
    return "Status: Ready to submit.";
  }, [form.summaryRaw, isSignedIn]);
  const waveformHeights = [3, 4, 6, 10, 5, 3, 4, 8, 14, 9, 4, 3, 5, 11, 7, 3, 4, 9, 13, 6, 4, 3, 5, 8];

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(Boolean(user));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const speechRecognitionCtor =
      (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    setIsMicSupported(Boolean(speechRecognitionCtor));
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  function stopMic() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }

  function handleMicToggle() {
    setMicError(null);
    if (!isMicSupported || typeof window === "undefined") return;

    if (isListening) {
      stopMic();
      return;
    }

    const speechRecognitionCtor =
      (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;

    if (!speechRecognitionCtor) {
      setMicError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new speechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    dictationBaseRef.current = form.summaryRaw.trimEnd();

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = String(event.results[i]?.[0]?.transcript ?? "").trim();
        if (!transcript) continue;
        if (event.results[i].isFinal) finalTranscript += `${transcript} `;
        else interimTranscript += `${transcript} `;
      }

      const base = dictationBaseRef.current;
      const voiceText = `${finalTranscript}${interimTranscript}`.trim();
      const separator = base && voiceText ? " " : "";
      setForm((prev) => ({
        ...prev,
        summaryRaw: `${base}${separator}${voiceText}`.trim(),
      }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const reason = event.error ?? "unknown";
      const messageByReason: Record<string, string> = {
        "not-allowed": "Microphone permission is blocked. Allow mic access in browser site settings.",
        "service-not-allowed": "Speech service is not allowed in this browser profile.",
        "audio-capture": "No microphone was detected. Check your input device.",
        "no-speech": "No speech was detected. Try speaking a bit louder.",
        aborted: "Voice input was stopped before speech was captured.",
        network: "Speech service network error. Check internet connection and retry.",
      };
      setMicError(messageByReason[reason] ?? `Voice input failed (${reason}).`);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  async function handleGoogleSignIn() {
    setError(null);
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
      setError(popupError instanceof Error ? popupError.message : "Google sign-in failed.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.summaryRaw.trim()) {
      setError("Summary is required.");
      return;
    }

    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    setIsSubmitting(true);
    try {
      const token = user ? await user.getIdToken(true) : null;
      const response = await fetch("/api/admin/beam-game/actions", {
        method: "POST",
        headers: token
          ? {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            }
          : {
              "Content-Type": "application/json",
            },
        body: JSON.stringify({
          regionId: form.regionId,
          projectId: form.projectId.trim() || undefined,
          assetId: form.assetId.trim() || undefined,
          actionType: form.actionType,
          weight: form.weight,
          summaryRaw: form.summaryRaw.trim(),
          visibility: form.visibility,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
        aiTasksCount?: number;
        persisted?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to log action.");
      }

      const persistenceNote = payload.persisted ? "saved to Firebase" : "dev bypass (not saved to Firebase)";
      setSuccessMessage(
        `Action logged (${payload.id ?? "new"}); generated ${payload.aiTasksCount ?? 0} tasks; ${persistenceNote}.`
      );
      setForm((prev) => ({ ...INITIAL_FORM, regionId: prev.regionId, summaryRaw: "" }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to log action.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSeedData() {
    setError(null);
    setSuccessMessage(null);
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    setIsSeeding(true);
    try {
      const token = user ? await user.getIdToken(true) : null;
      const response = await fetch("/api/admin/beam-game/seed", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        counts?: Record<string, number>;
        persisted?: boolean;
      };
      if (!response.ok) throw new Error(payload.error || "Failed to seed data.");
      const counts = payload.counts;
      const persistenceNote = payload.persisted ? "Saved to Firebase." : "Dev bypass only (not saved to Firebase).";
      setSuccessMessage(
        counts
          ? `Seeded regions:${counts.regions} projects:${counts.projects} actions:${counts.actions} tasks:${counts.tasks} assets:${counts.assets}. ${persistenceNote}`
          : `Seed completed. ${persistenceNote}`
      );
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed data.");
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header className="border-b border-white/10 pb-5">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Admin Action Logger</h1>
          <p className="mt-2 text-sm text-white/70">
            Log field actions quickly from phone or desktop. Save triggers AI summary, role tags, and open tasks.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/80 hover:border-white/50"
            >
              Back to Admin
            </Link>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/80 hover:border-white/50"
            >
              {isSignedIn ? "Signed In" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={handleSeedData}
              disabled={isSeeding}
              className="inline-flex rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/80 hover:border-white/50 disabled:opacity-50"
            >
              {isSeeding ? "Seeding..." : "Seed Sample Data"}
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-white/50">Region</span>
              <select
                value={form.regionId}
                onChange={(event) => setForm((prev) => ({ ...prev, regionId: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
              >
                {regionOptions.map((region) => (
                  <option key={region.id} value={region.id} className="bg-black">
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-white/50">Action Type</span>
              <select
                value={form.actionType}
                onChange={(event) => setForm((prev) => ({ ...prev, actionType: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
              >
                {BEAM_TAXONOMY.actionTypes.map((actionType) => (
                  <option key={actionType} value={actionType} className="bg-black">
                    {actionType}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-white/50">Project ID (optional)</span>
              <input
                value={form.projectId}
                onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                placeholder="proj_mke_retrofit"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-white/50">Asset ID (optional)</span>
              <input
                value={form.assetId}
                onChange={(event) => setForm((prev) => ({ ...prev, assetId: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                placeholder="asset_mke_warehouse_01"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-white/50">Weight (1-5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={form.weight}
                onChange={(event) => setForm((prev) => ({ ...prev, weight: Number(event.target.value) || 3 }))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.18em] text-white/50">Visibility</span>
              <select
                value={form.visibility}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    visibility: event.target.value === "private" ? "private" : "public",
                  }))
                }
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
              >
                <option value="public" className="bg-black">
                  public
                </option>
                <option value="private" className="bg-black">
                  private
                </option>
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/50">Action Summary</span>
              <div className="flex items-center gap-3">
                {isListening ? (
                  <div className="codex-wave" aria-hidden="true">
                    {waveformHeights.map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className="wave-bar"
                        style={{ height: `${height}px`, animationDelay: `${index * 90}ms` }}
                      />
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleMicToggle}
                  disabled={!isMicSupported}
                  aria-label={isListening ? "Stop microphone input" : "Start microphone input"}
                  className="inline-flex items-center text-white/80 hover:text-white disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
                    <path d="M19 12a7 7 0 0 1-14 0" />
                    <path d="M12 19v3" />
                    <path d="M8 22h8" />
                  </svg>
                </button>
              </div>
            </div>
            <textarea
              rows={5}
              value={form.summaryRaw}
              onChange={(event) => setForm((prev) => ({ ...prev, summaryRaw: event.target.value }))}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
              placeholder="Met with UWM engineering about vacant building retrofit and 90-day activation sprint."
            />
          </label>

          {micError ? <p className="text-sm text-amber-200">{micError}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}
          <p className="text-xs text-white/60">{submitStatus}</p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium uppercase tracking-[0.16em] disabled:opacity-50"
          >
            {isSubmitting ? "Logging..." : "Log Action"}
          </button>
        </form>
      </div>
      <style jsx>{`
        .codex-wave {
          position: relative;
          display: flex;
          align-items: end;
          gap: 2px;
          width: 142px;
          height: 20px;
        }

        .codex-wave::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          border-top: 1px dashed rgba(255, 255, 255, 0.38);
          transform: translateY(-50%);
        }

        .wave-bar {
          position: relative;
          display: block;
          width: 2px;
          background: rgba(255, 255, 255, 0.9);
          transform-origin: center bottom;
          animation: mic-wave 1s ease-in-out infinite;
        }

        @keyframes mic-wave {
          0%,
          100% {
            transform: scaleY(0.45);
            opacity: 0.55;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
