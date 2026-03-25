import type { SectorData } from "@/lib/thesis/types";

interface EducationChartProps {
  data: SectorData;
}

export function EducationChart({ data }: EducationChartProps) {
  const width = 360;
  const height = 190;
  const padding = { top: 20, right: 24, bottom: 32, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxCost = Math.max(...data.points.map((point) => point.cost), 1);
  const avgPublicQuality =
    data.points.filter((point) => point.isFreeOrSubsidized).reduce((sum, point, _, arr) => sum + point.qualityScore / arr.length, 0) || 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full">
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgba(240,234,214,0.15)" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="rgba(240,234,214,0.15)" />
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={padding.top + plotHeight * (1 - avgPublicQuality / 100)}
        y2={padding.top + plotHeight * (1 - avgPublicQuality / 100)}
        stroke="rgba(200,185,122,0.45)"
        strokeDasharray="6 6"
      />
      <text x={padding.left} y={padding.top + 10} fill="var(--beam-text-dim)" fontSize="10">
        Avg subsidized quality
      </text>
      {data.points.map((point) => {
        const x = padding.left + (point.cost / maxCost) * plotWidth;
        const y = padding.top + plotHeight * (1 - point.qualityScore / 100);
        return (
          <g key={point.id}>
            <circle
              cx={x}
              cy={y}
              r={point.isFreeOrSubsidized ? 5.5 : 4.5}
              fill={point.isFreeOrSubsidized ? "var(--beam-gold-bright)" : "rgba(240,234,214,0.42)"}
            />
          </g>
        );
      })}
      <text x={width / 2 - 18} y={height - 8} fill="var(--beam-text-dim)" fontSize="10">
        Cost
      </text>
      <text
        x={14}
        y={height / 2 + 10}
        fill="var(--beam-text-dim)"
        fontSize="10"
        transform={`rotate(-90 14 ${height / 2 + 10})`}
      >
        Quality
      </text>
    </svg>
  );
}
