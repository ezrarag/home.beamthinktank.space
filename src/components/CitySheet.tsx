"use client";

import Link from "next/link";
import type { BeamHotspot } from "@/constants/beamHotspots";
import type { BeamNode } from "@/lib/server/firestoreNodes";

interface CitySheetProps {
  hotspot?: BeamHotspot | null;
  node?: BeamNode | null;
  onExploreRoles?: () => void;
  onSetRegion?: () => void;
  onClose?: () => void;
  variant?: "entry" | "public";
}

function getPublicStatusLabel(status: BeamHotspot["status"] | BeamNode["status"]) {
  if (status === "active") return "Active";
  if (status === "activating") return "Incoming";
  if (status === "forming") return "Forming";
  if (status === "established") return "Established";
  return "Identified";
}

export default function CitySheet({
  hotspot,
  node,
  onExploreRoles,
  onSetRegion,
  onClose,
  variant = "entry",
}: CitySheetProps) {
  const publicNode = node
    ? {
        id: node.id,
        city: node.city,
        status: node.status,
        tags: node.focusSectors,
        summary: node.publicSummary,
      }
    : hotspot
      ? {
          id: hotspot.regionKey,
          city: hotspot.city,
          status: hotspot.status,
          tags: hotspot.topTags,
          summary: hotspot.publicSummary,
        }
      : null;

  if (variant === "public") {
    if (!publicNode) return null;

    return (
      <section
        aria-label={`${publicNode.city} public node details`}
        className="beam-card h-full rounded-[28px] p-6 text-[var(--beam-text-primary)]"
      >
        <p className="beam-eyebrow">Selected Node</p>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="beam-display text-3xl">{publicNode.city}</h3>
            <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">
              {getPublicStatusLabel(publicNode.status)} cohort signal
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--beam-gold)]">
            {publicNode.status === "active" || publicNode.status === "established" ? "Live" : "Tracking"}
          </span>
        </div>

        <p className="mt-5 max-w-md text-sm leading-6 text-[var(--beam-text-secondary)]">
          {publicNode.summary || "Public view only surfaces city status and issue tags. Operational roles and action logs stay behind the authenticated member workspace."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {publicNode.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[color:var(--beam-border)] bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/onboard/community"
            className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-[var(--beam-gold-bright)]"
          >
            Find Your Region
          </Link>
          <Link
            href={publicNode.id ? `/join?nodeId=${encodeURIComponent(publicNode.id)}` : "/join"}
            className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.16em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
          >
            Apply to Join
          </Link>
        </div>
      </section>
    );
  }

  if (!hotspot) return null;

  return (
    <section
      aria-label={`${hotspot.city} region details`}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-3xl rounded-t-2xl border border-white/10 bg-[#10141d]/95 p-4 text-white backdrop-blur"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">City Node</p>
          <h2 className="mt-1 text-2xl font-semibold">{hotspot.city}</h2>
          <p className="mt-1 text-sm text-white/75">Status: {hotspot.status}</p>
        </div>
        <button
          type="button"
          aria-label="Close city sheet"
          onClick={onClose}
          className="rounded-md border border-white/25 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Close
        </button>
      </div>

      <p className="mt-3 text-sm text-white/85">{hotspot.activeRolesHint}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {hotspot.topTags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/80">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExploreRoles}
          disabled={!onExploreRoles}
          className="rounded-lg bg-[#89C0D0] px-4 py-2 text-sm font-semibold text-[#0a1318] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Explore roles
        </button>
        <button
          type="button"
          onClick={onSetRegion}
          disabled={!onSetRegion}
          className="rounded-lg border border-white/25 px-4 py-2 text-sm text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Set as my region
        </button>
      </div>
    </section>
  );
}
