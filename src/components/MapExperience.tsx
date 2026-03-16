"use client";

import { useEffect, useRef, useState } from "react";
import type { BeamHotspot } from "@/constants/beamHotspots";
import { loadOptionalModule } from "@/lib/optionalDeps";

interface MapExperienceProps {
  hotspots: BeamHotspot[];
  selectedHotspotId?: string;
  onSelectHotspot: (hotspot: BeamHotspot) => void;
}

interface MapboxLikeMap {
  on: (event: string, callback: () => void) => void;
  remove: () => void;
}

interface MapboxLikeMarker {
  setLngLat: (coordinates: [number, number]) => MapboxLikeMarker;
  addTo: (map: MapboxLikeMap) => MapboxLikeMarker;
  remove: () => void;
}

interface MapboxLikeModule {
  default?: {
    accessToken: string;
    Map: new (options: Record<string, unknown>) => MapboxLikeMap;
    Marker: new (options?: Record<string, unknown>) => MapboxLikeMarker;
  };
}

function isMapboxModule(value: unknown): value is MapboxLikeModule {
  if (!value || typeof value !== "object") return false;
  const shaped = value as { default?: Record<string, unknown> };
  if (!shaped.default || typeof shaped.default !== "object") return false;
  return (
    typeof shaped.default.Map === "function" &&
    typeof shaped.default.Marker === "function"
  );
}

function lngToPercent(lng: number): number {
  const min = -125;
  const max = -66;
  const pct = ((lng - min) / (max - min)) * 100;
  return Math.max(6, Math.min(94, pct));
}

function latToPercent(lat: number): number {
  const min = 24;
  const max = 50;
  const pct = 100 - ((lat - min) / (max - min)) * 100;
  return Math.max(8, Math.min(92, pct));
}

export default function MapExperience({ hotspots, selectedHotspotId, onSelectHotspot }: MapExperienceProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxLikeMap | null>(null);
  const markersRef = useRef<Array<{ remove: () => void }>>([]);
  const [mapboxReady, setMapboxReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!token || !mapHostRef.current) return;
      if (mapRef.current) return;

      const optionalMapbox = await loadOptionalModule("mapbox-gl");
      if (!isMapboxModule(optionalMapbox) || cancelled) return;
      const mapboxgl = optionalMapbox.default;
      if (!mapboxgl) return;

      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: mapHostRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-87.9065, 39.0],
        zoom: 3.4,
      });
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;
        setMapboxReady(true);
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = hotspots.map((hotspot) => {
          const markerEl = document.createElement("button");
          markerEl.type = "button";
          markerEl.setAttribute("aria-label", `Open ${hotspot.city} hotspot`);
          markerEl.className =
            "h-3.5 w-3.5 rounded-full border border-white bg-[#89C0D0] shadow-[0_0_0_3px_rgba(0,0,0,0.35)]";
          markerEl.onclick = () => onSelectHotspot(hotspot);

          const marker = new mapboxgl.Marker({ element: markerEl })
            .setLngLat([hotspot.lng, hotspot.lat])
            .addTo(map);

          return marker;
        });
      });
    };

    void boot();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [hotspots, onSelectHotspot, token]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0d1118]">
      <div ref={mapHostRef} className={`absolute inset-0 ${mapboxReady ? "block" : "hidden"}`} />
      {!mapboxReady ? (
        <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(137,192,208,0.22),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(136,146,255,0.14),transparent_40%),linear-gradient(180deg,#0a0f16_0%,#0b1320_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:30px_30px]" />
        </>
      ) : null}

      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/80">
        {mapboxReady
          ? "Mapbox renderer active."
          : token
          ? "Mapbox token detected. Using fallback map until mapbox-gl dependency is available."
          : "Map unavailable (missing NEXT_PUBLIC_MAPBOX_TOKEN). Using fallback map view."}
      </div>

      {!mapboxReady ? <div className="absolute inset-0">
        {hotspots.map((hotspot) => {
          const selected = hotspot.id === selectedHotspotId;
          return (
            <button
              key={hotspot.id}
              type="button"
              aria-label={`Open ${hotspot.city} hotspot`}
              onClick={() => onSelectHotspot(hotspot)}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                selected
                  ? "border-white/80 bg-[#89C0D0] text-[#0b1216]"
                  : "border-white/35 bg-black/45 text-white/90 hover:border-white/65"
              }`}
              style={{ left: `${lngToPercent(hotspot.lng)}%`, top: `${latToPercent(hotspot.lat)}%` }}
            >
              <span className="block whitespace-nowrap">{hotspot.city}</span>
            </button>
          );
        })}
      </div> : null}
    </div>
  );
}
