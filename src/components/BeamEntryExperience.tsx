"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RolesDrawer from "@/components/RolesDrawer";
import SkyExperience from "@/components/SkyExperience";
import MapExperience from "@/components/MapExperience";
import CitySheet from "@/components/CitySheet";
import { beamHotspots, type BeamHotspot } from "@/constants/beamHotspots";

type EntryMode = "sky" | "map";

export default function BeamEntryExperience() {
  const [mode, setMode] = useState<EntryMode>("sky");
  const [selectedHotspot, setSelectedHotspot] = useState<BeamHotspot | null>(beamHotspots[0] ?? null);
  const [rolesDrawerOpen, setRolesDrawerOpen] = useState(false);

  const rolesFilter = useMemo(
    () => ({
      city: selectedHotspot?.city,
      nodeId: undefined,
      chapterId: undefined,
    }),
    [selectedHotspot?.city]
  );

  function handleSetRegion() {
    if (!selectedHotspot) return;
    localStorage.setItem("beam:selectedRegion", selectedHotspot.regionKey);
  }

  return (
    <main className="min-h-screen w-full bg-[#0a0d14] px-2 py-2 text-white sm:px-4 sm:py-4">
      <div className="mx-auto flex h-[calc(100vh-0.9rem)] w-full max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c1119] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-[calc(100vh-1.6rem)]">
        <header className="flex items-center justify-between border-b border-white/10 px-3 py-2 sm:px-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/55">BEAM Entry</p>
            <h1 className="text-base font-semibold sm:text-lg">Sky Guide + Map</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="rounded-md border border-white/20 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Admin Portal
            </Link>
            <Link
              href="/admin/action-logger"
              className="rounded-md border border-white/20 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Log Action
            </Link>
            <button
              type="button"
              aria-label="Toggle between sky and map"
              onClick={() => setMode((value) => (value === "sky" ? "map" : "sky"))}
              className="rounded-md border border-white/20 px-3 py-1 text-xs font-medium text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {mode === "sky" ? "Sky" : "Map"}
            </button>
          </div>
        </header>

        <section className="relative flex-1 p-1 sm:p-2">
          <div className="h-full w-full">
            {mode === "sky" ? (
              <SkyExperience
                hotspots={beamHotspots}
                selectedHotspotId={selectedHotspot?.id}
                onSelectHotspot={setSelectedHotspot}
              />
            ) : (
              <MapExperience
                hotspots={beamHotspots}
                selectedHotspotId={selectedHotspot?.id}
                onSelectHotspot={setSelectedHotspot}
              />
            )}
          </div>

          <CitySheet
            hotspot={selectedHotspot}
            onExploreRoles={() => setRolesDrawerOpen(true)}
            onSetRegion={handleSetRegion}
            onClose={() => setSelectedHotspot(null)}
          />

          <RolesDrawer open={rolesDrawerOpen} onClose={() => setRolesDrawerOpen(false)} filter={rolesFilter} />
        </section>
      </div>
    </main>
  );
}
