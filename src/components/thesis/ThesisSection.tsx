"use client";

import { useEffect, useState } from "react";
import { SectorCard } from "@/components/thesis/SectorCard";
import { ThesisStatement } from "@/components/thesis/ThesisStatement";
import type { SectorData } from "@/lib/thesis/types";

const LOADING_SKELETON_KEYS = ["education", "food", "housing", "healthcare", "legal"] as const;

export function ThesisSection() {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/thesis")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load thesis data: ${response.status}`);
        }
        return (await response.json()) as { sectors?: SectorData[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setSectors(payload.sectors ?? []);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load thesis data.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="beam-card rounded-[30px] border-t border-[color:var(--beam-border)] px-6 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px]">
        <ThesisStatement />
        {error ? (
          <div className="mt-8 rounded-[22px] border border-[rgba(200,66,66,0.22)] bg-[rgba(200,66,66,0.08)] px-5 py-4 text-sm text-[#f5c7c7]">
            {error}
          </div>
        ) : null}
        <div className="mt-10 grid gap-px bg-[var(--beam-border)] md:grid-cols-2">
          {loading
            ? LOADING_SKELETON_KEYS.map((id) => <SectorCard key={id} loading />)
            : sectors.map((sector) => <SectorCard key={sector.sector} data={sector} />)}
        </div>
        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--beam-text-dim)]">
            Does your organization have data that belongs in this evidence base?
          </p>
          <a
            href="/contribute"
            className="mt-4 inline-flex rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
          >
            Propose a Module →
          </a>
        </div>
      </div>
    </section>
  );
}
