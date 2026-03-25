import Link from "next/link";
import { ThesisSection } from "@/components/thesis/ThesisSection";

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="beam-card rounded-[30px] p-8">
          <p className="beam-eyebrow">Public Research</p>
          <h1 className="beam-display mt-4 text-5xl text-[var(--beam-text-primary)]">Research & Data</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--beam-text-secondary)]">
            Public-facing research, methods, and evidence pathways used throughout the BEAM and ReadyAimGo network.
          </p>
          <Link
            href="/portal"
            className="mt-8 inline-flex rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
          >
            Back to Portal
          </Link>
        </section>
        <ThesisSection />
      </div>
    </main>
  );
}
