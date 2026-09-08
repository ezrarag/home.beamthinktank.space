import Link from "next/link";

// BEAM <-> credit union structural map. Static by design (no Firestore, no
// admin sign-in) so it can be shared with Nathaniel and read on any device.
//
// This page exists to answer one question: a credit union charters SEPARATELY
// from BEAM, so what exactly is BEAM on the hook for? Each phase below pairs
// the NCUA requirement with the BEAM-side obligation and the primary source to
// read against it.

type Standing = "beam_ready" | "beam_owes" | "unknown";

type Obligation = {
  requirement: string;
  beamSide: string;
  standing: Standing;
};

type Phase = {
  number: string;
  title: string;
  ncuaClock: string;
  summary: string;
  obligations: Obligation[];
};

const PHASES: Phase[] = [
  {
    number: "01",
    title: "Field of membership",
    ncuaClock: "60-day NCUA review goal",
    summary:
      "Before anything else, NCUA has to approve who the credit union is allowed to serve. This is the phase where BEAM matters most — BEAM is the answer to that question.",
    obligations: [
      {
        requirement: "Define an approvable common bond",
        beamSide:
          "BEAM participants are an associational common bond. This is the structural coupling between the two entities — the credit union's field of membership is defined by BEAM membership.",
        standing: "beam_owes",
      },
      {
        requirement: "Demonstrate the association is real and pre-existing",
        beamSide:
          "NCUA looks skeptically at associations formed primarily to manufacture a field of membership. BEAM must show members, purpose, and activity independent of banking. The 30-50 participant recruitment in Atlanta and Milwaukee is not parallel to this effort — it is the prerequisite for it.",
        standing: "beam_owes",
      },
      {
        requirement: "Document the association's own governance",
        beamSide:
          "Bylaws, membership criteria, and a defined process for how someone becomes and stops being a BEAM participant. Currently informal.",
        standing: "beam_owes",
      },
    ],
  },
  {
    number: "02",
    title: "Full charter application",
    ncuaClock: "No published clock — the long pole",
    summary:
      "Subscribers, capital, market analysis, business plan with pro formas, bylaws, and operational policies. Mostly the credit union organizers' work, but three items land squarely on BEAM.",
    obligations: [
      {
        requirement: "Evidence of critical sponsor commitments",
        beamSide:
          "This is the agreement Nathaniel described. BEAM is the sponsor organization — NCUA requires written evidence of what the sponsor will provide and for how long. Read this clause carefully before signing: it can obligate BEAM financially and in perpetuity.",
        standing: "beam_owes",
      },
      {
        requirement: "Donated capital",
        beamSide:
          "New credit unions need non-repayable seed capital. A 501(c)(3) BEAM can legitimately provide this — financial inclusion is a recognized charitable purpose — but it has to be budgeted, and it cannot be a loan.",
        standing: "unknown",
      },
      {
        requirement: "Subscribers and member surveys",
        beamSide:
          "Signed subscribers plus survey evidence that the field of membership actually wants and will use the institution. BEAM's participant database is where these come from.",
        standing: "beam_owes",
      },
    ],
  },
  {
    number: "03",
    title: "Final approval",
    ncuaClock: "180-day goal from Phase 2 completion",
    summary:
      "Remaining forms, organizational documents, a signed Letter of Understanding with NCUA, then charter and share insurance.",
    obligations: [
      {
        requirement: "Letter of Understanding with NCUA",
        beamSide:
          "Signed by the credit union, not BEAM — but BEAM's sponsor commitments are referenced in it, so BEAM's obligations become enforceable at this point.",
        standing: "unknown",
      },
      {
        requirement: "Ongoing separation of governance",
        beamSide:
          "BEAM cannot own the credit union. Members own it, one member one vote, with its own board answerable to NCUA. Overlapping directors need a documented conflict policy on both sides.",
        standing: "beam_owes",
      },
    ],
  },
];

type Designation = {
  name: string;
  what: string;
  why: string;
};

const DESIGNATIONS: Designation[] = [
  {
    name: "Low-Income Designation (LICU)",
    what:
      "An NCUA designation available when a majority of members meet low-income thresholds.",
    why:
      "Unlocks secondary capital, acceptance of non-member deposits, and grant eligibility. BEAM's charitable class very likely qualifies. Worth pursuing from the start rather than retrofitting.",
  },
  {
    name: "CDFI certification",
    what:
      "A separate track through the Treasury's CDFI Fund, not NCUA.",
    why:
      "Has its own grant money and is often faster to first dollars than a full charter. Worth asking whether it is a bridge to the charter rather than a competing effort.",
  },
];

type Source = {
  label: string;
  cite: string;
  href: string;
  read: string;
};

const SOURCES: Source[] = [
  {
    label: "Federal Credit Union Act",
    cite: "12 U.S.C. Sec. 1751 et seq.",
    href: "https://www.law.cornell.edu/uscode/text/12/chapter-14",
    read:
      "The statute itself. Sec. 1759 is the field-of-membership section — the part that governs whether BEAM can serve as the common bond.",
  },
  {
    label: "Chartering and Field of Membership Manual",
    cite: "Appendix B to 12 CFR Part 701",
    href: "https://www.ecfr.gov/current/title-12/chapter-VII/subchapter-A/part-701/appendix-Appendix%20B%20to%20Part%20701",
    read:
      "The operative rulebook. Chapter 1 covers charter types and the associational common bond; Chapter 2 covers field-of-membership expansion.",
  },
  {
    label: "Starting a New Federal Credit Union",
    cite: "NCUA, Office of Credit Union Resources and Expansion",
    href: "https://ncua.gov/support-services/credit-union-resources-expansion/starting-new-federal-credit-union",
    read:
      "The three-phase process, the CAPRIS submission system, and the office to call: 703.518.1150 / NewFCU@ncua.gov.",
  },
  {
    label: "Adding associations to a field of membership",
    cite: "NCUA guidance letter",
    href: "https://ncua.gov/regulation-supervision/letters-credit-unions-other-guidance/how-add-associations-your-field-membership",
    read:
      "The totality-of-circumstances test NCUA applies to decide whether an association is legitimate or was formed to game the field of membership. Read this one against BEAM honestly.",
  },
];

const STANDING_STYLES: Record<Standing, string> = {
  beam_ready: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  beam_owes: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  unknown: "border-white/20 bg-white/5 text-white/60",
};

const STANDING_LABELS: Record<Standing, string> = {
  beam_ready: "BEAM ready",
  beam_owes: "BEAM owes",
  unknown: "Ask Nathaniel",
};

const QUESTIONS = [
  "Which phase are we actually in — has anything been submitted to NCUA yet?",
  "Who are the named subscribers, and how many are BEAM participants?",
  "Is there donated capital identified, and is anyone expecting BEAM to supply it?",
  "Has anyone spoken to NCUA's Office of Credit Union Resources and Expansion directly?",
  "Are we pursuing the Low-Income Designation from the start?",
  "Is CDFI certification a bridge here, or a distraction?",
  "What exactly does the sponsor agreement obligate BEAM to — in dollars, and for how long?",
  "Who sits on both boards, and what is the conflict policy on each side?",
];

export default function AdminCreditUnionPage() {
  const owed = PHASES.reduce(
    (sum, phase) => sum + phase.obligations.filter((o) => o.standing === "beam_owes").length,
    0
  );

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Credit Union</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            A credit union charters separately from BEAM and cannot be owned by it. This page maps what NCUA
            requires at each phase against what BEAM is actually on the hook for, with the primary source to read
            beside each one.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-amber-200">
              {owed} obligations on BEAM
            </span>
            <Link
              href="/admin/structure"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Structure
            </Link>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Back To Admin
            </Link>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-[var(--beam-gold,#c9a961)]/30 bg-[var(--beam-gold,#c9a961)]/[0.06] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--beam-gold,#c9a961)]">The structural fact</p>
          <p className="mt-3 text-base leading-7 text-white/85">
            BEAM does not own the credit union — members do, one member one vote, under a board answerable to
            NCUA. BEAM&rsquo;s two roles are narrower and both have names:{" "}
            <strong className="text-white">sponsor organization</strong> (the entity making written commitments
            NCUA can rely on) and <strong className="text-white">associational common bond</strong> (the thing
            that defines who is eligible to be a member at all).
          </p>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Everything on this page follows from those two roles. Where BEAM has an obligation, it is because of
            one or the other.
          </p>
        </section>

        <section className="mt-8 space-y-6">
          {PHASES.map((phase) => (
            <article key={phase.number} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-xs text-white/40">{phase.number}</span>
                <h2 className="text-lg font-medium sm:text-xl">{phase.title}</h2>
                <span className="ml-auto font-mono text-[11px] text-white/35">{phase.ncuaClock}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-white/65">{phase.summary}</p>

              <ul className="mt-5 space-y-3">
                {phase.obligations.map((obligation) => (
                  <li key={obligation.requirement} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <p className="text-sm font-medium text-white/90">{obligation.requirement}</p>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STANDING_STYLES[obligation.standing]}`}
                      >
                        {STANDING_LABELS[obligation.standing]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/55">{obligation.beamSide}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">Designations worth raising</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {DESIGNATIONS.map((designation) => (
              <article
                key={designation.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h3 className="text-sm font-medium text-white/90">{designation.name}</h3>
                <p className="mt-2 text-xs leading-5 text-white/55">{designation.what}</p>
                <p className="mt-3 text-xs leading-5 text-[var(--beam-gold,#c9a961)]/90">{designation.why}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">Primary sources</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            The documents to actually read, and what to read them for.
          </p>
          <ul className="mt-5 space-y-3">
            {SOURCES.map((source) => (
              <li key={source.label} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[var(--beam-gold,#c9a961)] underline-offset-4 hover:underline"
                >
                  {source.label}
                </a>
                <p className="mt-1 font-mono text-[11px] text-white/40">{source.cite}</p>
                <p className="mt-2 text-xs leading-5 text-white/55">{source.read}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium sm:text-xl">Questions for Nathaniel</h2>
          <ol className="mt-4 space-y-2">
            {QUESTIONS.map((question, index) => (
              <li
                key={question}
                className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/75"
              >
                <span className="font-mono text-xs text-white/35">{String(index + 1).padStart(2, "0")}</span>
                {question}
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6">
          <p className="text-xs leading-5 text-white/40">
            Nothing on this page is legal advice, and the standing markers are BEAM&rsquo;s current read rather
            than anything NCUA has confirmed. The sponsor agreement in particular should be reviewed by counsel
            before signature — it is the clause that can bind BEAM financially for years.
          </p>
        </footer>
      </div>
    </main>
  );
}
