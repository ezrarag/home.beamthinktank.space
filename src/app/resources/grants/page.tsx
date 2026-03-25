import Link from "next/link";

export default function GrantsResourcesPage() {
  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <section className="beam-card rounded-[30px] p-8">
          <p className="beam-eyebrow">Phase 4 Resource</p>
          <h1 className="beam-display mt-4 text-5xl text-[var(--beam-text-primary)]">Grant Writing Templates</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--beam-text-secondary)]">
            This placeholder will become the ReadyAimGo grant-writing library, including partner-ready proposal frames,
            sponsor narratives, and reusable application structures.
          </p>
          <Link
            href="/portal"
            className="mt-8 inline-flex rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
          >
            Back to Portal
          </Link>
        </section>
      </div>
    </main>
  );
}
