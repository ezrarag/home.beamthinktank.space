"use client";

import { useState } from "react";

interface CommunityModuleSummary {
  id: string;
  title: string;
  contributor?: {
    orgName: string;
    orgUrl?: string;
    approvedAt?: string;
    notes?: string;
  };
}

interface DataSourceInput {
  name: string;
  url: string;
  isFree: boolean;
}

interface ContributeModuleClientProps {
  communityModules: CommunityModuleSummary[];
}

const EMPTY_SOURCE: DataSourceInput = {
  name: "",
  url: "",
  isFree: true,
};

export function ContributeModuleClient({ communityModules }: ContributeModuleClientProps) {
  const [orgName, setOrgName] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sector, setSector] = useState("");
  const [thesis, setThesis] = useState("");
  const [whatsPossible, setWhatsPossible] = useState("");
  const [notes, setNotes] = useState("");
  const [dataSources, setDataSources] = useState<DataSourceInput[]>([{ ...EMPTY_SOURCE }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ proposalId: string; message: string } | null>(null);

  function updateDataSource(index: number, field: keyof DataSourceInput, value: string | boolean) {
    setDataSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index ? { ...source, [field]: value } : source
      )
    );
  }

  function addDataSource() {
    setDataSources((current) => (current.length >= 5 ? current : [...current, { ...EMPTY_SOURCE }]));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setConfirmation(null);
    setIsSubmitting(true);

    try {
      const normalizedSources = dataSources.filter((source) => source.name.trim() && source.url.trim());

      const response = await fetch("/api/modules/contribute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgName,
          orgUrl,
          contactEmail,
          sector,
          thesis,
          whatsPossible,
          dataSources: normalizedSources,
          notes,
        }),
      });

      const payload = (await response.json()) as { error?: string; proposalId?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to submit module proposal.");
      }

      setConfirmation({
        proposalId: payload.proposalId ?? "unknown",
        message: payload.message ?? "Proposal received.",
      });
      setOrgName("");
      setOrgUrl("");
      setContactEmail("");
      setSector("");
      setThesis("");
      setWhatsPossible("");
      setNotes("");
      setDataSources([{ ...EMPTY_SOURCE }]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit proposal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-4 text-[var(--beam-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <section className="beam-card rounded-[30px] p-6 sm:p-8">
          <p className="beam-eyebrow">Community Contribution</p>
          <h1 className="beam-display mt-4 text-5xl text-[var(--beam-text-primary)] sm:text-6xl">
            Help us build the evidence base.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--beam-text-secondary)]">
            NGO partners can propose new modules by bringing a thesis, source list, and evidence framing that belongs in
            the BEAM record. The review is editorial and methodological, not gatekeeping for its own sake.
          </p>
        </section>

        <section className="beam-card rounded-[30px] p-6 sm:p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="beam-eyebrow">Organization Name</span>
                <input
                  required
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
                />
              </label>
              <label className="space-y-2">
                <span className="beam-eyebrow">Contact Email</span>
                <input
                  required
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
                />
              </label>
              <label className="space-y-2">
                <span className="beam-eyebrow">Organization URL</span>
                <input
                  value={orgUrl}
                  onChange={(event) => setOrgUrl(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
                />
              </label>
              <label className="space-y-2">
                <span className="beam-eyebrow">Sector / Topic</span>
                <input
                  required
                  value={sector}
                  onChange={(event) => setSector(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="beam-eyebrow">Thesis Statement</span>
              <textarea
                required
                value={thesis}
                onChange={(event) => setThesis(event.target.value)}
                rows={3}
                className="w-full rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              />
            </label>

            <label className="block space-y-2">
              <span className="beam-eyebrow">What&apos;s Possible</span>
              <textarea
                required
                value={whatsPossible}
                onChange={(event) => setWhatsPossible(event.target.value)}
                rows={3}
                className="w-full rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              />
            </label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="beam-eyebrow">Data Sources</span>
                <button
                  type="button"
                  onClick={addDataSource}
                  className="rounded-full border border-[color:var(--beam-border)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--beam-text-secondary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
                >
                  Add Source
                </button>
              </div>
              {dataSources.map((source, index) => (
                <div key={`source-${index}`} className="grid gap-3 rounded-[20px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] p-4 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    placeholder="Source name"
                    value={source.name}
                    onChange={(event) => updateDataSource(index, "name", event.target.value)}
                    className="rounded-[14px] border border-[color:var(--beam-border)] bg-black/20 px-3 py-2 text-sm text-[var(--beam-text-primary)]"
                  />
                  <input
                    placeholder="https://..."
                    value={source.url}
                    onChange={(event) => updateDataSource(index, "url", event.target.value)}
                    className="rounded-[14px] border border-[color:var(--beam-border)] bg-black/20 px-3 py-2 text-sm text-[var(--beam-text-primary)]"
                  />
                  <label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--beam-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={source.isFree}
                      onChange={(event) => updateDataSource(index, "isFree", event.target.checked)}
                    />
                    Free
                  </label>
                </div>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="beam-eyebrow">Sample Data or Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className="w-full rounded-[18px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              />
            </label>

            {error ? (
              <div className="rounded-[18px] border border-[rgba(200,66,66,0.22)] bg-[rgba(200,66,66,0.08)] px-4 py-3 text-sm text-[#f5c7c7]">
                {error}
              </div>
            ) : null}

            {confirmation ? (
              <div className="rounded-[18px] border border-[rgba(200,185,122,0.28)] bg-[rgba(200,185,122,0.08)] px-4 py-3 text-sm text-[var(--beam-text-primary)]">
                {confirmation.message} Proposal ID: <span className="font-mono">{confirmation.proposalId}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit Proposal"}
            </button>
          </form>
        </section>

        <section className="beam-card rounded-[30px] p-6 sm:p-8">
          <p className="beam-eyebrow">Community Modules</p>
          <h2 className="beam-display mt-4 text-4xl text-[var(--beam-text-primary)]">Published partner contributions.</h2>
          {communityModules.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[var(--beam-text-secondary)]">
              No community modules are published yet. The Food module is the first proof of the registry pattern from the core side.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {communityModules.map((module) => (
                <article key={module.id} className="rounded-[22px] border border-[color:var(--beam-border)] bg-[var(--beam-bg-elevated)] p-5">
                  <h3 className="beam-display text-2xl text-[var(--beam-text-primary)]">{module.title}</h3>
                  <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">
                    {module.contributor?.orgUrl ? (
                      <a href={module.contributor.orgUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                        {module.contributor.orgName}
                      </a>
                    ) : (
                      module.contributor?.orgName ?? "Community contributor"
                    )}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
