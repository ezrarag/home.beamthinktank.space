import type { SectorData } from "@/lib/thesis/types";

interface LegalChartProps {
  data: SectorData;
}

export function LegalChart({ data }: LegalChartProps) {
  const points = data.points.filter((point) => point.qualityScore > 0);
  const needPoint = data.points.find((point) => point.id === "legal-gap");
  const unmetNeeds = Number(needPoint?.metadata?.unmetNeeds ?? 0);
  const totalNeeds = Number(needPoint?.metadata?.totalNeeds ?? 0);

  return (
    <div className="space-y-3">
      {points.map((point) => (
        <div key={point.id} className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--beam-text-secondary)]">
            <span>{point.label}</span>
            <span>{point.qualityScore}%</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
            <div
              className={`h-2 rounded-full ${point.isFreeOrSubsidized ? "bg-[var(--beam-gold)]" : "bg-[rgba(240,234,214,0.35)]"}`}
              style={{ width: `${Math.max(point.qualityScore, 2)}%` }}
            />
          </div>
        </div>
      ))}
      <div className="rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--beam-gold)]">
          Legal aid outperforms private counsel by 5 points at $0 cost
        </p>
        <p className="mt-2 text-xs leading-6 text-[var(--beam-text-secondary)]">
          {totalNeeds.toLocaleString()} civil legal needs identified · {unmetNeeds.toLocaleString()} still go unmet.
        </p>
      </div>
    </div>
  );
}
