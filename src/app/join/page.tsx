"use client";

import { Suspense, type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { BeamNode } from "@/lib/server/firestoreNodes";

type JoinFormState = {
  orgName: string;
  orgUrl: string;
  nodeId: string;
  sectors: string[];
  contactName: string;
  contactEmail: string;
  needs: string[];
  offers: string[];
  description: string;
};

const SECTOR_OPTIONS = [
  "Housing",
  "Education",
  "Food / Nutrition",
  "Healthcare",
  "Legal Aid",
  "Arts / Culture",
  "Environment",
  "Tech / Digital Equity",
  "Youth / Family",
  "Economic Development",
];

const NEED_OPTIONS = [
  "Grant writing support",
  "Legal templates",
  "Research / data access",
  "Peer network",
  "Project coordination",
  "Fiscal sponsorship",
];

const OFFER_OPTIONS = [
  "Subject matter expertise",
  "Community relationships",
  "Event hosting",
  "Data / research",
  "Volunteer capacity",
  "Funding connections",
];

const INITIAL_FORM: JoinFormState = {
  orgName: "",
  orgUrl: "",
  nodeId: "",
  sectors: [],
  contactName: "",
  contactEmail: "",
  needs: [],
  offers: [],
  description: "",
};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function JoinPageContent() {
  const searchParams = useSearchParams();
  const [nodes, setNodes] = useState<BeamNode[]>([]);
  const [form, setForm] = useState<JoinFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNodes() {
      try {
        const response = await fetch("/api/nodes/public", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load nodes: ${response.status}`);
        }
        const payload = (await response.json()) as { nodes?: BeamNode[] };
        const availableNodes = Array.isArray(payload.nodes)
          ? payload.nodes.filter((node) => node.status === "active" || node.status === "activating")
          : [];

        if (!cancelled) {
          const requestedNodeId = searchParams.get("nodeId") ?? "";
          setNodes(availableNodes);
          setForm((current) => ({
            ...current,
            nodeId:
              availableNodes.find((node) => node.id === requestedNodeId)?.id ||
              current.nodeId ||
              availableNodes[0]?.id ||
              "",
          }));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load nodes.");
        }
      }
    }

    void loadNodes();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === form.nodeId) ?? null, [form.nodeId, nodes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.orgName.trim()) return setError("Organization name is required.");
    if (!form.nodeId) return setError("Please choose a city node.");
    if (!form.contactName.trim()) return setError("Contact name is required.");
    if (!form.contactEmail.trim()) return setError("Contact email is required.");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          orgName: form.orgName.trim(),
          orgUrl: form.orgUrl.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          description: form.description.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to submit application.");
      }
      setSuccessMessage(
        `Your application has been received. The ${selectedNode?.city ?? "selected"} node coordinator will be in touch within 5–7 business days.`
      );
      setForm((current) => ({
        ...INITIAL_FORM,
        nodeId: current.nodeId,
      }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="beam-card rounded-[30px] px-6 py-8 sm:px-8">
          <p className="beam-eyebrow">Join The Network</p>
          <h1 className="beam-display mt-4 text-4xl sm:text-5xl">Apply to join a BEAM city node.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--beam-text-secondary)]">
            Tell us what your organization needs, what it can offer, and which node you want to join. We only show
            nodes that are already active or currently activating.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="beam-card rounded-[30px] px-6 py-8 sm:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-[var(--beam-text-secondary)]">Organization name *</span>
              <input
                value={form.orgName}
                onChange={(event) => setForm((current) => ({ ...current, orgName: event.target.value }))}
                className="w-full rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[var(--beam-text-secondary)]">Organization website</span>
              <input
                value={form.orgUrl}
                onChange={(event) => setForm((current) => ({ ...current, orgUrl: event.target.value }))}
                className="w-full rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-[var(--beam-text-secondary)]">Which city node are you applying to join? *</span>
              <select
                value={form.nodeId}
                onChange={(event) => setForm((current) => ({ ...current, nodeId: event.target.value }))}
                className="w-full rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              >
                <option value="">Select a node</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.city}, {node.state} ({node.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[var(--beam-text-secondary)]">Contact name *</span>
              <input
                value={form.contactName}
                onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                className="w-full rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[var(--beam-text-secondary)]">Contact email *</span>
              <input
                value={form.contactEmail}
                onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                className="w-full rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <fieldset className="rounded-[24px] border border-[color:var(--beam-border)] p-4">
              <legend className="px-2 text-sm text-[var(--beam-text-secondary)]">Primary sectors</legend>
              <div className="mt-3 space-y-2">
                {SECTOR_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-3 text-sm text-[var(--beam-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={form.sectors.includes(option)}
                      onChange={() => setForm((current) => ({ ...current, sectors: toggleValue(current.sectors, option) }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-[24px] border border-[color:var(--beam-border)] p-4">
              <legend className="px-2 text-sm text-[var(--beam-text-secondary)]">What do you need from BEAM?</legend>
              <div className="mt-3 space-y-2">
                {NEED_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-3 text-sm text-[var(--beam-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={form.needs.includes(option)}
                      onChange={() => setForm((current) => ({ ...current, needs: toggleValue(current.needs, option) }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-[24px] border border-[color:var(--beam-border)] p-4">
              <legend className="px-2 text-sm text-[var(--beam-text-secondary)]">What can you offer?</legend>
              <div className="mt-3 space-y-2">
                {OFFER_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-3 text-sm text-[var(--beam-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={form.offers.includes(option)}
                      onChange={() => setForm((current) => ({ ...current, offers: toggleValue(current.offers, option) }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="mt-6 block space-y-2">
            <span className="text-sm text-[var(--beam-text-secondary)]">Brief description</span>
            <textarea
              value={form.description}
              maxLength={300}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--beam-text-primary)]"
            />
            <span className="text-xs text-[var(--beam-text-dim)]">{form.description.length}/300</span>
          </label>

          {error ? <p className="mt-5 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-5 text-sm text-emerald-300">{successMessage}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
            >
              Back Home
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <section className="beam-card rounded-[30px] px-6 py-8 sm:px-8">
              <p className="beam-eyebrow">Join The Network</p>
              <p className="mt-4 text-sm text-[var(--beam-text-secondary)]">Loading application form.</p>
            </section>
          </div>
        </main>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
