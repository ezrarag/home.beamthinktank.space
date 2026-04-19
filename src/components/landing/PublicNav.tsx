"use client";

import Link from "next/link";

interface PublicNavProps {
  onSignIn: () => void;
  isSigningIn: boolean;
}

const NAV_ITEMS = [
  { href: "#research", label: "Research" },
  { href: "#network", label: "Network" },
  { href: "#ecosystem", label: "Ecosystem" },
  { href: "#about", label: "About" },
  { href: "#data-sources", label: "Data Sources" },
];

export function PublicNav({ onSignIn, isSigningIn }: PublicNavProps) {
  return (
    <header className="border-b border-[color:var(--beam-border)] bg-[rgba(10,10,8,0.92)] px-4 py-4 backdrop-blur sm:px-8">
      <nav className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--beam-border)] bg-[rgba(200,185,122,0.12)]">
            <span className="beam-display text-lg text-[var(--beam-gold-bright)]">B</span>
          </div>
          <div>
            <p className="beam-eyebrow">BEAM</p>
            <p className="text-sm text-[var(--beam-text-secondary)]">Policy infrastructure for local action</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--beam-text-secondary)]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-[var(--beam-text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="text-sm text-[var(--beam-text-secondary)] transition hover:text-[var(--beam-text-primary)] disabled:cursor-wait disabled:opacity-60"
          >
            {isSigningIn ? "Signing In..." : "Sign In"}
          </button>
          <Link
            href="/join"
            className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
          >
            Join Network
          </Link>
        </div>
      </nav>
    </header>
  );
}
