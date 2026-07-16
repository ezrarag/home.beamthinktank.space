"use client";

import { useEffect, useRef, useState } from "react";

const DIVISIONS = [
  {
    name: "Forge",
    domain: "forge.beamthinktank.space",
    href: "https://forge.beamthinktank.space",
    description: "A working studio for turning public-interest ideas into durable tools, programs, and institutions.",
    field: "Venture & systems studio",
    color: "#171a17",
    accent: "#d6b77a",
  },
  {
    name: "Grounds",
    domain: "grounds.beamthinktank.space",
    href: "https://grounds.beamthinktank.space",
    description: "Place-based intelligence shaped by the people, histories, and conditions that define a community.",
    field: "Local knowledge commons",
    color: "#202219",
    accent: "#bec58c",
  },
  {
    name: "Orchestra",
    domain: "orchestra.beamthinktank.space",
    href: "https://orchestra.beamthinktank.space",
    description: "Coordinated action across disciplines—aligning contributors, resources, and timing around shared outcomes.",
    field: "Collective action engine",
    color: "#181b25",
    accent: "#aab8dc",
  },
  {
    name: "Network",
    domain: "network.beamthinktank.space",
    href: "#network",
    description: "A living map of people and organizations moving practical knowledge between cities and sectors.",
    field: "People & place infrastructure",
    color: "#142221",
    accent: "#82c1b6",
  },
  {
    name: "Research",
    domain: "research.beamthinktank.space",
    href: "/research",
    description: "Independent inquiry that translates complex evidence into clear choices for local leaders and communities.",
    field: "Evidence & policy",
    color: "#21191d",
    accent: "#d5a6b5",
  },
] as const;

export function DivisionStack() {
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const observers = cardRefs.current.map((card, index) => {
      if (!card) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIndex(index);
        },
        { rootMargin: "-20% 0px -55% 0px", threshold: 0 },
      );

      observer.observe(card);
      return observer;
    });

    return () => observers.forEach((observer) => observer?.disconnect());
  }, []);

  return (
    <section className="division-stack" aria-labelledby="divisions-heading">
      <div className="division-stack__intro">
        <p className="beam-eyebrow">One institution · many instruments</p>
        <h2 id="divisions-heading" className="beam-display">
          Explore the BEAM ecosystem.
        </h2>
        <p>Scroll to move through five connected divisions.</p>
      </div>

      <div className="division-stack__cards">
        {DIVISIONS.map((division, index) => {
          const isCovered = index < activeIndex;

          return (
            <article
              key={division.name}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              className={`division-card${isCovered ? " division-card--covered" : ""}`}
              style={
                {
                  "--card-index": index,
                  "--card-color": division.color,
                  "--card-accent": division.accent,
                } as React.CSSProperties
              }
            >
              <div className="division-card__noise" aria-hidden="true" />
              <div className="division-card__topline">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{division.name}</span>
                <span>BEAM / DIVISION</span>
              </div>

              <div className="division-card__content">
                <div>
                  <p className="division-card__field">{division.field}</p>
                  <h3 className="beam-display">{division.name}</h3>
                </div>

                <div className="division-card__details">
                  <p>{division.description}</p>
                  <a href={division.href} aria-label={`Visit ${division.name}`}>
                    <span>{division.domain}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

              <div className="division-card__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
