"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CitySheet from "@/components/CitySheet";
import type { BeamNode } from "@/lib/server/firestoreNodes";

interface NetworkMapSectionProps {
  nodes: BeamNode[];
}

function lngToPercent(lng: number): number {
  const min = -125;
  const max = -66;
  const pct = ((lng - min) / (max - min)) * 100;
  return Math.max(8, Math.min(92, pct));
}

function latToPercent(lat: number): number {
  const min = 24;
  const max = 50;
  const pct = 100 - ((lat - min) / (max - min)) * 100;
  return Math.max(10, Math.min(90, pct));
}

function getPublicStatusLabel(status: BeamNode["status"]) {
  if (status === "active") return "Active";
  if (status === "activating") return "Incoming";
  if (status === "forming") return "Forming";
  if (status === "established") return "Established";
  return "Identified";
}

export function NetworkMapSection({ nodes }: NetworkMapSectionProps) {
  const [selectedNode, setSelectedNode] = useState<BeamNode | null>(nodes.find((node) => node.status === "active") ?? nodes[0] ?? null);

  useEffect(() => {
    setSelectedNode(nodes.find((node) => node.status === "active") ?? nodes[0] ?? null);
  }, [nodes]);

  return (
    <section id="network" className="beam-section-anchor grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="beam-card overflow-hidden rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="beam-eyebrow">Network Map</p>
            <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)] sm:text-5xl">
              Regional nodes, public-safe by design.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--beam-text-secondary)] sm:text-base">
              The public map shows where cohorts are active or incoming, along with issue tags. Operational roles,
              internal inventories, and action data stay in the authenticated workspace.
            </p>
          </div>

          <div className="rounded-full border border-[color:var(--beam-border)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
            {nodes.length} tracked city nodes
          </div>
        </div>

        {/* TODO: replace with Mapbox when NEXT_PUBLIC_MAPBOX_TOKEN is set */}
        <div className="beam-grid relative mt-8 min-h-[420px] overflow-hidden rounded-[28px] border border-[color:var(--beam-border)] bg-[radial-gradient(circle_at_20%_20%,rgba(200,185,122,0.12),transparent_34%),radial-gradient(circle_at_80%_72%,rgba(240,224,160,0.08),transparent_28%),linear-gradient(180deg,#0b0b08_0%,#12110d_100%)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 620"
            className="absolute inset-0 h-full w-full opacity-40"
            preserveAspectRatio="none"
          >
            <path
              d="M91 182L158 151L211 130L276 134L322 120L380 130L446 128L504 150L562 158L628 196L682 232L751 240L836 282L891 337L866 382L803 393L742 450L648 472L586 503L501 488L439 448L364 421L282 415L215 370L155 316L123 258L91 182Z"
              fill="rgba(240, 234, 214, 0.05)"
              stroke="rgba(240, 234, 214, 0.14)"
              strokeWidth="3"
            />
            <path
              d="M162 290L303 247L439 260L589 298L698 337L828 355"
              fill="none"
              stroke="rgba(200, 185, 122, 0.16)"
              strokeWidth="2"
              strokeDasharray="10 14"
            />
          </svg>

          <div className="absolute inset-0">
            {nodes.map((node) => {
              const isSelected = node.id === selectedNode?.id;
              const isActive = node.status === "active" || node.status === "established";
              const [lng, lat] = node.coordinates;

              return (
                <button
                  key={node.id}
                  type="button"
                  onMouseEnter={() => setSelectedNode(node)}
                  onFocus={() => setSelectedNode(node)}
                  onClick={() => setSelectedNode(node)}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 text-left focus:outline-none"
                  style={{ left: `${lngToPercent(lng)}%`, top: `${latToPercent(lat)}%` }}
                >
                  <span
                    className={`relative block h-4 w-4 rounded-full border ${
                      isSelected
                        ? "border-[var(--beam-gold-bright)] bg-[var(--beam-gold-bright)]"
                        : "border-[rgba(240,234,214,0.4)] bg-[rgba(240,234,214,0.16)]"
                    } ${isActive ? "beam-node-active" : ""}`}
                  />
                  <span className="mt-3 block font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--beam-text-primary)]">
                    {node.city}
                  </span>

                  <span className="pointer-events-none absolute left-1/2 top-[-0.75rem] hidden w-56 -translate-x-1/2 rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(8,8,8,0.94)] p-3 opacity-0 shadow-[0_18px_60px_rgba(0,0,0,0.38)] transition duration-200 group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100 sm:block">
                    <span className="beam-eyebrow text-[var(--beam-gold)]">{getPublicStatusLabel(node.status)}</span>
                    <span className="mt-2 block text-sm text-[var(--beam-text-primary)]">{node.city}</span>
                    <span className="mt-2 block text-xs leading-6 text-[var(--beam-text-secondary)]">
                      {node.focusSectors.join(" · ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <Link
            href={selectedNode ? `/network/${selectedNode.id}` : "/#network"}
            className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
          >
            {selectedNode ? `Explore ${selectedNode.city}` : "Find Your City Node"}
          </Link>
        </div>
      </div>

      <div>
        <CitySheet node={selectedNode} variant="public" />
      </div>
    </section>
  );
}
