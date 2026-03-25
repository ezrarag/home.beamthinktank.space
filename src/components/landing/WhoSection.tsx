import Link from "next/link";

const AUDIENCE_CARDS = [
  {
    title: "NGOs & Advocacy Orgs",
    description: "Access aggregated research, grant tools, legal templates, and regional cohort infrastructure.",
    cta: "Apply to Join",
    href: "/join",
  },
  {
    title: "Policy Researchers",
    description: "Publish findings into the network, connect with practitioners, and surface data where it gets used.",
    cta: "Share Research",
    href: "/onboard/handoff?role=community&scenarioLabel=Policy%20Research%20Contributor&sourceType=beam_direct&sourceSystem=beam&entryChannel=policy-research&redirectTarget=role_onboarding",
  },
  {
    title: "Community Members",
    description: "Find your city node, see what is happening in your region, and plug into active working groups.",
    cta: "Find Your Region",
    href: "/onboard/community",
  },
];

export function WhoSection() {
  return (
    <section id="about" className="beam-section-anchor beam-card rounded-[30px] p-6 sm:p-8">
      <div className="max-w-3xl">
        <p className="beam-eyebrow">Who BEAM Is For</p>
        <h2 className="beam-display mt-3 text-4xl text-[var(--beam-text-primary)] sm:text-5xl">
          One page, two instincts: prove it or join it.
        </h2>
        <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
          BEAM is built for skeptical researchers who want the evidence visible upfront and for local operators who need
          a concrete path into a working regional network.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {AUDIENCE_CARDS.map((card) => (
          <article
            key={card.title}
            className="rounded-[26px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-5"
          >
            <p className="beam-eyebrow text-[var(--beam-gold)]">{card.title}</p>
            <p className="mt-4 text-sm leading-7 text-[var(--beam-text-secondary)]">{card.description}</p>
            <Link
              href={card.href}
              className="mt-8 inline-flex rounded-full border border-[color:var(--beam-border)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
            >
              {card.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
