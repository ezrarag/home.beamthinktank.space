"use client";

import { useEffect, useMemo, useState } from "react";
import type { SectorData } from "@/lib/thesis/types";

interface FoodChartProps {
  data: SectorData;
}

function AnimatedValue({ target, suffix, duration = 1200 }: { target: number; suffix: string; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, target]);

  return (
    <span>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

export function FoodChart({ data }: FoodChartProps) {
  const waste = useMemo(
    () => data.points.filter((point) => point.metadata?.category === "waste").reduce((sum, point) => sum + Number(point.metadata?.tonsWasted ?? 0), 0),
    [data.points]
  );
  const insecure = useMemo(
    () =>
      data.points
        .filter((point) => point.metadata?.category === "need")
        .reduce((sum, point) => sum + Number(point.metadata?.people ?? 0), 0),
    [data.points]
  );

  const programBars = useMemo(
    () =>
      data.points.filter((point) =>
        ["food-desert-urban", "food-snap", "food-wic", "food-school-lunch"].includes(point.id)
      ),
    [data.points]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-[22px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <div>
            <p className="beam-display text-3xl text-[var(--beam-gold-bright)]">
              <AnimatedValue target={Math.round(waste / 1000000)} suffix="M" />
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--beam-text-secondary)]">tons discarded annually</p>
          </div>
          <div className="font-mono text-xl text-[var(--beam-text-dim)]">≠</div>
          <div>
            <p className="beam-display text-3xl text-[var(--beam-text-primary)]">
              <AnimatedValue target={Math.round(insecure / 1000000)} suffix="M" />
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--beam-text-secondary)]">people food insecure</p>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-[var(--beam-text-dim)]">
          This is a distribution problem. Not a scarcity problem.
        </p>
      </div>

      <div className="space-y-3">
        {programBars.map((point) => (
          <div key={point.id} className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[var(--beam-text-secondary)]">
              <span>{point.label}</span>
              <span>{point.qualityScore}</span>
            </div>
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className={`h-2 rounded-full ${point.isFreeOrSubsidized ? "bg-[var(--beam-gold)]" : "bg-[rgba(240,234,214,0.35)]"}`}
                style={{ width: `${Math.max(point.qualityScore, 2)}%` }}
              />
            </div>
            {point.id === "food-wic" ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--beam-gold)]">Infant mortality -25%</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
