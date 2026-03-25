const SOURCES = [
  "Brookings",
  "RAND",
  "Urban Institute",
  "Policy Commons",
  "NBER",
  "Overton",
  "Google Data Commons",
];

export function TrustRail() {
  return (
    <section id="data-sources" className="beam-section-anchor beam-card rounded-[30px] px-6 py-5 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <p className="beam-eyebrow shrink-0 text-[var(--beam-gold)]">Data Sourced From</p>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((source) => (
            <span
              key={source}
              className="rounded-full border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--beam-text-secondary)]"
            >
              {source}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
