"use client";

import { useState } from "react";
import type { BeamProcess, BeamProcessStage, BeamProcessFunding, BeamProcessStageStatus } from "@/types/beamProcess";

interface BeamProcessEditorProps {
  initialProcess?: BeamProcess | null;
  domain: BeamProcess["domain"];
  onSave: (process: BeamProcess) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}

const DEFAULT_STAGES_BY_DOMAIN: Record<string, Array<{ id: string; label: string }>> = {
  architecture: [
    { id: "documented", label: "Documented" },
    { id: "design-scoped", label: "Design/Scoped" },
    { id: "cohort-assigned", label: "Cohort Assigned" },
    { id: "in-progress", label: "In Progress" },
    { id: "complete", label: "Complete" },
  ],
  law: [
    { id: "identified", label: "Identified" },
    { id: "assigned", label: "Assigned" },
    { id: "filed-drafting", label: "Filed/Drafting" },
    { id: "under-review", label: "Under Review" },
    { id: "resolved", label: "Resolved" },
  ],
  grants: [
    { id: "identified", label: "Identified" },
    { id: "drafting", label: "Drafting" },
    { id: "submitted", label: "Submitted" },
    { id: "under-review", label: "Under Review" },
    { id: "awarded", label: "Awarded" },
  ],
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function BeamProcessEditor({ initialProcess, domain, onSave, onCancel, onDelete }: BeamProcessEditorProps) {
  const isNew = !initialProcess;
  const [title, setTitle] = useState(initialProcess?.title ?? "");
  const [stages, setStages] = useState<BeamProcessStage[]>(() => {
    if (initialProcess?.stages) return initialProcess.stages;
    const defaults = DEFAULT_STAGES_BY_DOMAIN[domain] || [];
    return defaults.map((stage) => ({
      id: stage.id,
      label: stage.label,
      status: "idle",
      owner: "TBD",
      note: "",
      updatedAt: new Date().toISOString(),
    }));
  });

  const [hasFunding, setHasFunding] = useState(Boolean(initialProcess?.funding));
  const [fundingTarget, setFundingTarget] = useState(initialProcess?.funding?.targetUsd ?? 0);
  const [fundingRaised, setFundingRaised] = useState(initialProcess?.funding?.raisedUsd ?? 0);
  const [fundingLabel, setFundingLabel] = useState(initialProcess?.funding?.label ?? "");
  const [deadlineDate, setDeadlineDate] = useState(initialProcess?.funding?.deadlineDate ?? "");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStageChange = (index: number, fields: Partial<BeamProcessStage>) => {
    setStages((current) =>
      current.map((stage, idx) =>
        idx === index
          ? {
              ...stage,
              ...fields,
              updatedAt: new Date().toISOString(),
            }
          : stage
      )
    );
  };

  const handleAddStage = () => {
    setStages((current) => [
      ...current,
      {
        id: `stage-${Date.now()}`,
        label: "New Stage",
        status: "idle",
        owner: "TBD",
        note: "",
        updatedAt: new Date().toISOString(),
      },
    ]);
  };

  const handleRemoveStage = (index: number) => {
    setStages((current) => current.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (stages.length === 0) {
      setError("At least one stage is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const funding: BeamProcessFunding | undefined = hasFunding
      ? {
          targetUsd: Number(fundingTarget),
          raisedUsd: Number(fundingRaised),
          label: fundingLabel.trim() || "Funding Progress",
          deadlineDate: deadlineDate.trim() || undefined,
        }
      : undefined;

    const processData: BeamProcess = {
      id: initialProcess?.id || slugify(title),
      title: title.trim(),
      domain,
      stages,
      funding,
      createdAt: initialProcess?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(processData);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save process.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="beam-card rounded-xl p-5 border border-white/15 bg-black/40 space-y-6">
      <h3 className="text-lg font-semibold text-[var(--beam-text-primary)]">
        {isNew ? "Create New Process" : `Edit Process: ${initialProcess.title}`}
      </h3>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-white/50">Process Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isNew}
            placeholder="e.g. Roof Restoration & Structural Inspection"
            className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white text-sm focus:border-[var(--beam-gold)] focus:outline-none"
          />
          {!isNew && <span className="text-[10px] text-white/30">Process identifiers cannot be changed after creation.</span>}
        </label>

        {/* Funding section */}
        <div className="border-t border-white/10 pt-4">
          <label className="flex items-center gap-3 text-sm text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={hasFunding}
              onChange={(e) => setHasFunding(e.target.checked)}
              className="rounded bg-black/40 border-white/15 text-[var(--beam-gold)] focus:ring-0"
            />
            <span>Enable Funding / Budget Tracker</span>
          </label>

          {hasFunding && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Target USD</span>
                <input
                  type="number"
                  value={fundingTarget}
                  onChange={(e) => setFundingTarget(Number(e.target.value))}
                  placeholder="Target amount"
                  className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white text-sm focus:border-[var(--beam-gold)] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Raised USD</span>
                <input
                  type="number"
                  value={fundingRaised}
                  onChange={(e) => setFundingRaised(Number(e.target.value))}
                  placeholder="Raised amount"
                  className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white text-sm focus:border-[var(--beam-gold)] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Funding Label</span>
                <input
                  type="text"
                  value={fundingLabel}
                  onChange={(e) => setFundingLabel(e.target.value)}
                  placeholder="e.g. Phase 1 structural threshold"
                  className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white text-sm focus:border-[var(--beam-gold)] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Deadline Date (Optional)</span>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white text-sm focus:border-[var(--beam-gold)] focus:outline-none"
                />
              </label>
            </div>
          )}
        </div>

        {/* Stages list */}
        <div className="border-t border-white/10 pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-[0.18em] text-white/50">Stages / Milestones</span>
            <button
              type="button"
              onClick={handleAddStage}
              className="text-xs text-[var(--beam-gold-bright)] hover:underline"
            >
              + Add Custom Stage
            </button>
          </div>

          <div className="space-y-4">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3 relative">
                <button
                  type="button"
                  onClick={() => handleRemoveStage(idx)}
                  className="absolute top-2 right-2 text-xs text-red-400 hover:text-red-300"
                  aria-label="Remove stage"
                >
                  ✕
                </button>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Stage Label</span>
                    <input
                      type="text"
                      value={stage.label}
                      onChange={(e) => handleStageChange(idx, { label: e.target.value })}
                      placeholder="e.g. Scoped"
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-white text-xs"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Status</span>
                    <select
                      value={stage.status}
                      onChange={(e) => handleStageChange(idx, { status: e.target.value as BeamProcessStageStatus })}
                      className="w-full rounded-lg border border-white/10 bg-[#121317] px-2 py-1.5 text-white text-xs"
                    >
                      <option value="idle">Idle</option>
                      <option value="active">Active</option>
                      <option value="complete">Complete</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Owner</span>
                    <input
                      type="text"
                      value={stage.owner}
                      onChange={(e) => handleStageChange(idx, { owner: e.target.value })}
                      placeholder="e.g. Ezra"
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-white text-xs"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Note</span>
                  <input
                    type="text"
                    value={stage.note}
                    onChange={(e) => handleStageChange(idx, { note: e.target.value })}
                    placeholder="Provide a status note or checklist update"
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-white text-xs"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[var(--beam-gold)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Process"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.18em] text-white/80 transition hover:border-white/50 hover:text-white"
          >
            Cancel
          </button>
        </div>

        {!isNew && onDelete && (
          <button
            type="button"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to delete "${initialProcess.title}"?`)) {
                setLoading(true);
                try {
                  await onDelete(initialProcess.id);
                } catch (delError) {
                  setError(delError instanceof Error ? delError.message : "Failed to delete.");
                  setLoading(false);
                }
              }
            }}
            disabled={loading}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-red-400 hover:bg-red-500/20 disabled:opacity-50"
          >
            Delete Process
          </button>
        )}
      </div>
    </form>
  );
}
