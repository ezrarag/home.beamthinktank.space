import Link from "next/link";
import { notFound } from "next/navigation";
import { CentralUmcBuildTracker } from "@/components/use-cases/CentralUmcBuildTracker";
import { getPublishedUseCaseBySlug } from "@/lib/useCases";
import { USE_CASE_STAGES } from "@/lib/useCaseStages";

interface UseCaseDetailPageProps {
  params: Promise<{ slug: string }>;
}

function ToolTags({ tools }: { tools: string[] }) {
  if (tools.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
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

export default async function UseCaseDetailPage({ params }: UseCaseDetailPageProps) {
  const { slug } = await params;
  const useCase = await getPublishedUseCaseBySlug(slug);

  if (!useCase) {
    notFound();
  }

  const stage = USE_CASE_STAGES[useCase.stage];

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/use-cases"
            className="inline-flex rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/78 transition hover:border-white/35 hover:text-white"
          >
            Back To Gallery
          </Link>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ backgroundColor: stage.colorBg, color: stage.colorFg }}
          >
            {stage.label}
          </span>
        </div>

        <header className="mt-8 max-w-4xl">
          <p className="beam-eyebrow">Use Case Detail</p>
          <h1 className="beam-display mt-4 text-5xl text-[var(--beam-text-primary)] sm:text-6xl">{useCase.name}</h1>
          <p className="mt-5 text-lg text-[var(--beam-text-secondary)]">{useCase.context}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[rgba(200,185,122,0.24)] bg-[rgba(200,185,122,0.1)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--beam-gold-bright)]">
              {useCase.economicModel}
            </span>
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--beam-text-secondary)]">
              First action: {useCase.firstAction}
            </span>
          </div>
        </header>

        <section className="mt-10 grid gap-5">
          <div className="beam-card rounded-[30px] p-6 sm:p-8">
            <p className="beam-eyebrow">📱 Capture</p>
            <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{useCase.capture.body}</p>
            <ToolTags tools={useCase.capture.tools} />
          </div>

          <div className="beam-card rounded-[30px] p-6 sm:p-8">
            <p className="beam-eyebrow">💻 Orchestrate</p>
            <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{useCase.orchestrate.body}</p>
            <ToolTags tools={useCase.orchestrate.tools} />
          </div>

          <div className="beam-card rounded-[30px] p-6 sm:p-8">
            <p className="beam-eyebrow">☁️ Produce</p>
            <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{useCase.produce.body}</p>
            <ToolTags tools={useCase.produce.tools} />
          </div>

          <div className="beam-card rounded-[30px] p-6 sm:p-8">
            <p className="beam-eyebrow">💵 Money</p>
            <p className="mt-3 text-sm text-[var(--beam-text-primary)]">{useCase.money.body}</p>
          </div>
        </section>

        {useCase.slug === "central-umc-roof" ? <CentralUmcBuildTracker /> : null}
      </div>
    </main>
  );
}
