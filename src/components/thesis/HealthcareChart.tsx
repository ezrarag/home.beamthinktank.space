import type { SectorData } from "@/lib/thesis/types";

interface HealthcareChartProps {
  data: SectorData;
}

export function HealthcareChart({ data }: HealthcareChartProps) {
  const width = 360;
  const height = 190;
  const padding = 24;
  const maxCost = Math.max(...data.points.map((point) => point.cost), 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full">
      <rect x={padding} y={padding} width={plotWidth / 2} height={plotHeight / 2} fill="rgba(255,255,255,0.02)" />
      <rect
        x={padding}
        y={padding + plotHeight / 2}
        width={plotWidth / 2}
        height={plotHeight / 2}
        fill="rgba(200,185,122,0.08)"
      />
      <rect
        x={padding + plotWidth / 2}
        y={padding}
        width={plotWidth / 2}
        height={plotHeight / 2}
        fill="rgba(255,255,255,0.03)"
      />
      <rect
        x={padding + plotWidth / 2}
        y={padding + plotHeight / 2}
        width={plotWidth / 2}
        height={plotHeight / 2}
        fill="rgba(255,255,255,0.015)"
      />
      <line x1={padding + plotWidth / 2} x2={padding + plotWidth / 2} y1={padding} y2={height - padding} stroke="rgba(240,234,214,0.12)" />
      <line x1={padding} x2={width - padding} y1={padding + plotHeight / 2} y2={padding + plotHeight / 2} stroke="rgba(240,234,214,0.12)" />
      <text x={padding + 8} y={height - padding - 8} fill="var(--beam-gold)" fontSize="10">
        Low Cost / High Quality
      </text>
      {data.points.map((point) => {
        const x = padding + (point.cost / maxCost) * plotWidth;
        const y = padding + plotHeight * (1 - point.qualityScore / 100);
        return (
          <g key={point.id}>
            <circle
              cx={x}
              cy={y}
              r={point.isFreeOrSubsidized ? 6 : 5}
              fill={point.isFreeOrSubsidized ? "var(--beam-gold-bright)" : "rgba(240,234,214,0.45)"}
            />
          </g>
        );
      })}
    </svg>
  );
}
