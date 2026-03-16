"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";

export default function AdminPortalPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [slackMessage, setSlackMessage] = useState("");
  const [isSendingSlack, setIsSendingSlack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  async function handleSendSlackTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSendingSlack(true);

    try {
      let token: string | null = null;
      try {
        const auth = getFirebaseAuth();
        token = auth.currentUser ? await auth.currentUser.getIdToken(true) : null;
      } catch {
        token = null;
      }

      const response = await fetch("/api/admin/slack/test", {
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
          message: slackMessage.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; mode?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to send Slack test.");
      }

      const modeLabel = payload.mode === "firebase" ? "with Firebase admin auth" : "in dev bypass mode";
      setSuccessMessage(`Slack message sent (${modeLabel}).`);
      setSlackMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send Slack test.");
    } finally {
      setIsSendingSlack(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">
            BEAM Internal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin Portal
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            Internal workspace for BEAM personnel. Use this portal to manage NGO network
            integrations and website directory entries.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              {isSignedIn ? "Signed In" : "Sign In"}
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              BEAM Game Engine
            </p>
            <h2 className="mt-2 text-xl font-medium">Action Logger</h2>
            <p className="mt-2 text-sm text-white/70">
              Mobile-first form for logging actions that auto-generate summaries, role needs, and tasks.
            </p>
            <Link
              href="/admin/action-logger"
              className="mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Open Action Logger
            </Link>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Website Management
            </p>
            <h2 className="mt-2 text-xl font-medium">Website Directory</h2>
            <p className="mt-2 text-sm text-white/70">
              Add, edit, sort, activate, or remove sites in the BEAM network.
            </p>
            <Link
              href="/admin/website-directory"
              className="mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Open Website Directory
            </Link>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Integration Testing
            </p>
            <h2 className="mt-2 text-xl font-medium">Participant/Admin Paths</h2>
            <p className="mt-2 text-sm text-white/70">
              Quick links for validating participant and NGO-facing routes while integrating
              other network websites.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/participant-dashboard"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                Participant Dashboard
              </Link>
              <Link
                href="/community-dashboard"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                NGO Dashboard
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Notifications
            </p>
            <h2 className="mt-2 text-xl font-medium">Slack Webhook Test</h2>
            <p className="mt-2 text-sm text-white/70">
              Send a test post to Slack using `SLACK_ADMIN_WEBHOOK_URL` (fallback `SLACK_WEBHOOK_URL`).
            </p>
            <form onSubmit={handleSendSlackTest} className="mt-4 space-y-3">
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Optional message</span>
                <input
                  value={slackMessage}
                  onChange={(event) => setSlackMessage(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                  placeholder="Infrastructure smoke test from admin."
                />
              </label>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}
              <button
                type="submit"
                disabled={isSendingSlack}
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
              >
                {isSendingSlack ? "Sending..." : "Send Slack Test"}
              </button>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
