import Link from "next/link";

// BEAM's structural reference. Intentionally static (no Firestore, no admin
// sign-in) so it always renders with zero setup — this is the page to open
// when the shape of the organization stops being obvious.
//
// Decided 2026-09: BEAM is an acronym for the four colleges of a university.
// This replaces the legacy "Building Excellence in Arts and Music" expansion
// still live in orchestra/ and transportation/ footers.

type College = {
  letter: string;
  name: string;
  charge: string;
  studies: string;
  divisions: string[];
};

const COLLEGES: College[] = [
  {
    letter: "B",
    name: "Business",
    charge: "Capital, exchange, and the instruments that move them.",
    studies: "Studies the plant's balance sheet — what the land, vehicles, and facilities cost, earn, and are worth.",
    divisions: ["business", "finance", "fcu", "insurance", "marketplace", "retail", "trade", "tourism"],
  },
  {
    letter: "E",
    name: "Education & Humanities",
    charge: "Curriculum, credentialing, law, and the record of why any of it matters.",
    studies: "Studies the plant as a classroom — every building is a site where something is taught and documented.",
    divisions: ["education", "literacy", "library", "law", "regulations", "relations", "theology", "skills"],
  },
  {
    letter: "A",
    name: "Arts & Sciences",
    charge: "Performance, making, health, land, and inquiry.",
    studies: "Studies the plant as material — soil, acoustics, structure, bodies, and what can be grown or built on it.",
    divisions: [
      "orchestra", "band", "choir", "dance", "theatre", "culture", "apparel",
      "architecture", "science", "health", "care", "environment", "agri", "sports",
    ],
  },
  {
    letter: "M",
    name: "Mass Media",
    charge: "The record, the broadcast, and the intelligence layer.",
    studies: "Studies the plant as a subject — documents each cohort's revolution so the next one inherits evidence, not folklore.",
    divisions: ["media", "entertainment", "intelligence", "innovation"],
  },
];

const PLANT = [
  "forge", "manufacturing", "grounds", "housing", "transportation",
  "logistics", "energy", "landscaping", "food", "port", "aviation",
  "mining", "transfer",
];

const COMMONS = ["home", "hood"];

const PARKED = ["defense", "security", "relief", "travel"];

type DecisionState = "settled" | "open" | "counsel";

type Decision = {
  question: string;
  position: string;
  state: DecisionState;
};

const DECISIONS: Decision[] = [
  {
    question: "One entity or many?",
    position:
      "One 501(c)(3). Colleges and divisions are programs, not separate corporations. Fifty entities is fifty sets of books.",
    state: "settled",
  },
  {
    question: "Church status under the IRS 14-point test?",
    position:
      "No — but not for funding reasons. Churches do receive foundation, federal, and municipal money. The problem is that BEAM's claim is academic, and you cannot credibly file as a university and a church at once. Pursue school status instead.",
    state: "settled",
  },
  {
    question: "What kind of public charity?",
    position:
      "Target §170(b)(1)(A)(ii) educational-organization status — the academic parallel to a church's automatic classification. Requires regular faculty, curriculum, an enrolled body, and a place where instruction happens. Fall back to §170(b)(1)(A)(vi) on the public support test, where hood's patron base is the evidence.",
    state: "open",
  },
  {
    question: "Do participants ever pay?",
    position:
      "No. Participants contribute labor, never money. The moment they pay, they are customers and the thesis inverts.",
    state: "settled",
  },
  {
    question: "Direction of money between BEAM and ReadyAimGo",
    position:
      "ReadyAimGo pays BEAM (sponsorship of a cohort), never the reverse. Still a related-party transaction requiring board recusal and Schedule L disclosure — but the safe direction.",
    state: "settled",
  },
  {
    question: "Sweat equity: housing and transport in exchange for work",
    position:
      "Unresolved. Can create taxable income to the participant and trigger wage, minimum-wage, and workers' comp obligations. Needs a nonprofit attorney before any housing is assigned.",
    state: "counsel",
  },
  {
    question: "Land: hold directly or spin a land trust?",
    position:
      "Hold the first parcel directly inside BEAM. Spin a separate BEAM Land Trust with a tripartite board once there is a second parcel.",
    state: "settled",
  },
  {
    question: "The credit union",
    position:
      "Charters separately through NCUA — BEAM cannot own it. BEAM is the sponsor organization and the associational common bond that defines its field of membership.",
    state: "open",
  },
  {
    question: "Board composition",
    position:
      "Needs a majority with no financial relationship to Ezra or ReadyAimGo. Anyone doing staff work cannot count toward that majority.",
    state: "open",
  },
];

const STATE_STYLES: Record<DecisionState, string> = {
  settled: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  open: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  counsel: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

const STATE_LABELS: Record<DecisionState, string> = {
  settled: "Settled",
  open: "Open",
  counsel: "Needs counsel",
};

function DivisionChips({ items }: { items: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {items.map((division) => (
        <span
          key={division}
          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-[11px] text-white/60"
        >
          {division}
        </span>
      ))}
    </div>
  );
}

export default function AdminStructurePage() {
  const mapped =
    COLLEGES.reduce((sum, college) => sum + college.divisions.length, 0) +
    PLANT.length +
    COMMONS.length;

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Structure</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            What BEAM is, what the letters mean, where every division sits, and which structural questions are
            still open. Open this when the shape of the organization stops being obvious.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85">
              {mapped} divisions mapped
            </span>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Back To Admin
            </Link>
            <Link
              href="/admin/neighbor-layer"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Neighbor Layer
            </Link>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-[var(--beam-gold,#c9a961)]/30 bg-[var(--beam-gold,#c9a961)]/[0.06] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--beam-gold,#c9a961)]">The sentence</p>
          <p className="mt-3 text-xl font-medium leading-snug sm:text-2xl">
            You do real work on real projects, and the network gives you a place to live, food, a ride, training,
            and a record that proves it.
          </p>
          <p className="mt-4 text-sm leading-6 text-white/70">
            The mechanism underneath it, stated plainly: <strong className="text-white/90">a church collects from
            its members in exchange for access. BEAM collects from non-participants so that participants get in
            free.</strong> Everywhere else in America, being inside a building requires an expressed transactional
            reason. BEAM builds the exception and asks the people who can afford it to hold the door.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">The four colleges</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            BEAM is an acronym for the divisions of a university. This is a deliberate claim: it is what lets BEAM
            file as an educational organization rather than a general charity, and it is why there are fifty
            subdomains — they are departments.
          </p>

          <div className="mt-5 space-y-4">
            {COLLEGES.map((college) => (
              <article
                key={college.letter}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl text-[var(--beam-gold,#c9a961)]">{college.letter}</span>
                  <h3 className="text-lg font-medium sm:text-xl">{college.name}</h3>
                  <span className="ml-auto font-mono text-xs text-white/35">
                    {college.divisions.length}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-white/70">{college.charge}</p>
                <p className="mt-2 max-w-2xl text-xs italic text-white/45">{college.studies}</p>
                <DivisionChips items={college.divisions} />
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">The physical plant</h2>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <p className="max-w-2xl text-sm leading-6 text-white/70">
              The plant is not a college. It is the campus — the land, buildings, vehicles, kitchens, and shops
              that every college depends on and none of them owns. Kept deliberately separate for a reason:{" "}
              <strong className="text-white/90">the plant is the constant that each cohort studies.</strong>
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Cohorts turn over on a six-year revolution. The plant does not. That means a cohort arriving in year
              seven can read what the previous cohort measured, built, and got wrong about the same barn, the same
              vans, the same soil — which is the difference between a program and an institution. It is the
              teaching-hospital model, and the land-grant model: the farm is both the operation and the laboratory.
            </p>
            <DivisionChips items={PLANT} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">The commons</h2>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <p className="max-w-2xl text-sm leading-6 text-white/70">
              Neither college nor plant. <span className="font-mono text-white/85">home</span> is the identity
              layer — one profile per person, the registry every other site reads.{" "}
              <span className="font-mono text-white/85">hood</span> is the membrane where money enters: neighbors
              subscribe, and their money buys named things for named participants. hood is currently the only
              BEAM site whose public description matches what BEAM actually is.
            </p>
            <DivisionChips items={COMMONS} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">Parked</h2>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <p className="max-w-2xl text-sm leading-6 text-white/70">
              Reserved in DNS, unassigned on purpose. Each needs a decision to be made or the name released.{" "}
              <span className="font-mono text-white/85">security</span> should mean information and asset security
              or be retired outright — a private protective force is the fastest available way to lose the
              organization, on liability alone.
            </p>
            <DivisionChips items={PARKED} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">Structural decisions</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Positions taken so far, and what is still unresolved. Everything marked open blocks a section of the
            Form 1023 narrative.
          </p>
          <ul className="mt-5 space-y-3">
            {DECISIONS.map((decision) => (
              <li
                key={decision.question}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <p className="text-sm font-medium text-white/90">{decision.question}</p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATE_STYLES[decision.state]}`}
                  >
                    {STATE_LABELS[decision.state]}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/55">{decision.position}</p>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6">
          <p className="text-xs leading-5 text-white/40">
            Known inconsistency: orchestra and transportation still render &ldquo;Building Excellence in Arts and
            Music&rdquo; and a &ldquo;&copy; 2024 BEAM Orchestra&rdquo; footer — transportation&rsquo;s is a
            verbatim copy of orchestra&rsquo;s. home&rsquo;s public landing still describes BEAM as a policy-research
            aggregator. Three different organizations, three different sites. Fixing that copy is downstream of
            this page.
          </p>
        </footer>
      </div>
    </main>
  );
}
