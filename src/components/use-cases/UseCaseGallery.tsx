"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { USE_CASE_STAGES, USE_CASE_STAGE_ORDER, type UseCase, type UseCaseStage } from "@/lib/useCaseStages";

interface UseCaseGalleryProps {
  useCases: UseCase[];
}

function chunkUseCases(useCases: UseCase[], size: number): UseCase[][] {
  const rows: UseCase[][] = [];
  for (let index = 0; index < useCases.length; index += size) {
    rows.push(useCases.slice(index, index + size));
  }
  return rows;
}

function stageBadgeStyle(stage: UseCaseStage) {
  const config = USE_CASE_STAGES[stage];
  return {
    backgroundColor: config.colorBg,
    color: config.colorFg,
  };
}

function ToolTags({ tools }: { tools: string[] }) {
  if (tools.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tools.map((tool) => (
        <span
          key={tool}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/62"
        >
          {tool}
        </span>
      ))}
    </div>
  );
}

export function UseCaseGallery({ useCases }: UseCaseGalleryProps) {
  const [activeStage, setActiveStage] = useState<UseCaseStage | "all">("all");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const filteredUseCases = useMemo(() => {
    return activeStage === "all" ? useCases : useCases.filter((useCase) => useCase.stage === activeStage);
  }, [activeStage, useCases]);

  const rows = useMemo(() => chunkUseCases(filteredUseCases, 2), [filteredUseCases]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveStage("all")}
          className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition"
          style={{
            borderColor: activeStage === "all" ? "rgba(200, 185, 122, 0.55)" : "rgba(255,255,255,0.12)",
            backgroundColor: activeStage === "all" ? "rgba(200, 185, 122, 0.12)" : "rgba(255,255,255,0.03)",
            color: activeStage === "all" ? "var(--beam-gold-bright)" : "rgba(240,234,214,0.78)",
          }}
        >
          All
        </button>
        {USE_CASE_STAGE_ORDER.map((stage) => {
          const config = USE_CASE_STAGES[stage];
          const isActive = activeStage === stage;

          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition"
              style={{
                borderColor: isActive ? config.colorFg : "rgba(255,255,255,0.12)",
                backgroundColor: isActive ? config.colorBg : "rgba(255,255,255,0.03)",
                color: isActive ? config.colorFg : "rgba(240,234,214,0.78)",
              }}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-5">
        {rows.map((row) => {
          const expandedUseCase = row.find((item) => item.slug === openSlug) ?? null;

          return (
            <div key={row.map((item) => item.slug).join(":")} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {row.map((useCase) => {
                  const isOpen = openSlug === useCase.slug;

                  return (
                    <article
                      key={useCase.slug}
                      className="beam-card rounded-[28px] p-6 transition hover:-translate-y-0.5 hover:border-[rgba(200,185,122,0.45)]"
                    >
                      <button type="button" onClick={() => setOpenSlug(isOpen ? null : useCase.slug)} className="block w-full text-left">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="beam-eyebrow">Use Case</p>
                            <h2 className="mt-3 text-2xl font-semibold text-[var(--beam-text-primary)]">{useCase.name}</h2>
                            <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">{useCase.context}</p>
                          </div>
                          <span
                            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={stageBadgeStyle(useCase.stage)}
                          >
                            {USE_CASE_STAGES[useCase.stage].label}
                          </span>
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[var(--beam-text-primary)]">
                          📱 Capture <span className="text-white/35">→</span> 💻 Orchestrate{" "}
                          <span className="text-white/35">→</span> ☁️ Produce
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-[rgba(200,185,122,0.24)] bg-[rgba(200,185,122,0.1)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--beam-gold-bright)]">
                            {useCase.economicModel}
                          </span>
                          <span className="text-xs uppercase tracking-[0.16em] text-[var(--beam-text-secondary)]">
                            First action: {useCase.firstAction}
                          </span>
                        </div>
                      </button>

                      <div className="mt-5 flex justify-end">
                        <Link
                          href={`/use-cases/${useCase.slug}`}
                          className="rounded-full border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/80 transition hover:border-white/35 hover:text-white"
                        >
                          Open Detail
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              {expandedUseCase ? (
                <div className="beam-card rounded-[30px] p-6 sm:p-8">
                  <div className="grid gap-5">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                      <p className="beam-eyebrow">📱 Capture</p>
                      <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{expandedUseCase.capture.body}</p>
                      <ToolTags tools={expandedUseCase.capture.tools} />
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                      <p className="beam-eyebrow">💻 Orchestrate</p>
                      <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{expandedUseCase.orchestrate.body}</p>
                      <ToolTags tools={expandedUseCase.orchestrate.tools} />
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                      <p className="beam-eyebrow">☁️ Produce</p>
                      <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{expandedUseCase.produce.body}</p>
                      <ToolTags tools={expandedUseCase.produce.tools} />
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                      <p className="beam-eyebrow">💵 Money</p>
                      <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{expandedUseCase.money.body}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {filteredUseCases.length === 0 ? (
          <div className="beam-card rounded-[28px] p-8 text-center">
            <p className="beam-eyebrow">No Matches</p>
            <p className="mt-3 text-sm text-[var(--beam-text-secondary)]">
              No published use cases match this stage yet.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
