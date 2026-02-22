"use client";

import Link from "next/link";

export default function AdminPortalPage() {
  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">
            BEAM Internal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin Portal
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            Internal workspace for BEAM personnel. Use this portal to manage NGO network
            integrations and website directory entries.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Website Management
            </p>
            <h2 className="mt-2 text-xl font-medium">Website Directory</h2>
            <p className="mt-2 text-sm text-white/70">
              Add, edit, sort, activate, or remove sites in the BEAM network.
            </p>
            <Link
              href="/admin/website-directory"
              className="mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Open Website Directory
            </Link>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Integration Testing
            </p>
            <h2 className="mt-2 text-xl font-medium">Participant/Admin Paths</h2>
            <p className="mt-2 text-sm text-white/70">
              Quick links for validating participant and NGO-facing routes while integrating
              other network websites.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/participant-dashboard"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                Participant Dashboard
              </Link>
              <Link
                href="/community-dashboard"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
              >
                NGO Dashboard
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
