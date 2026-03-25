"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";

type AdminLookupResponse = {
  email: string;
  fullName: string;
  active: boolean;
  loginProvider: "password" | "beam_google";
  adminRole: string;
  tenantId: string;
} | null;

function PortalCard({
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-medium">{title}</h2>
      <p className="mt-2 text-sm text-white/70">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
      >
        {cta}
      </Link>
    </article>
  );
}

export default function AdminPortalPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<AdminLookupResponse>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
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

  const isBeamManaged = lookupResult?.loginProvider === "beam_google";
  const helperText = useMemo(() => {
    if (!lookupResult) return "Enter your PaynePros admin email to determine the correct sign-in route.";
    if (isBeamManaged) return "This admin account is BEAM-managed. Continue with Google using your BEAM email.";
    return "This admin account is marked password-managed. Password login is not wired into this Firebase-only portal yet.";
  }, [isBeamManaged, lookupResult]);

  async function lookupAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLookupLoading(true);

    try {
      const response = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(adminEmail.trim())}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { adminUser?: AdminLookupResponse; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to look up admin user.");

      setLookupResult(payload.adminUser ?? null);
      if (!payload.adminUser) {
        setError("No admin user record matched that email.");
      }
    } catch (lookupError) {
      setLookupResult(null);
      setError(lookupError instanceof Error ? lookupError.message : "Failed to look up admin user.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleGoogleSignIn(emailHint?: string) {
    setError(null);

    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      if (emailHint) provider.setCustomParameters({ login_hint: emailHint });

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
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Admin Portal</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            Internal workspace for BEAM personnel. Use this portal to manage NGO network integrations and website
            directory entries.
          </p>

          <form onSubmit={lookupAdmin} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Admin sign-in routing</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="you@paynepros.com"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={lookupLoading || !adminEmail.trim()}
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
              >
                {lookupLoading ? "Checking..." : "Check access"}
              </button>
            </div>

            <p className="mt-3 text-sm text-white/70">{helperText}</p>

            {lookupResult ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                <p>
                  <span className="text-white">{lookupResult.fullName}</span> · {lookupResult.email}
                </p>
                <p className="mt-1">
                  Provider:{" "}
                  <span className="uppercase">
                    {lookupResult.loginProvider === "beam_google" ? "BEAM sign-on" : "Password-managed"}
                  </span>
                </p>
                <p className="mt-1">
                  Tenant: {lookupResult.tenantId} · Role: {lookupResult.adminRole}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn(lookupResult.email)}
                    disabled={!isBeamManaged}
                    className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isBeamManaged ? "Continue with BEAM sign-on" : "Password flow unavailable"}
                  </button>
                  {!isBeamManaged ? (
                    <span className="text-xs text-white/50">
                      Set loginProvider to beam_google to enable BEAM SSO here.
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                {isSignedIn ? "Signed In" : "Generic Google Sign In"}
              </button>
            </div>
          </form>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <PortalCard
            eyebrow="BEAM Game Engine"
            title="Action Logger"
            description="Mobile-first form for logging actions that auto-generate summaries, role needs, and tasks."
            href="/admin/action-logger"
            cta="Open Action Logger"
          />
          <PortalCard
            eyebrow="Website Management"
            title="Website Directory"
            description="Add, edit, sort, activate, or remove sites in the BEAM network."
            href="/admin/website-directory"
            cta="Open Website Directory"
          />
          <PortalCard
            eyebrow="Network Operations"
            title="Node Management"
            description="Manage city node stages, public visibility, focus sectors, and activation checklists."
            href="/admin/nodes"
            cta="Open Node Management"
          />
          <PortalCard
            eyebrow="Participant Model"
            title="Participant Identity"
            description="Seed and inspect canonical organizations, cohorts, and participant membership counts."
            href="/admin/participant-identity"
            cta="Open Participant Identity"
          />
          <PortalCard
            eyebrow="Client Access"
            title="ReadyAimGo Clients"
            description="Manage which allowlisted client emails route into the dedicated ReadyAimGo portal."
            href="/admin/clients"
            cta="Open Client Access"
          />

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Integration Testing</p>
            <h2 className="mt-2 text-xl font-medium">Participant/Admin Paths</h2>
            <p className="mt-2 text-sm text-white/70">
              Quick links for validating participant and NGO-facing routes, including BEAM-side sign-in handoffs from
              Readyaimgo or client contexts.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/onboard/handoff"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                Handoff Tester
              </Link>
              <Link
                href="/onboard/handoff?preset=paynepros-business"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                PaynePros Preset
              </Link>
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
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Notifications</p>
            <h2 className="mt-2 text-xl font-medium">Slack Webhook Test</h2>
            <p className="mt-2 text-sm text-white/70">
              Send a test post to Slack using <code>SLACK_ADMIN_WEBHOOK_URL</code> (fallback{" "}
              <code>SLACK_WEBHOOK_URL</code>).
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
