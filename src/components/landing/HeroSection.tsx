"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { curatedFindings } from "@/data/curatedFindings";
import { AnimatedStat } from "@/components/landing/AnimatedStat";
import { PolicyFindingCard } from "@/components/landing/PolicyFindingCard";
import type { PolicyFinding } from "@/lib/pipeline/types";

interface HeroSectionProps {
  activeNodeCount: number;
}

const PILLARS = [
  {
    title: "Aggregate",
    description: "Collect research from leading policy institutions into one readable operating layer.",
  },
  {
    title: "Visualize",
    description: "Organize findings by city, issue, and capacity so local teams can act on them quickly.",
  },
  {
    title: "Connect",
    description: "Bridge researchers, NGOs, and community leaders inside a shared network model.",
  },
];

function getFeaturedFallback(): PolicyFinding[] {
  return curatedFindings.filter((finding) => finding.featured).slice(0, 3);
}

export function HeroSection({ activeNodeCount }: HeroSectionProps) {
  const [findings, setFindings] = useState<PolicyFinding[]>(() => getFeaturedFallback());
  const [activeIndex, setActiveIndex] = useState(0);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFeaturedFindings() {
      try {
        const response = await fetch("/api/findings?featured=true&limit=3");
        if (!response.ok) {
          throw new Error(`Failed to load featured findings: ${response.status}`);
        }

        const payload = (await response.json()) as { findings?: PolicyFinding[] };
        const fetchedFindings = Array.isArray(payload.findings) ? payload.findings : [];

        if (!cancelled && fetchedFindings.length > 0) {
          setFindings(fetchedFindings);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          setFindings(getFeaturedFallback());
        }
      }
    }

    void loadFeaturedFindings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (findings.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % findings.length);
    }, 6000);

    return () => {
      window.clearInterval(id);
    };
  }, [findings.length]);

  useEffect(() => {
    if (!statsRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setStatsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(statsRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="research" className="beam-section-anchor grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="beam-card overflow-hidden rounded-[30px] p-6 sm:p-8">
        <div className="beam-fade-up" style={{ animationDelay: "0s" }}>
          <p className="beam-eyebrow">Public Research Network</p>
        </div>
        <div className="beam-fade-up mt-5" style={{ animationDelay: "0.1s" }}>
          <h1 className="beam-display max-w-3xl text-5xl leading-[0.94] text-[var(--beam-text-primary)] sm:text-6xl lg:text-[4.75rem]">
            Where evidence becomes action.
          </h1>
        </div>
        <div className="beam-fade-up mt-5 max-w-2xl" style={{ animationDelay: "0.2s" }}>
          <p className="text-base leading-7 text-[var(--beam-text-secondary)] sm:text-lg">
            BEAM aggregates policy research from the world&apos;s leading think tanks and connects it to the NGOs,
            advocates, and community leaders who need it, organized by city, issue, and capacity.
          </p>
        </div>

        <div className="beam-fade-up mt-8 grid gap-3 sm:grid-cols-3" style={{ animationDelay: "0.3s" }}>
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-4"
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--beam-gold)]">{pillar.title}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--beam-text-secondary)]">{pillar.description}</p>
            </div>
          ))}
        </div>

        <div className="beam-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.4s" }}>
          <Link
            href="#data-sources"
            className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
          >
            Explore Research
          </Link>
          <Link
            href="#network"
            className="rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-primary)] transition hover:border-[var(--beam-gold)] hover:text-[var(--beam-gold-bright)]"
          >
            Find Your Region
          </Link>
        </div>

        <div ref={statsRef} className="beam-fade-up mt-8 grid gap-3 sm:grid-cols-3" style={{ animationDelay: "0.5s" }}>
          <AnimatedStat label="Documents indexed" target={17} suffix="M+" start={statsVisible} />
          <AnimatedStat label="City nodes online" target={activeNodeCount} suffix="" start={statsVisible} />
          <AnimatedStat label="Research sources tracked" target={800} suffix="+" start={statsVisible} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div>
            <p className="beam-eyebrow">Featured Policy Finding</p>
            <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">Rotating signal from BEAM&apos;s evidence stack.</p>
          </div>
          <div className="flex items-center gap-2">
            {findings.map((finding, index) => (
              <button
                key={finding.headline}
                type="button"
                aria-label={`Show policy finding ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index === activeIndex ? "bg-[var(--beam-gold-bright)]" : "bg-[rgba(240,234,214,0.2)] hover:bg-[rgba(240,234,214,0.45)]"
                }`}
              />
            ))}
          </div>
        </div>

        {findings.length > 0 ? (
          <div className="beam-fade-up" key={findings[activeIndex]?.headline ?? activeIndex}>
            <PolicyFindingCard finding={findings[activeIndex] ?? findings[0]!} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
