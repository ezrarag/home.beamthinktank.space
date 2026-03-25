"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { curatedFindings } from "@/data/curatedFindings";
import { PolicyFindingCard } from "@/components/landing/PolicyFindingCard";
import type { CityContextStat, CityNode, PolicyFinding } from "@/lib/pipeline/types";

interface CityNodePageProps {
  node: CityNode;
  stats: CityContextStat[];
}

function statusLabel(status: CityNode["status"]): string {
  if (status === "active") return "Active";
  if (status === "incoming") return "Incoming";
  return "Planned";
}

function buildPublicServices(node: CityNode): string[] {
  return [
    `${node.focusTags[0] ?? "Regional"} policy briefs and related findings`,
    "City-level context snapshots powered by public data",
    "Cohort onboarding pathway for local organizations and partners",
  ];
}

function buildFallbackFindings(node: CityNode): PolicyFinding[] {
  const primaryTopic = node.focusTags[0];
  const topicMatches = curatedFindings.filter((finding) => primaryTopic && finding.topics.includes(primaryTopic));
  const fallbackPool = [...topicMatches, ...curatedFindings.filter((finding) => finding.featured)];
  const deduped = Array.from(new Map(fallbackPool.map((finding) => [finding.id, finding])).values());
  return deduped.slice(0, 3);
}

export function CityNodePage({ node, stats }: CityNodePageProps) {
  const [relatedFindings, setRelatedFindings] = useState<PolicyFinding[]>(() => buildFallbackFindings(node));
  const [isLoadingFindings, setIsLoadingFindings] = useState(true);
  const publicServices = useMemo(() => buildPublicServices(node), [node]);

  useEffect(() => {
    let cancelled = false;
    const primaryTopic = node.focusTags[0];
    const fallback = buildFallbackFindings(node);

    if (!primaryTopic) {
      setRelatedFindings(fallback);
      setIsLoadingFindings(false);
      return;
    }

    async function loadFindings() {
      try {
        const response = await fetch(`/api/findings?topic=${encodeURIComponent(primaryTopic)}&limit=3`);
        if (!response.ok) {
          throw new Error(`Failed to fetch findings for ${primaryTopic}`);
        }

        const payload = (await response.json()) as { findings?: PolicyFinding[] };
        const fetched = Array.isArray(payload.findings) ? payload.findings : [];
        const merged = Array.from(new Map([...fetched, ...fallback].map((finding) => [finding.id, finding])).values());

        if (!cancelled) {
          setRelatedFindings(merged.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setRelatedFindings(fallback);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFindings(false);
        }
      }
    }

    void loadFindings();

    return () => {
      cancelled = true;
    };
  }, [node]);

  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-4 text-[var(--beam-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px] space-y-6">
        <section className="beam-card rounded-[30px] p-6 sm:p-8">
          <p className="beam-eyebrow">City Node</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="beam-display text-5xl text-[var(--beam-text-primary)] sm:text-6xl">
                {node.city}, {node.state}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--beam-text-secondary)]">{node.publicSummary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[color:var(--beam-border)] bg-[rgba(200,185,122,0.12)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--beam-gold-bright)]">
                {statusLabel(node.status)}
              </span>
              {node.focusTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[color:var(--beam-border)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="beam-eyebrow">Context Stats</p>
            <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)]">Public context, updated from live data.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.length > 0 ? (
              stats.map((stat) => (
                <article key={stat.id} className="beam-card rounded-[26px] p-5">
                  <p className="beam-eyebrow text-[var(--beam-gold)]">{stat.label}</p>
                  <p className="mt-4 font-mono text-3xl text-[var(--beam-text-primary)]">{stat.value}</p>
                  <p className="mt-3 text-sm text-[var(--beam-text-secondary)]">
                    {stat.date ? `${stat.date} via ${stat.source}` : `via ${stat.source}`}
                  </p>
                </article>
              ))
            ) : (
              <article className="beam-card rounded-[26px] p-5 md:col-span-3">
                <p className="beam-eyebrow text-[var(--beam-gold)]">Context Stats</p>
                <p className="mt-4 text-sm leading-7 text-[var(--beam-text-secondary)]">
                  Google Data Commons did not return a usable observation for this node yet. The page still renders with
                  the public summary and related findings fallback.
                </p>
              </article>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="beam-card rounded-[30px] p-6 sm:p-8">
            <p className="beam-eyebrow">About This Node</p>
            <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)]">What this public node exposes.</h2>
            <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
              Public node pages surface city context, focus areas, and related research. Member-only operating detail,
              role inventory, and internal action history stay behind authenticated BEAM workflows.
            </p>
            <div className="mt-6 space-y-3">
              {publicServices.map((service) => (
                <div
                  key={service}
                  className="rounded-[22px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-[var(--beam-text-secondary)]"
                >
                  {service}
                </div>
              ))}
            </div>
          </article>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="beam-eyebrow">Related Findings</p>
                <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)]">Evidence connected to this node.</h2>
              </div>
              <span className="text-sm text-[var(--beam-text-secondary)]">
                {isLoadingFindings ? "Loading…" : `${relatedFindings.length} findings`}
              </span>
            </div>
            <div className="grid gap-4">
              {relatedFindings.map((finding) => (
                <PolicyFindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </section>
        </section>

        <section className="beam-card rounded-[30px] px-6 py-10 text-center sm:px-8">
          <p className="beam-eyebrow">Join This Cohort</p>
          <h2 className="beam-display mt-4 text-4xl text-[var(--beam-text-primary)] sm:text-5xl">
            Want to join the {node.city} cohort?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--beam-text-secondary)]">
            Bring your organization, research, or local capacity into the network. Public pages are the front door; the
            shared operating workspace begins after onboarding.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/join?nodeId=${encodeURIComponent(node.slug)}`}
              className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
            >
              Apply to Join
            </Link>
            <Link
              href="/#network"
              className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
            >
              Back to Network
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
