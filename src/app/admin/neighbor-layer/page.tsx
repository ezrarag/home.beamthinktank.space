import Link from "next/link";

// Update the `status` field on each item below as work actually lands in the
// repos it names. This page is intentionally static (no Firestore, no admin
// sign-in) so it always renders correctly with zero setup — it's a punch
// list, not a live data console. See the published plan artifact
// ("The Neighbor Layer") for the full reasoning behind each phase.

type ItemStatus = "done" | "in_progress" | "todo";

interface ChecklistItem {
  label: string;
  detail: string;
  status: ItemStatus;
}

interface Phase {
  number: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

const PHASES: Phase[] = [
  {
    number: "01",
    title: "Register everyone with home",
    description:
      "Every division needs a home-side organizationId before anything downstream can reference it. Pure data — no new infrastructure, no other repo touched.",
    items: [
      {
        label: "Add the 8 missing divisions to ORGANIZATION_CATALOG",
        detail: "src/lib/participantDashboard.ts — hood, grounds, forge, law, dance, education, transportation, business",
        status: "done",
      },
      {
        label: "Add matching entries to BEAM_HANDOFF_PRESETS",
        detail: "src/lib/beamHandoff.ts — one preset per division, entryChannel set to that site's subdomain",
        status: "done",
      },
      {
        label: "Redeploy home",
        detail: "Registry only goes live once beamthinktank.space redeploys with these changes",
        status: "todo",
      },
      {
        label: "Confirm each spoke site actually links back with its preset",
        detail: "Today only orchestra's own code references a BEAM handoff preset — check hood, grounds, and the rest",
        status: "todo",
      },
    ],
  },
  {
    number: "02",
    title: "Shared profile core",
    description:
      "One canonical identity per participant, with each division's own fields hanging off it instead of duplicating name/email.",
    items: [
      {
        label: "Define BeamProfile",
        detail: "Alongside ParticipantProfile in src/types/participantIdentity.ts (home)",
        status: "todo",
      },
      {
        label: "Migrate hood's participantProfiles",
        detail: "hood's Firestore collection (keyed by email) starts referencing BeamProfile.id instead of duplicating identity",
        status: "todo",
      },
      {
        label: "Wire signup flows to create-or-link a BeamProfile",
        detail: "hood's Supabase/Google OAuth signup, orchestra's SMS auth, etc. — each needs to call this on first signup",
        status: "todo",
      },
    ],
  },
  {
    number: "03",
    title: "Presence + support surface",
    description:
      "Family and friends see a participant active on a division site and can show up for them — on hood's existing public profile page.",
    items: [
      {
        label: "presenceSessions collection + shared heartbeat endpoint",
        detail: "New, lives in home's existing Firebase project — no new backend",
        status: "todo",
      },
      {
        label: "PresenceVisibilitySetting on the participant",
        detail: "public / supporters / off toggle — participant-controlled, off by default",
        status: "todo",
      },
      {
        label: "Heartbeat call from each spoke site",
        detail: "~30–60s while a tab is open, tagged with the BeamProfile id",
        status: "todo",
      },
      {
        label: "Presence + actions on hood's participant page",
        detail: "Status line, \"back them now\" (existing Stripe flow), \"send a message\" (new, lightweight)",
        status: "todo",
      },
    ],
  },
  {
    number: "04",
    title: "Project-entry readiness engine",
    description:
      "A hood community-project entry knows, at a glance, whether its roster, funding, and real estate are actually in place.",
    items: [
      {
        label: "Generalize the readiness schema",
        detail: "roleSlots (from grounds' EquitySlot) + resourceTargets (from hood's own service_tiers)",
        status: "todo",
      },
      {
        label: "linkedPropertyIds",
        detail: "Reference grounds' property/acquisition-site records — link, don't copy",
        status: "todo",
      },
      {
        label: "Manual signOff gate",
        detail: "Tied to hood's existing governance leadership roles, not a generic admin flag",
        status: "todo",
      },
      {
        label: "Computed readiness status in hood's UI",
        detail: "Not ready → Filling → Ready for review → Active, derived automatically except the final sign-off",
        status: "todo",
      },
    ],
  },
  {
    number: "05",
    title: "Supporter notification layer",
    description:
      "Once the presence feed is trusted, opted-in supporters don't have to keep checking back.",
    items: [
      {
        label: "Direct notification on a presence event",
        detail: "Email or push to a supporter who's opted in, when their participant goes active",
        status: "todo",
      },
      {
        label: "Decide where a supporter's message lands",
        detail: "Inbox inside hood, an email forward, or both — open decision, see below",
        status: "todo",
      },
    ],
  },
];

const OPEN_DECISIONS = [
  "Does home formally become the identity hub, with hood as a consumer of it?",
  "Who has standing to grant a project's staff sign-off — which governance roles qualify?",
  "Do per-viewer visibility overrides (\"always show my mom\") ship at launch, or does the public/supporters/off toggle cover it first?",
  "Where does a supporter's message actually land for the participant?",
];

function StatusPill({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus, string> = {
    done: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    in_progress: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    todo: "border-white/15 bg-white/[0.03] text-white/50",
  };
  const labels: Record<ItemStatus, string> = {
    done: "Done",
    in_progress: "In progress",
    todo: "To do",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function AdminNeighborLayerPage() {
  const totalItems = PHASES.reduce((sum, phase) => sum + phase.items.length, 0);
  const doneItems = PHASES.reduce(
    (sum, phase) => sum + phase.items.filter((item) => item.status === "done").length,
    0
  );

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The Neighbor Layer</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            Cross-site presence, one shared profile, and community-project readiness — the full punch list, phase by
            phase, with the specific repo and files each item touches.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85">
              {doneItems} / {totalItems} items done
            </span>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Back To Admin
            </Link>
            <Link
              href="/admin/participant-identity"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Participant Identity
            </Link>
          </div>
        </header>

        <section className="mt-8 space-y-6">
          {PHASES.map((phase) => (
            <article key={phase.number} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-white/40">{phase.number}</span>
                <h2 className="text-lg font-medium sm:text-xl">{phase.title}</h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-white/65">{phase.description}</p>

              <ul className="mt-5 space-y-3">
                {phase.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-white/90">{item.label}</p>
                      <p className="mt-1 text-xs text-white/50">{item.detail}</p>
                    </div>
                    <StatusPill status={item.status} />
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="text-lg font-medium sm:text-xl">Still open</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/65">
              Not blocking phase 1, but worth deciding before phases 3–5 start.
            </p>
            <ul className="mt-4 space-y-2">
              {OPEN_DECISIONS.map((decision) => (
                <li key={decision} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
                  {decision}
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
