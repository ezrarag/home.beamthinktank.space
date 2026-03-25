import Link from "next/link";
import type { PolicyFinding } from "@/lib/pipeline/types";

interface PolicyFindingCardProps {
  finding: PolicyFinding;
}

export function PolicyFindingCard({ finding }: PolicyFindingCardProps) {
  return (
    <article className="beam-card relative min-h-[340px] overflow-hidden rounded-[28px] p-6 sm:p-7">
      <div className="absolute right-0 top-0 h-28 w-28 border-l border-b border-[rgba(240,224,160,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(240,224,160,0.18),transparent_65%)]" />
      <p className="beam-eyebrow text-[var(--beam-gold)]">{finding.tag}</p>
      <h3 className="beam-display mt-5 max-w-lg text-3xl leading-tight text-[var(--beam-text-primary)] sm:text-[2.35rem]">
        {finding.headline}
      </h3>
      <p className="mt-5 max-w-xl text-base leading-7 text-[var(--beam-text-secondary)]">{finding.body}</p>

      <div className="mt-8 border-t border-[color:var(--beam-border)] pt-4">
        {finding.sourceUrl ? (
          <Link
            href={finding.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--beam-text-primary)] transition hover:text-[var(--beam-gold-bright)]"
          >
            {finding.source}
          </Link>
        ) : (
          <p className="text-sm text-[var(--beam-text-primary)]">{finding.source}</p>
        )}
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-[var(--beam-text-dim)]">{finding.date}</p>
      </div>
    </article>
  );
}
