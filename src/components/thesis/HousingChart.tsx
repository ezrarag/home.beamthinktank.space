import type { SectorData } from "@/lib/thesis/types";

interface HousingChartProps {
  data: SectorData;
}

export function HousingChart({ data }: HousingChartProps) {
  const maxCost = Math.max(...data.points.map((point) => point.cost), 1);

  return (
    <div className="space-y-3">
      {data.points.slice(0, 4).map((point) => (
        <div key={point.id} className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--beam-text-secondary)]">
            <span>{point.label}</span>
            <span>{point.cost === 0 ? "Free" : `$${point.cost.toLocaleString()}`}</span>
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-2 rounded-full bg-[rgba(240,234,214,0.34)]"
                style={{ width: `${Math.max((point.cost / maxCost) * 100, 2)}%` }}
              />
            </div>
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-2 rounded-full bg-[var(--beam-gold)]"
                style={{ width: `${Math.max(point.qualityScore, 2)}%` }}
              />
            </div>
          </div>
          {point.metadata?.type === "CLT" ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--beam-gold)]">
              Quality enforced by covenant
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
