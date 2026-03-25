"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import type { BeamNode } from "@/lib/server/firestoreNodes";
import { useAuthStore } from "@/store/authStore";

type PortalState =
  | { status: "loading" }
  | { status: "blocked"; message: string }
  | {
      status: "ready";
      clientName: string;
      clientSlug: string;
      regionNode: BeamNode | null;
      userEmail: string;
    };

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] p-5">
      <p className="beam-eyebrow">{label}</p>
      <p className="mt-4 text-2xl font-semibold text-[var(--beam-text-primary)]">{value}</p>
    </article>
  );
}

function ResourceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[26px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] p-6 transition hover:border-[var(--beam-gold)] hover:bg-[rgba(200,185,122,0.08)]"
    >
      <p className="beam-eyebrow text-[var(--beam-gold)]">Resource</p>
      <h2 className="mt-3 text-2xl font-semibold text-[var(--beam-text-primary)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--beam-text-secondary)]">{description}</p>
      <span className="mt-6 inline-flex text-xs uppercase tracking-[0.18em] text-[var(--beam-gold-bright)]">
        Open
      </span>
    </Link>
  );
}

export default function RagClientPortalPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasInitializedAuth = useAuthStore((state) => state.hasInitializedAuth);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const logout = useAuthStore((state) => state.logout);
  const [portalState, setPortalState] = useState<PortalState>({ status: "loading" });

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!hasInitializedAuth) return;
    if (!user) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function loadPortal() {
      setPortalState({ status: "loading" });

      try {
        const auth = getFirebaseAuth();
        const currentUser = auth.currentUser;

        if (!currentUser?.email) {
          router.replace("/");
          return;
        }

        const idToken = await currentUser.getIdToken(true);
        const adminResponse = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(currentUser.email)}`, {
          cache: "no-store",
        });
        const adminPayload = (await adminResponse.json().catch(() => ({}))) as {
          adminUser?: { active?: boolean };
        };

        if (adminResponse.ok && adminPayload.adminUser?.active) {
          router.replace("/admin");
          return;
        }

        const ragResponse = await fetch("/api/auth/rag-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUser.email, idToken }),
        });
        const ragPayload = (await ragResponse.json().catch(() => ({}))) as {
          allowed?: boolean;
          clientName?: string;
          clientSlug?: string;
          reason?: string;
        };

        if (!ragResponse.ok || !ragPayload.allowed || !ragPayload.clientSlug) {
          if (!cancelled) {
            setPortalState({
              status: "blocked",
              message:
                ragPayload.reason ||
                "This Google account is not on the ReadyAimGo client allowlist. Ask your BEAM or ReadyAimGo coordinator for access.",
            });
          }
          return;
        }

        const nodesResponse = await fetch("/api/nodes/public", { cache: "no-store" });
        const nodesPayload = (await nodesResponse.json().catch(() => ({}))) as { nodes?: BeamNode[] };
        const nodes = Array.isArray(nodesPayload.nodes) ? nodesPayload.nodes : [];
        const regionNode = nodes.find((node) => node.id === ragPayload.clientSlug) ?? null;

        if (!cancelled) {
          setPortalState({
            status: "ready",
            clientName: ragPayload.clientName?.trim() || "ReadyAimGo Client",
            clientSlug: ragPayload.clientSlug,
            regionNode,
            userEmail: currentUser.email,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPortalState({
            status: "blocked",
            message: error instanceof Error ? error.message : "Unable to load the ReadyAimGo client portal.",
          });
        }
      }
    }

    void loadPortal();

    return () => {
      cancelled = true;
    };
  }, [hasInitializedAuth, router, user]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    []
  );

  async function handleSignOut() {
    await logout();
    router.replace("/");
  }

  if (portalState.status === "loading") {
    return (
      <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center rounded-[32px] border border-[color:var(--beam-border)] bg-[rgba(8,8,8,0.84)] px-6">
          <div className="space-y-4 text-center">
            <p className="beam-eyebrow">ReadyAimGo Network</p>
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full border border-[color:var(--beam-gold)] bg-[rgba(200,185,122,0.12)]" />
            <p className="text-sm text-[var(--beam-text-secondary)]">Loading your client portal.</p>
          </div>
        </div>
      </main>
    );
  }

  if (portalState.status === "blocked") {
    return (
      <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center">
          <section className="beam-card w-full rounded-[32px] p-8 text-center">
            <p className="beam-eyebrow text-[#f3c6c6]">Access blocked</p>
            <h1 className="beam-display mt-4 text-4xl text-[var(--beam-text-primary)]">This account cannot open the client portal.</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--beam-text-secondary)]">
              {portalState.message}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
              >
                Return Home
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { clientName, clientSlug, regionNode, userEmail } = portalState;

  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-4 text-[var(--beam-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <section className="beam-card rounded-[32px] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="beam-eyebrow">Powered by BEAM · ReadyAimGo Network</p>
              <h1 className="beam-display mt-4 text-4xl text-[var(--beam-text-primary)] sm:text-6xl">
                Welcome, {clientName}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--beam-text-secondary)]">
                This workspace is reserved for ReadyAimGo client contacts who have been approved through BEAM’s client
                access allowlist. Use it to review network resources, regional context, and the next operating steps for
                your organization.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[color:var(--beam-border)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--beam-gold)]">
                {userEmail}
              </span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
              >
                Sign out
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Your Organization" value={clientName} />
          <StatCard label="Active Since" value={todayLabel} />
          <StatCard label="Node Region" value={regionNode ? `${regionNode.city}, ${regionNode.state}` : "Assignment pending"} />
          <StatCard label="Documents" value="Resource set loading" />
        </section>

        <section>
          <div>
            <p className="beam-eyebrow">Resources</p>
            <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)]">Core materials for your client team.</h2>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ResourceCard
              title="Grant Writing Templates"
              description="Phase 4 placeholder for proposal kits, sponsor framing, and internal submission checklists."
              href="/resources/grants"
            />
            <ResourceCard
              title="Legal Resource Library"
              description="Phase 4 placeholder for governance references, intake templates, and compliance support."
              href="/resources/legal"
            />
            <ResourceCard
              title="Research & Data"
              description="Public-facing network research, node context, and evidence pathways relevant to your operating region."
              href="/research"
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="beam-card rounded-[30px] p-6 sm:p-8">
            <p className="beam-eyebrow">Your Region</p>
            <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)]">Regional context for this client workspace.</h2>
            {regionNode ? (
              <>
                <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
                  {regionNode.city} is the public node currently aligned with this portal route. Use the network page to
                  review city context, focus sectors, and current public research framing.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {regionNode.focusSectors.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--beam-text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/network/${encodeURIComponent(regionNode.id)}`}
                    className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
                  >
                    Open {regionNode.city} Node
                  </Link>
                  <Link
                    href="/#network"
                    className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
                  >
                    Browse Network
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
                  No public city node is linked to the slug <code>{clientSlug}</code> yet. The portal remains active, but
                  your regional node assignment still needs to be mapped in BEAM’s public network data.
                </p>
                <div className="mt-8">
                  <Link
                    href="/#network"
                    className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
                  >
                    Review Active Nodes
                  </Link>
                </div>
              </>
            )}
          </article>

          <article className="beam-card rounded-[30px] p-6 sm:p-8">
            <p className="beam-eyebrow">Network Activity</p>
            <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)]">Updates pipeline</h2>
            <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
              Network updates coming soon. Phase 4 will wire this area to current coordination activity, intake signals,
              and partner-facing status updates.
            </p>
            <div className="mt-6 rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-sm text-[var(--beam-text-secondary)]">
                Current portal state: authenticated, allowlisted, and ready for client-specific modules.
              </p>
            </div>
          </article>
        </section>

        <section className="beam-card rounded-[30px] p-6 sm:p-8">
          <p className="beam-eyebrow">Support</p>
          <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)]">Need help?</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--beam-text-secondary)]">
            Questions? Contact your ReadyAimGo coordinator. If you need access updated, reply with the email address you
            want allowlisted and your organization’s portal slug.
          </p>
          <a
            href="mailto:admin@beamthinktank.space?subject=ReadyAimGo%20Client%20Portal%20Support"
            className="mt-6 inline-flex rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
          >
            Email BEAM support
          </a>
        </section>
      </div>
    </main>
  );
}
