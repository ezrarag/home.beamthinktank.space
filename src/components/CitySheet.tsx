"use client";

import type { BeamHotspot } from "@/constants/beamHotspots";

interface CitySheetProps {
  hotspot: BeamHotspot | null;
  onExploreRoles: () => void;
  onSetRegion: () => void;
  onClose: () => void;
}

export default function CitySheet({ hotspot, onExploreRoles, onSetRegion, onClose }: CitySheetProps) {
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
          className="rounded-lg bg-[#89C0D0] px-4 py-2 text-sm font-semibold text-[#0a1318] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Explore roles
        </button>
        <button
          type="button"
          onClick={onSetRegion}
          className="rounded-lg border border-white/25 px-4 py-2 text-sm text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Set as my region
        </button>
      </div>
    </section>
  );
}
