"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { normalizeWebsiteDirectoryHost, type WebsiteDirectoryEntry } from "@/lib/websiteDirectory";

interface WebsiteDirectoryResponse {
  entries?: WebsiteDirectoryEntry[];
  error?: string;
  externalError?: string;
}

function isBeamHost(host: string | null): boolean {
  return host === "beamthinktank.space" || Boolean(host?.endsWith(".beamthinktank.space"));
}

function getEntryHost(entry: WebsiteDirectoryEntry): string {
  return normalizeWebsiteDirectoryHost(entry.url) ?? "unknown-host";
}

function getEntrySurface(entry: WebsiteDirectoryEntry): string {
  const host = getEntryHost(entry);
  if (host === "beamthinktank.space") return "BEAM Home";
  if (host.endsWith(".beamthinktank.space")) {
    return host.slice(0, -".beamthinktank.space".length);
  }
  return host;
}

function getEntryModeLabel(entry: WebsiteDirectoryEntry): string {
  const host = getEntryHost(entry);
  if (host === "beamthinktank.space") return "Main site";
  if (isBeamHost(host)) return "NGO site";
  return "Partner site";
}

function getEntrySubtitle(entry: WebsiteDirectoryEntry): string {
  const subtitle = entry.subtitle.trim();
  if (subtitle) return subtitle;

  const host = getEntryHost(entry);
  return isBeamHost(host)
    ? "Synced from the BEAM site directory."
    : "External partner surface synced into the BEAM directory.";
}

function formatChipLabel(value: string): string {
  if (!value) return value;
  return value
    .split(/[-./]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EcosystemSection() {
  const [entries, setEntries] = useState<WebsiteDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDirectory() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch("/api/website-directory", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as WebsiteDirectoryResponse;

        if (!response.ok) {
          throw new Error(payload.error || `Failed to load website directory (${response.status})`);
        }

        const nextEntries = Array.isArray(payload.entries) ? payload.entries : [];
        const preferredEntry =
          nextEntries.find((entry) => getEntryHost(entry) !== "beamthinktank.space") ??
          nextEntries[0] ??
          null;

        if (!cancelled) {
          setEntries(nextEntries);
          setExternalError(payload.externalError ?? null);
          setSelectedId(preferredEntry?.id ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setEntries([]);
          setExternalError(null);
          setSelectedId(null);
          setLoadError(error instanceof Error ? error.message : "Failed to load website directory.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDirectory();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
  }, [entries, selectedId]);

  const counts = useMemo(() => {
    const beamHostCount = entries.filter((entry) => isBeamHost(getEntryHost(entry))).length;
    const syncedEntryCount = entries.filter((entry) => entry.source === "external").length;
    const mirroredHostCount = entries.reduce((sum, entry) => {
      return sum + (entry.externalMetadata?.alternateHosts?.length ?? 0);
    }, 0);

    return {
      total: entries.length,
      beamHosts: beamHostCount,
      syncedEntries: syncedEntryCount,
      mirroredHosts: mirroredHostCount,
    };
  }, [entries]);

  return (
    <section id="ecosystem" className="beam-section-anchor grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="beam-card rounded-[30px] p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="beam-eyebrow">Live NGO Surface</p>
          <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)] sm:text-5xl">
            See the network without leaving Home.
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
            This section reads the merged BEAM website directory that already syncs internal entries and external
            organization exports. The first pass is intentionally honest: live site cards now, project and participant
            rollups once each NGO exposes public-safe summaries into Home.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="beam-eyebrow text-[var(--beam-gold)]">Active Sites</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--beam-text-primary)]">
              {isLoading ? "..." : counts.total}
            </p>
            <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">Public directory rows currently visible on Home.</p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="beam-eyebrow text-[var(--beam-gold)]">BEAM Hosts</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--beam-text-primary)]">
              {isLoading ? "..." : counts.beamHosts}
            </p>
            <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">Canonical `beamthinktank.space` surfaces detected.</p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="beam-eyebrow text-[var(--beam-gold)]">Mirrored Hosts</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--beam-text-primary)]">
              {isLoading ? "..." : counts.mirroredHosts}
            </p>
            <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">Alternate deploy or sync domains linked to those sites.</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)]">
          {selectedEntry ? (
            <>
              <div className="relative aspect-[16/10] overflow-hidden border-b border-[color:var(--beam-border)] bg-[rgba(10,10,8,0.82)]">
                {selectedEntry.previewImageUrl ? (
                  <Image
                    src={selectedEntry.previewImageUrl}
                    alt={`${selectedEntry.title} preview`}
                    className="object-cover opacity-75"
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    unoptimized
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.08)_0%,rgba(8,8,8,0.52)_46%,rgba(8,8,8,0.92)_100%)]" />
                <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 p-4">
                  <span className="rounded-full border border-[rgba(240,224,160,0.26)] bg-[rgba(8,8,8,0.72)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--beam-gold-bright)]">
                    {getEntryModeLabel(selectedEntry)}
                  </span>
                  <span className="rounded-full border border-[color:var(--beam-border)] bg-[rgba(8,8,8,0.72)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                    {getEntryHost(selectedEntry)}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="beam-eyebrow text-[var(--beam-gold-bright)]">
                    {formatChipLabel(getEntrySurface(selectedEntry))}
                  </p>
                  <h3 className="beam-display mt-3 text-3xl text-[var(--beam-text-primary)] sm:text-4xl">
                    {selectedEntry.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[rgba(240,234,214,0.82)] sm:text-base">
                    {getEntrySubtitle(selectedEntry)}
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                    {selectedEntry.source === "external" ? "Synced" : "Managed"}
                  </span>
                  {selectedEntry.externalMetadata?.storyPath ? (
                    <span className="rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                      Story {selectedEntry.externalMetadata.storyPath}
                    </span>
                  ) : null}
                  {(selectedEntry.externalMetadata?.alternateHosts?.length ?? 0) > 0 ? (
                    <span className="rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                      {selectedEntry.externalMetadata?.alternateHosts?.length} mirror
                      {selectedEntry.externalMetadata?.alternateHosts?.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>

                <p className="text-sm leading-7 text-[var(--beam-text-secondary)]">
                  Home already knows how to aggregate site presence. The next refinement is a canonical public summary per NGO:
                  active projects, public participant counts by role, and partner/work-context cards that can be analyzed here
                  without exposing private records.
                </p>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={selectedEntry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
                  >
                    Visit Site
                  </a>
                  <a
                    href="/admin/website-directory"
                    className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
                  >
                    Review Directory
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 sm:p-6">
              <p className="beam-eyebrow text-[var(--beam-gold)]">No Public Entries</p>
              <p className="mt-3 text-base leading-7 text-[var(--beam-text-secondary)]">
                Seed `/admin/website-directory` or restore the Readyaimgo BEAM organization export so Home has active NGO
                sites to surface here.
              </p>
            </div>
          )}
        </div>

        {loadError ? (
          <div className="mt-4 rounded-[22px] border border-[rgba(200,66,66,0.28)] bg-[rgba(200,66,66,0.08)] px-4 py-3 text-sm text-[#f1c2c2]">
            {loadError}
          </div>
        ) : null}

        {externalError ? (
          <div className="mt-4 rounded-[22px] border border-[rgba(240,224,160,0.18)] bg-[rgba(200,185,122,0.08)] px-4 py-3 text-sm text-[var(--beam-text-secondary)]">
            External sync warning: {externalError}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => {
          const isSelected = entry.id === selectedEntry?.id;

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedId(entry.id)}
              className={`beam-card overflow-hidden rounded-[26px] text-left transition ${
                isSelected ? "border-[rgba(240,224,160,0.46)]" : "hover:border-[rgba(240,224,160,0.2)]"
              }`}
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b border-[color:var(--beam-border)] bg-[rgba(10,10,8,0.8)]">
                {entry.previewImageUrl ? (
                  <Image
                    src={entry.previewImageUrl}
                    alt={`${entry.title} preview`}
                    className="object-cover opacity-80 transition duration-300"
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    unoptimized
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.02)_0%,rgba(8,8,8,0.16)_50%,rgba(8,8,8,0.78)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                  <span className="rounded-full border border-[color:var(--beam-border)] bg-[rgba(8,8,8,0.7)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                    {getEntrySurface(entry)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${
                      entry.source === "external"
                        ? "border-[rgba(240,224,160,0.22)] bg-[rgba(200,185,122,0.08)] text-[var(--beam-gold-bright)]"
                        : "border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.04)] text-[var(--beam-text-secondary)]"
                    }`}
                  >
                    {entry.source === "external" ? "Synced" : "Managed"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div>
                  <p className="text-xl font-semibold text-[var(--beam-text-primary)]">{entry.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--beam-text-secondary)]">{getEntrySubtitle(entry)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                    {getEntryModeLabel(entry)}
                  </span>
                  {(entry.externalMetadata?.alternateHosts?.length ?? 0) > 0 ? (
                    <span className="rounded-full border border-[color:var(--beam-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)]">
                      {entry.externalMetadata?.alternateHosts?.length} alternate
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}

        {!isLoading && entries.length === 0 ? (
          <div className="beam-card rounded-[26px] p-5 sm:col-span-2">
            <p className="beam-eyebrow text-[var(--beam-gold)]">Directory Empty</p>
            <p className="mt-3 text-sm leading-7 text-[var(--beam-text-secondary)]">
              There are no active website directory rows yet. The public visualization is ready; it just needs canonical NGO
              entries or a working external sync feed.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
