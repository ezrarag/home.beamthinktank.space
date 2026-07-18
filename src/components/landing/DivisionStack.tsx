"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_HOMEPAGE_CARDS, type WebsiteDirectoryEntry } from "@/lib/websiteDirectory";

const CARD_PALETTE = [
  { color: "#171a17", accent: "#d6b77a" },
  { color: "#202219", accent: "#bec58c" },
  { color: "#181b25", accent: "#aab8dc" },
  { color: "#142221", accent: "#82c1b6" },
  { color: "#21191d", accent: "#d5a6b5" },
  { color: "#1c1c22", accent: "#c6b6dc" },
] as const;

function fallbackEntries(): WebsiteDirectoryEntry[] {
  return DEFAULT_HOMEPAGE_CARDS.map(({ id, ...entry }) => ({
    ...entry,
    id,
    subtitle: entry.subtitle ?? "",
    previewImageUrl: entry.previewImageUrl ?? "",
    createdBy: "seed",
    updatedBy: "seed",
    source: "internal",
  }));
}

function displayDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function DivisionStack() {
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [divisions, setDivisions] = useState<WebsiteDirectoryEntry[]>(fallbackEntries);
  const [signInError, setSignInError] = useState<string | null>(null);

  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCards() {
      try {
        const response = await fetch("/api/website-directory/internal", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { entries?: WebsiteDirectoryEntry[] };
        const entries = (payload.entries ?? []).filter((entry) => entry.title !== "BEAM Home Site");
        if (!cancelled && entries.length > 0) setDivisions(entries);
      } catch {
        // The curated fallback keeps the public homepage usable during an API outage.
      }
    }
    void loadCards();
    return () => { cancelled = true; };
  }, []);

  async function handleSignIn() {
    setSignInError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
        if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw error;
      }
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Google sign-in failed.");
    }
  }

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
            <span>BEAM Think Tank</span>
          </Link>
          {user ? (
            <div ref={dropdownRef} className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--beam-gold)] font-serif text-base font-semibold text-black transition hover:bg-[var(--beam-gold-bright)] focus:outline-none"
                aria-label="Open profile and tools menu"
                aria-expanded={dropdownOpen}
              >
                {(user.displayName || user.email || "B").trim().charAt(0).toUpperCase()}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0e0e0e]/95 backdrop-blur-md shadow-2xl p-2 z-50 text-left space-y-1">
                  <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-white/40 font-semibold">
                    Admin Tracks
                  </div>
                  <Link
                    href="/workstation"
                    className="block px-3 py-2 text-xs text-[var(--beam-gold-bright)] hover:text-white hover:bg-white/5 rounded-lg transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Catch-Up Workstation
                  </Link>
                  <div className="border-t border-white/10 my-1" />
                  <Link
                    href="/admin"
                    className="block px-3 py-2 text-xs text-white/85 hover:text-white hover:bg-white/5 rounded-lg transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Admin Portal
                  </Link>
                  <div className="border-t border-white/10 my-1" />
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
                  <Link
                    href="/overview"
                    className="block px-3 py-2 text-xs text-[var(--beam-gold-bright)] hover:text-white hover:bg-white/5 rounded-lg transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Manage &amp; Coordinate ↗
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
            <button type="button" onClick={() => void handleSignIn()} className="rounded-full bg-[var(--beam-gold)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-[var(--beam-gold-bright)]">
              Sign In
            </button>
          )}
        </nav>
        {signInError ? <p className="absolute right-[6vw] top-20 text-xs text-red-300">{signInError}</p> : null}
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
        {divisions.map((division, index) => {
          const isCovered = index < activeIndex;
          const palette = CARD_PALETTE[index % CARD_PALETTE.length]!;

          return (
            <article
              key={division.id}
              id={`division-${index + 1}`}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              className={`division-card${isCovered ? " division-card--covered" : ""}`}
              style={
                {
                  "--card-index": index,
                  "--card-color": palette.color,
                  "--card-accent": palette.accent,
                } as React.CSSProperties
              }
            >
              <div className="division-card__noise" aria-hidden="true" />
              <div className="division-card__topline">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{division.title}</span>
                <span>BEAM / DIVISION</span>
              </div>

              <div className="division-card__content">
                <div>
                  <p className="division-card__field">{division.label}</p>
                  <h3 className="beam-display">{division.title}</h3>
                </div>

                <div className="division-card__details">
                  <p>{division.subtitle}</p>
                  <a href={division.url} aria-label={`Visit ${division.title}`}>
                    <span>{displayDomain(division.url)}</span>
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
