"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";

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

  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        <nav className="division-stack__nav" aria-label="Primary navigation">
          <Link href="/" className="division-stack__brand" aria-label="BEAM home">
            <span>B</span>
            <span>BEAM Think Tank</span>
          </Link>
          {user ? (
            <div ref={dropdownRef} className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 hover:border-white/50 hover:text-white transition focus:outline-none"
              >
                Overview &amp; Tracks <span className="text-[9px] transition-transform duration-200" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0e0e0e]/95 backdrop-blur-md shadow-2xl p-2 z-50 text-left space-y-1">
                  <Link
                    href="/overview"
                    className="block px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Research &amp; Overview ↗
                  </Link>
                  <div className="border-t border-white/10 my-1" />
                  <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-white/40 font-semibold">
                    Admin Tracks
                  </div>
                  <Link
                    href="/admin/grants"
                    className="block px-3 py-2 text-xs text-white/85 hover:text-white hover:bg-white/5 rounded-lg transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Grants Dashboard
                  </Link>
                  <Link
                    href="/admin/architecture"
                    className="block px-3 py-2 text-xs text-white/85 hover:text-white hover:bg-white/5 rounded-lg transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Architecture Dashboard
                  </Link>
                  <Link
                    href="/admin/law"
                    className="block px-3 py-2 text-xs text-white/85 hover:text-white hover:bg-white/5 rounded-lg transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Law Dashboard
                  </Link>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    type="button"
                    onClick={async () => {
                      setDropdownOpen(false);
                      await logout();
                    }}
                    className="w-full text-left block px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/overview">Research &amp; network overview ↗</Link>
          )}
        </nav>
        <div className="division-stack__intro-copy">
          <p className="beam-eyebrow">One institution · many instruments</p>
          <h1 id="divisions-heading" className="beam-display">
            Explore the BEAM ecosystem.
          </h1>
          <div className="division-stack__intro-footer">
            <p>Independent inquiry and coordinated action for stronger local systems.</p>
            <a href="#division-1">Scroll to explore <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </div>

      <div className="division-stack__cards">
        {DIVISIONS.map((division, index) => {
          const isCovered = index < activeIndex;

          return (
            <article
              key={division.name}
              id={`division-${index + 1}`}
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
