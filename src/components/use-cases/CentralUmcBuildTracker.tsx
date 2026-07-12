interface PipelineStage {
  icon: string;
  name: string;
  status: string;
  statusTone: "done" | "active" | "blocked" | "wait";
  description: string;
  tools: readonly string[];
  isActive: boolean;
  isBlocked: boolean;
}

const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    icon: "📱",
    name: "Capture",
    status: "Not started",
    statusTone: "wait",
    description: "Photograph the building, the roof, site conditions. Laser scan with architecture faculty.",
    tools: ["GroundsField", "iPhone", "Laser scan"],
    isActive: false,
    isBlocked: false,
  },
  {
    icon: "💻",
    name: "Orchestrate",
    status: "Ready to work",
    statusTone: "active",
    description: "Repos built. Next: historic-roofline research in the Central UMC notebook — no dependencies, do it today.",
    tools: ["NotebookLM", "Cursor/Codex", "Repos"],
    isActive: true,
    isBlocked: false,
  },
  {
    icon: "☁️",
    name: "Produce",
    status: "Account ready",
    statusTone: "wait",
    description: "RunPod set up to the Pods screen. No pod deployed — correct. Waits on reference photos from research.",
    tools: ["RunPod · Pods", "ComfyUI", "Flux"],
    isActive: false,
    isBlocked: false,
  },
  {
    icon: "🌐",
    name: "Publish",
    status: "Blocked",
    statusTone: "blocked",
    description: "The project page can't load data — Firestore returns 403 / the collection isn't visible. Project-mismatch audit pending.",
    tools: ["Grounds repo", "Firestore"],
    isActive: false,
    isBlocked: true,
  },
];

const STACK_COLUMNS = [
  {
    title: "📦 Repos & routes",
    rows: [
      { tone: "done", title: "Grounds — /projects/central-umc", note: "Page + phases + equity slots built. Rules written." },
      { tone: "done", title: "Home — /use-cases", note: "Gallery built. Verify it on the Home port, not :3000." },
      { tone: "wait", title: "Admin connectors (cohort-mapping, deals)", note: "Designed. Build after the page is live." },
    ],
  },
  {
    title: "🔌 Infrastructure",
    rows: [
      { tone: "blocked", title: "Firebase — which project?", note: "Suspected mismatch: seed wrote to a different project than the console you're viewing." },
      { tone: "active", title: "RunPod — Pods path", note: "Account ready, no pod running. Nothing to bill." },
      { tone: "active", title: "NotebookLM — reorganize", note: "Split the \"beam\" junk-drawer into scoped notebooks." },
    ],
  },
] as const;

const CRITICAL_PATH = [
  { tone: "blocked", title: "Get the page rendering", note: "Run the audit script, fix the Firebase project, confirm phases + slots load.", tag: "blocker" },
  { tone: "active", title: "Historic-roofline research", note: "Archival photos of the original roof + comparable reuse projects. No dependencies — start today.", tag: "research" },
  { tone: "wait", title: "Feasibility & condition assessment", note: "Laser scan + structural report with Krissie Meingast & William Krueger.", tag: "faculty" },
  { tone: "wait", title: "Restoration render", note: "Flux render of the restored building — the fundraising centerpiece. Needs research photos first.", tag: "produce" },
  { tone: "wait", title: "Use & fundraise plan", note: "Concert series in the church; dual recording + rehearsal space.", tag: "planning" },
] as const;

function toneClasses(tone: "done" | "active" | "blocked" | "wait") {
  if (tone === "done") return "bg-[#79B45F]";
  if (tone === "active") return "bg-[#E0A93F]";
  if (tone === "blocked") return "bg-[#DC6B4F]";
  return "bg-[#74705F]";
}

function statusClasses(tone: "done" | "active" | "blocked" | "wait") {
  if (tone === "done") return "bg-[rgba(121,180,95,0.13)] text-[#79B45F]";
  if (tone === "active") return "bg-[rgba(224,169,63,0.15)] text-[#E0A93F]";
  if (tone === "blocked") return "bg-[rgba(220,107,79,0.15)] text-[#DC6B4F]";
  return "bg-[rgba(116,112,95,0.16)] text-[#B6B1A0]";
}

export function CentralUmcBuildTracker() {
  return (
    <section className="mt-14">
      <header>
        <p className="beam-eyebrow text-[var(--beam-gold)]">BEAM · Build pipeline</p>
        <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)] sm:text-5xl">Where you are in the chain</h2>
        <p className="mt-4 max-w-3xl text-sm text-[var(--beam-text-secondary)] sm:text-base">
          Every use case runs the same loop: capture in the field, orchestrate at the laptop, produce in the cloud, publish to the site.
          Central UMC is the project moving through it now.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-4 border-t border-[var(--beam-border-dim)] pt-5 text-[11px] text-[var(--beam-text-secondary)]">
        {[
          ["done", "Done"],
          ["active", "In progress / ready"],
          ["blocked", "Blocked"],
          ["wait", "Waiting on an earlier step"],
        ].map(([tone, label]) => (
          <span key={tone} className="flex items-center gap-2">
            <span className={`h-[9px] w-[9px] rounded-full ${toneClasses(tone as "done" | "active" | "blocked" | "wait")}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PIPELINE_STAGES.map((stage, index) => (
          <article
            key={stage.name}
            className={`relative flex min-h-[188px] flex-col rounded-2xl border p-4 ${
              stage.isActive
                ? "border-[#E0A93F] shadow-[0_0_0_1px_rgba(224,169,63,0.25),0_6px_30px_-12px_rgba(224,169,63,0.4)]"
                : stage.isBlocked
                  ? "border-[#DC6B4F]"
                  : "border-[var(--beam-border)]"
            } bg-[var(--surface)]`}
          >
            {stage.isActive ? (
              <span className="absolute -top-2 left-3 rounded-full bg-[#E0A93F] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#1A1505]">
                You are here
              </span>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl">{stage.icon}</span>
              <span className={`rounded-full px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] ${statusClasses(stage.statusTone)}`}>
                {stage.status}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-[var(--beam-text-primary)]">{stage.name}</h3>
            <p className="mt-2 text-[12px] leading-5 text-[var(--beam-text-secondary)]">{stage.description}</p>
            <div className="mt-auto flex flex-wrap gap-1 pt-4">
              {stage.tools.map((tool) => (
                <span key={tool} className="rounded-md bg-[var(--surface-tertiary)] px-2 py-1 font-mono text-[9.5px] text-[var(--beam-text-secondary)]">
                  {tool}
                </span>
              ))}
            </div>
            {index < PIPELINE_STAGES.length - 1 ? (
              <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-[13px] text-[var(--beam-text-dim)] xl:block">→</span>
            ) : null}
          </article>
        ))}
      </div>

      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--beam-text-dim)]">The stack underneath</p>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {STACK_COLUMNS.map((column) => (
          <section key={column.title} className="rounded-xl border border-[var(--beam-border)] bg-[var(--surface)] p-4">
            <h3 className="text-sm font-semibold text-[var(--beam-text-primary)]">{column.title}</h3>
            <div className="mt-3 space-y-1">
              {column.rows.map((row) => (
                <div key={row.title} className="flex gap-3 border-b border-[var(--beam-border-dim)] py-3 last:border-b-0">
                  <span className={`mt-1 h-[9px] w-[9px] rounded-full ${toneClasses(row.tone)}`} />
                  <div>
                    <p className="text-sm text-[var(--beam-text-primary)]">{row.title}</p>
                    <p className="mt-1 text-[11px] text-[var(--beam-text-dim)]">{row.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--beam-text-dim)]">Central UMC — Phase 1 critical path</p>
      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--beam-border)] bg-[var(--surface)]">
        {CRITICAL_PATH.map((task) => (
          <div key={task.title} className="grid grid-cols-[16px_1fr_auto] items-start gap-3 border-b border-[var(--beam-border-dim)] px-4 py-3 last:border-b-0">
            <span className={`mt-1 h-[9px] w-[9px] rounded-full ${toneClasses(task.tone)}`} />
            <div>
              <p className="text-sm text-[var(--beam-text-primary)]">{task.title}</p>
              <p className="mt-1 text-[11px] text-[var(--beam-text-secondary)]">{task.note}</p>
            </div>
            <span className="pt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--beam-text-dim)]">{task.tag}</span>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--beam-gold)] bg-[linear-gradient(135deg,rgba(200,185,122,0.10),rgba(200,185,122,0.03))] p-6">
        <p className="beam-eyebrow text-[var(--beam-gold-bright)]">Single next action</p>
        <h3 className="mt-3 text-2xl font-semibold text-[var(--beam-text-primary)]">Run the Firestore audit</h3>
        <p className="mt-3 max-w-3xl text-sm text-[var(--beam-text-secondary)]">
          Add <code className="rounded-md bg-black/35 px-2 py-1 font-mono text-[12px] text-[var(--beam-gold-bright)]">scripts/audit-firestore.ts</code>, run{" "}
          <code className="rounded-md bg-black/35 px-2 py-1 font-mono text-[12px] text-[var(--beam-gold-bright)]">npm run audit:firestore</code>, and read off the project it writes to.
          Cross-check that against your app&apos;s <code className="rounded-md bg-black/35 px-2 py-1 font-mono text-[12px] text-[var(--beam-gold-bright)]">projectId</code> and the project open in the console.
        </p>
        <p className="mt-4 border-t border-[rgba(200,185,122,0.2)] pt-4 text-sm text-[var(--beam-text-secondary)]">
          <span className="font-medium text-[#DC6B4F]">Why blocked:</span> the page 403s / the target collection isn&apos;t visible in the console.
          Most likely the seed and the console are pointed at two different Firebase projects.
        </p>
      </section>
    </section>
  );
}
