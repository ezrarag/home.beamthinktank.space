"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { useBeamProcesses } from "@/hooks/useBeamProcesses";
import { BeamProcessLadder } from "@/components/BeamProcessLadder";
import { BeamProcessEditor } from "@/components/BeamProcessEditor";
import { upsertBeamProcess, deleteBeamProcess } from "@/lib/beamProcesses";

function DeadlineBadge({ dateString }: { dateString: string }) {
  const deadline = new Date(dateString);
  const now = new Date();
  deadline.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isUnder7Days = diffDays < 7;

  let badgeText = "";
  if (diffDays < 0) {
    badgeText = `Overdue by ${Math.abs(diffDays)}d`;
  } else if (diffDays === 0) {
    badgeText = "Deadline Today";
  } else {
    badgeText = `${diffDays} days until deadline`;
  }

  const badgeClass = isUnder7Days
    ? "border-red-500/30 bg-red-500/10 text-red-400"
    : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
      {badgeText}
    </span>
  );
}

export default function AdminGrantsPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);

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
    setAuthError(null);
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
      setAuthError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
    }
  }

  async function handleSignOut() {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (signOutError) {
      console.warn("Sign out failed", signOutError);
    }
  }

  // Only query processes if signed in
  const { processes, loading, error } = useBeamProcesses(isSignedIn ? "grants" : undefined, isSignedIn);

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Grants Processes</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
            Track grant applications, submissions, review stages, funding progress, and upcoming deadlines.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!isSignedIn ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                Sign Out
              </button>
            )}
            {isSignedIn && !isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
              >
                Create Process
              </button>
            )}
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Back To Admin
            </Link>
          </div>
          {authError ? <p className="mt-4 text-sm text-red-300">{authError}</p> : null}
          {error ? <p className="mt-4 text-sm text-red-300">{error.message}</p> : null}
        </header>

        <section className="mt-8 space-y-6">
          {!isSignedIn ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/65">
              <p className="text-sm">Sign in with an admin account to view grants processes.</p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-4 inline-flex rounded-full bg-[var(--beam-gold)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              {isCreating && (
                <BeamProcessEditor
                  domain="grants"
                  onSave={async (data) => {
                    await upsertBeamProcess(data);
                    setIsCreating(false);
                  }}
                  onCancel={() => setIsCreating(false)}
                />
              )}

              {loading ? (
                <div className="text-sm text-white/65">Loading processes...</div>
              ) : processes.length > 0 ? (
                processes.map((process) => (
                  <div key={process.id} className="relative">
                    {editingProcessId === process.id ? (
                      <BeamProcessEditor
                        initialProcess={process}
                        domain="grants"
                        onSave={async (updated) => {
                          await upsertBeamProcess(updated);
                          setEditingProcessId(null);
                        }}
                        onCancel={() => setEditingProcessId(null)}
                        onDelete={async (id) => {
                          await deleteBeamProcess(id);
                          setEditingProcessId(null);
                        }}
                      />
                    ) : (
                      <>
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                          {process.funding?.deadlineDate && (
                            <DeadlineBadge dateString={process.funding.deadlineDate} />
                          )}
                          <button
                            onClick={() => setEditingProcessId(process.id)}
                            className="rounded-full border border-white/20 bg-black/60 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-wider text-white/80 hover:border-white/50 hover:text-white transition"
                          >
                            Edit
                          </button>
                        </div>
                        <BeamProcessLadder process={process} />
                      </>
                    )}
                  </div>
                ))
              ) : (
                !isCreating && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
                    No grants processes found. Create a new process.
                  </div>
                )
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
