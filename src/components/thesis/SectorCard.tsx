"use client";

import type { ComponentType } from "react";
import type { SectorData } from "@/lib/thesis/types";
import { EducationChart } from "@/components/thesis/EducationChart";
import { FoodChart } from "@/components/thesis/FoodChart";
import { HealthcareChart } from "@/components/thesis/HealthcareChart";
import { HousingChart } from "@/components/thesis/HousingChart";
import { LegalChart } from "@/components/thesis/LegalChart";

const VISUALIZATION_CHARTS: Record<string, ComponentType<{ data: SectorData }>> = {
  "grouped-bar": HousingChart,
  "gap-funnel": LegalChart,
  flow: FoodChart,
};

function resolveChart(data: SectorData): ComponentType<{ data: SectorData }> {
  if (data.visualization === "scatter") {
    return data.sector === "healthcare" ? HealthcareChart : EducationChart;
  }

  return VISUALIZATION_CHARTS[data.visualization ?? ""] ?? EducationChart;
}

interface SectorCardProps {
  data?: SectorData;
  loading?: boolean;
}

export function SectorCard({ data, loading }: SectorCardProps) {
  if (loading || !data) {
    return (
      <div className="min-h-[400px] bg-[var(--beam-bg-base)] p-9">
        <div className="h-3 w-2/5 rounded bg-[var(--beam-border)]" />
        <div className="mt-4 h-2 w-3/4 rounded bg-[var(--beam-border)]" />
        <div className="mt-7 h-40 rounded bg-[rgba(255,255,255,0.03)]" />
      </div>
    );
  }

  const Chart = resolveChart(data);
  const icon = data.icon ?? "◎";

  return (
    <article className="bg-[var(--beam-bg-base)] p-9 transition-colors hover:bg-[rgba(14,14,11,0.96)]">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-xl text-[var(--beam-gold)]">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--beam-gold)]">
          {data.title}
        </span>
      </div>

      <p className="beam-display text-lg font-semibold leading-7 text-[var(--beam-text-primary)]">{data.thesis}</p>

      <div className="mt-6">
        <Chart data={data} />
      </div>

      <div className="mt-6 rounded-[20px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-4 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--beam-gold)]">
        {data.summary.gapStatement}
      </div>

      <p className="mt-5 text-[13px] italic leading-6 text-[var(--beam-text-dim)]">{data.whatsPossible}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        {(data.sources && data.sources.length > 0
          ? data.sources.map((source) => ({ label: source.name, url: source.url }))
          : [{ label: data.dataSource, url: data.dataSourceUrl }]
        ).map((source) => (
          <a
            key={`${data.sector}-${source.label}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block border-b border-[color:var(--beam-border)] font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--beam-text-muted)] no-underline transition hover:text-[var(--beam-text-secondary)]"
          >
            ↗ {source.label}
          </a>
        ))}
      </div>
    </article>
  );
}
