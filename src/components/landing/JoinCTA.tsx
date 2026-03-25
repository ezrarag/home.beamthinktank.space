import Link from "next/link";

export function JoinCTA() {
  return (
    <section className="beam-card rounded-[30px] px-6 py-12 text-center sm:px-8 sm:py-14">
      <p className="beam-eyebrow">Join The Network</p>
      <h2 className="beam-display mx-auto mt-4 max-w-3xl text-4xl text-[var(--beam-text-primary)] sm:text-5xl">
        Your organization belongs in this network.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--beam-text-secondary)]">
        Bring your research, operating context, or regional partnership needs into a shared system that is built to move
        evidence into local execution.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/join"
          className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
        >
          Apply to Join
        </Link>
        <Link
          href="#about"
          className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
        >
          Learn More
        </Link>
      </div>
    </section>
  );
}
