interface ActivityTickerProps {
  items: string[];
}

export function ActivityTicker({ items }: ActivityTickerProps) {
  const repeatedItems = [...items, ...items];

  return (
    <section className="border-b border-[color:var(--beam-border)] bg-[rgba(200,185,122,0.08)] py-3">
      <div className="flex overflow-hidden">
        <div className="beam-ticker-track flex min-w-max items-center gap-8 px-6">
          {repeatedItems.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--beam-text-secondary)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--beam-gold)]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
