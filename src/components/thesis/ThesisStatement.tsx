export function ThesisStatement() {
  return (
    <div className="max-w-[720px]">
      <div className="mb-5 flex items-center gap-3 beam-eyebrow text-[var(--beam-gold)]">
        <span className="inline-block h-px w-6 bg-[var(--beam-gold)]" />
        <span>The Data Brief</span>
      </div>
      <h2 className="beam-display text-[clamp(28px,3vw,44px)] font-black leading-[1.08] text-[var(--beam-text-primary)]">
        Price is not a promise.
        <br />
        <span className="text-[var(--beam-gold)] italic">Here&apos;s what the data shows.</span>
      </h2>
      <p className="mt-6 text-base leading-7 text-[var(--beam-text-secondary)]">
        Across education, housing, healthcare, and legal services, the idea that higher prices guarantee better
        outcomes does not hold up when you line the federal data up side by side.
      </p>
      <p className="mt-3 text-[15px] leading-7 text-[var(--beam-text-dim)]">
        What the record shows instead: free and subsidized services, when properly resourced, often match or outperform
        their market-rate equivalents. The point is not outrage. The point is possibility.
      </p>
    </div>
  );
}
