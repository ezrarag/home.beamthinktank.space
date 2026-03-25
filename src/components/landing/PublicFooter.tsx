import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-[color:var(--beam-border)] bg-[rgba(10,10,8,0.94)] px-4 py-8 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="beam-eyebrow">About BEAM</p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--beam-text-secondary)]">
            BEAM is building a city-oriented operating layer for policy research, NGO infrastructure, and community
            action. Public visitors get the narrative and evidence view here; authenticated members move into the
            full sky-and-map workspace after sign-in.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm text-[var(--beam-text-secondary)]">
          <Link href="#research" className="transition hover:text-[var(--beam-text-primary)]">
            Methodology
          </Link>
          <Link href="#data-sources" className="transition hover:text-[var(--beam-text-primary)]">
            Data Sources
          </Link>
          <Link href="#network" className="transition hover:text-[var(--beam-text-primary)]">
            Network
          </Link>
          <Link href="/contribute" className="transition hover:text-[var(--beam-text-primary)]">
            Propose a Module →
          </Link>
          <Link href="/admin" className="text-[var(--beam-text-dim)] transition hover:text-[var(--beam-text-secondary)]">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
