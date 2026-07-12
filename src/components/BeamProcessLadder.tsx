"use client";

import { useState } from "react";

import type { BeamProcess, BeamProcessStage, BeamProcessStageStatus } from "@/types/beamProcess";

interface BeamProcessLadderProps {
  process: BeamProcess;
}

const DOT_CLASSES: Record<BeamProcessStageStatus, string> = {
  complete: "border-[#79B45F] bg-[#79B45F]",
  active: "border-[#DC6B4F] bg-[#DC6B4F] shadow-[0_0_0_4px_rgba(220,107,79,0.12)]",
  idle: "border-[#74705F] bg-[#74705F]",
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StageDetail({ stage }: { stage: BeamProcessStage }) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--beam-border-dim)] bg-[var(--surface-secondary)] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--beam-text-primary)]">{stage.label}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--beam-text-dim)]">
          Updated {formatUpdatedAt(stage.updatedAt)}
        </p>
      </div>
      <p className="mt-2 text-xs text-[var(--beam-text-secondary)]">
        <span className="text-[var(--beam-text-dim)]">Owner:</span> {stage.owner}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--beam-text-secondary)]">{stage.note || "No note added."}</p>
    </div>
  );
}

export function BeamProcessLadder({ process }: BeamProcessLadderProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const selectedStage = process.stages.find((stage) => stage.id === selectedStageId) ?? null;
  const fundingPercent = process.funding
    ? Math.min(100, Math.max(0, (process.funding.raisedUsd / Math.max(process.funding.targetUsd, 1)) * 100))
    : 0;

  return (
    <section className="beam-card rounded-xl p-4" aria-label={`${process.title} process stages`}>
      <h3 className="text-sm font-semibold text-[var(--beam-text-primary)]">{process.title}</h3>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex min-w-max items-start">
          {process.stages.map((stage, index) => {
            const nextStage = process.stages[index + 1];
            const connectorComplete = stage.status === "complete" && nextStage?.status === "complete";
            const isSelected = stage.id === selectedStageId;

            return (
              <div key={stage.id} className="flex items-start">
                <button
                  type="button"
                  className="group flex w-24 flex-col items-center gap-2 text-center"
                  aria-expanded={isSelected}
                  aria-label={`${stage.label}: ${stage.status}`}
                  onClick={() => setSelectedStageId(isSelected ? null : stage.id)}
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full border transition-transform group-hover:scale-110 ${DOT_CLASSES[stage.status]} ${
                      isSelected ? "ring-2 ring-[var(--beam-gold-bright)] ring-offset-2 ring-offset-[var(--beam-bg-elevated)]" : ""
                    }`}
                  />
                  <span className="max-w-24 text-[10px] leading-4 text-[var(--beam-text-secondary)]">{stage.label}</span>
                </button>

                {nextStage ? (
                  <span
                    aria-hidden="true"
                    className={`mt-[6px] h-px w-8 border-t ${
                      connectorComplete ? "border-solid border-[#79B45F]" : "border-dashed border-[#74705F]"
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {selectedStage ? <StageDetail stage={selectedStage} /> : null}

      {process.funding ? (
        <div className="mt-4 border-t border-[var(--beam-border-dim)] pt-4">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--beam-text-muted)]"
            role="progressbar"
            aria-label={process.funding.label}
            aria-valuemin={0}
            aria-valuemax={process.funding.targetUsd}
            aria-valuenow={process.funding.raisedUsd}
          >
            <div className="h-full rounded-full bg-[var(--beam-gold)]" style={{ width: `${fundingPercent}%` }} />
          </div>
          <p className="mt-2 font-mono text-[10px] text-[var(--beam-text-secondary)]">
            {formatUsd(process.funding.raisedUsd)} / {formatUsd(process.funding.targetUsd)} — {process.funding.label}
          </p>
        </div>
      ) : null}
    </section>
  );
}
