"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ContextSource, ExplainerClip } from "@/types/grantConsole";

interface BEAMGrantsConsoleProps {
  signedInUser?: { name: string; title: string };
  contextSources: ContextSource[];
  activePursuitsCount: number;
  peopleWorkingCount: number;
  presencePullText: string;
  onCommandSubmit: (cmd: string) => void;
  onAttachClick: () => void;
  isCollapsed: boolean;
  onSummonRoster: () => void;
  onReturnToLanding: () => void;
}

const TYPEWRITER_PHRASES = [
  "Search federal funding for community health programs…",
  "Check eligibility and match requirements…",
  "Score the fit on this NOFO…",
  "Draft a narrative section…",
];

const DEFAULT_EXPLAINER_CLIPS: ExplainerClip[] = [
  {
    id: "clip-1",
    title: "What this console does",
    durationSeconds: 5,
    durationLabel: "0:05",
    targetSectionId: "console-hero",
    mediaUrl:
      "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/admin-grants%2Fclip1.mp4?alt=media&token=e46b12ed-54da-4156-af7b-b8e3a8996e1a",
  },
  {
    id: "clip-2",
    title: "How context sources work",
    durationSeconds: 6,
    durationLabel: "0:06",
    targetSectionId: "context-sources-card",
    mediaUrl:
      "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/admin-grants%2Fclip2.mp4?alt=media&token=6fd0aa75-bca5-473b-8a06-240b525cfde4",
  },
  {
    id: "clip-3",
    title: "What fit scoring measures",
    durationSeconds: 5,
    durationLabel: "0:05",
    targetSectionId: "score-command",
    mediaUrl:
      "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/admin-grants%2Fclip3.mp4?alt=media&token=0603eb68-e1cd-49c7-8212-cd4cba65784d",
  },
  {
    id: "clip-4",
    title: "Slash commands & routing",
    durationSeconds: 7,
    durationLabel: "0:07",
    targetSectionId: "slash-bar",
    mediaUrl:
      "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/admin-grants%2Fclip4.mp4?alt=media&token=c6f22317-48d5-45b4-8a81-f41dd21c4c3f",
  },
];

export function BEAMGrantsConsole({
  signedInUser = { name: "DeTania", title: "Research Co-Lead" },
  contextSources,
  activePursuitsCount,
  peopleWorkingCount,
  presencePullText,
  onCommandSubmit,
  onAttachClick,
  isCollapsed,
  onSummonRoster,
  onReturnToLanding,
}: BEAMGrantsConsoleProps) {
  const [commandInput, setCommandInput] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  // Typewriter Animation State
  const [placeholderText, setPlaceholderText] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const phraseIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setReducedMotion(true);
      setPlaceholderText(TYPEWRITER_PHRASES[0]!);
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const tick = () => {
      const currentPhrase = TYPEWRITER_PHRASES[phraseIndexRef.current]!;

      if (!isDeletingRef.current) {
        charIndexRef.current += 1;
        setPlaceholderText(currentPhrase.slice(0, charIndexRef.current));

        if (charIndexRef.current === currentPhrase.length) {
          isDeletingRef.current = true;
          timeoutId = setTimeout(tick, 1800); // Hold phrase 1.8s
          return;
        }
        timeoutId = setTimeout(tick, 45); // Typing speed ~45ms
      } else {
        charIndexRef.current -= 1;
        setPlaceholderText(currentPhrase.slice(0, charIndexRef.current));

        if (charIndexRef.current === 0) {
          isDeletingRef.current = false;
          phraseIndexRef.current = (phraseIndexRef.current + 1) % TYPEWRITER_PHRASES.length;
          timeoutId = setTimeout(tick, 400); // Pause before next phrase
          return;
        }
        timeoutId = setTimeout(tick, 25); // Deleting speed ~25ms
      }
    };

    timeoutId = setTimeout(tick, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Listen for Esc key to return to State A (Landing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCollapsed) {
        onReturnToLanding();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed, onReturnToLanding]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    if (commandInput.trim().toLowerCase() === "/roster") {
      onSummonRoster();
      setCommandInput("");
      return;
    }

    onCommandSubmit(commandInput.trim());
    setCommandInput("");
  };

  const handleSlashClick = (command: string) => {
    if (command === "/roster") {
      onSummonRoster();
      return;
    }
    setCommandInput(command + " ");
  };

  // Caret Animation Class
  const caretClass = reducedMotion
    ? "opacity-100"
    : "animate-[beamCaret_1.06s_step-end_infinite]";

  const activeClip = DEFAULT_EXPLAINER_CLIPS.find((c) => c.id === activeClipId);

  // 1. STATE B (Collapsed Slim Top Bar)
  if (isCollapsed) {
    return (
      <div className="w-full border-b border-[#14140e] bg-[#050505] px-6 py-3 transition-all duration-300 font-mono text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-[#5a5448]">
            <span className="uppercase tracking-widest text-[10px]">BEAM / GRANTS CONSOLE</span>
            <span className="text-[#3a3428]">|</span>
            <span className="text-[var(--beam-gold)]">Session Active</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={onReturnToLanding}
              className="text-[10px] uppercase tracking-widest text-[#6f685a] hover:text-white transition cursor-pointer"
            >
              [Console Landing (Esc) ↑]
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. STATE A (Full-Height Console Landing View)
  return (
    <div className="relative w-full border-b border-[#14140e] bg-gradient-to-b from-[#050505] to-[#08080a] text-white transition-all font-mono">
      <div className="mx-auto flex max-w-7xl flex-col px-5 py-6 sm:px-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#14140e] pb-4">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5a5448]">
            BEAM / GRANTS CONSOLE
          </span>

          <div className="relative flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[#5a5448]">
              {signedInUser.name} · {signedInUser.title}
            </span>

            {/* Help Explainer Toggle */}
            <button
              type="button"
              onClick={() => setIsExplainerOpen(!isExplainerOpen)}
              className="flex items-center space-x-1.5 text-[9.5px] uppercase tracking-[0.14em] text-[#c8b97a] hover:text-white transition cursor-pointer"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8b97a" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M10 8.5l6 3.5-6 3.5z" fill="#c8b97a" stroke="none" />
              </svg>
              <span>What&apos;s on this page · 4 clips</span>
            </button>

            {/* Explainer Dropdown Menu */}
            {isExplainerOpen && (
              <div className="absolute top-10 right-0 z-50 w-80 sm:w-96 rounded-xl border border-[#23221a] bg-[#0c0c08] p-1.5 shadow-2xl transition-all">
                <div className="flex items-center justify-between border-b border-[#16160f] px-3 py-2 text-[9px] uppercase tracking-widest text-[#3a3428]">
                  <span>EXPLAINERS</span>
                  <button
                    type="button"
                    onClick={() => setIsAudioOnly(!isAudioOnly)}
                    className="text-[#6f685a] hover:text-[#c8b97a] transition cursor-pointer"
                  >
                    {isAudioOnly ? "audio only [✓]" : "audio + video"}
                  </button>
                </div>

                {/* Active Video Player View */}
                {activeClip && activeClip.mediaUrl && (
                  <div className="p-2 border-b border-[#16160f] space-y-2 bg-black/60 rounded-lg my-1">
                    <div className="flex items-center justify-between text-[10px] text-[var(--beam-gold)]">
                      <span className="font-bold">NOW PLAYING: {activeClip.title}</span>
                      <button
                        type="button"
                        onClick={() => setActiveClipId(null)}
                        className="text-[#6f685a] hover:text-white"
                      >
                        [Close ✕]
                      </button>
                    </div>
                    {isAudioOnly ? (
                      <audio controls autoPlay src={activeClip.mediaUrl} className="w-full h-8" />
                    ) : (
                      <video
                        controls
                        autoPlay
                        src={activeClip.mediaUrl}
                        className="w-full h-48 rounded border border-white/10 object-cover"
                      />
                    )}
                  </div>
                )}

                <div className="divide-y divide-[#101009] font-sans">
                  {DEFAULT_EXPLAINER_CLIPS.map((clip) => {
                    const isPlaying = activeClipId === clip.id;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => setActiveClipId(isPlaying ? null : clip.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs transition cursor-pointer ${
                          isPlaying
                            ? "bg-[rgba(200,185,122,0.12)] text-[#f0ead6]"
                            : "text-[#a29885] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isPlaying ? "#c8b97a" : "#5a5448"}
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path
                              d="M10 8.5l6 3.5-6 3.5z"
                              fill={isPlaying ? "#c8b97a" : "#5a5448"}
                              stroke="none"
                            />
                          </svg>
                          <span className="font-medium">{clip.title}</span>
                        </div>
                        <span className="font-mono text-[9.5px] text-[#c8b97a]">
                          {isPlaying ? "PLAYING..." : clip.durationLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Console Hero & Display Headline */}
        <div className="my-6 flex flex-col gap-4" id="console-hero">
          <h1 className="font-serif font-normal text-3xl sm:text-5xl leading-[1.08] tracking-tight text-[#f0ead6]">
            Give it the source.<br />
            <span className="text-[#c8b97a]">Get back a plan.</span>
          </h1>

          <div className="flex items-center space-x-2 text-xs text-[#6f685a] font-sans">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c8b97a" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M10 8.5l6 3.5-6 3.5z" fill="#c8b97a" stroke="none" />
            </svg>
            <span>Internal funding capture console</span>
            <span className="font-mono text-[10px] text-[#3a3428]">0:05</span>
          </div>
        </div>

        {/* Context-Source Cards Container */}
        <div className="mb-6 rounded-lg border border-[#14140e] bg-white/[0.014]" id="context-sources-card">
          <div className="flex items-center justify-between border-b border-[#14140e] px-4 py-2.5 text-[9px] uppercase tracking-widest text-[#3a3428]">
            <span className="flex items-center space-x-2">
              <span>Context · {contextSources.length ? `${contextSources.length} sources` : "no sources yet"}</span>
            </span>
            <button
              type="button"
              onClick={onAttachClick}
              className="text-[#c8b97a] hover:underline uppercase tracking-widest cursor-pointer"
            >
              + attach
            </button>
          </div>

          {contextSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-3 border-dashed border-[#1e1e14]">
              <p className="max-w-xl font-sans text-xs text-[#6f685a] leading-relaxed">
                Drop a NOFO, a résumé, a partner profile, an article, or a photo. Or paste a link.
                The console reads it and builds the plan around it.
              </p>
              <button
                type="button"
                onClick={onAttachClick}
                className="inline-flex items-center space-x-2 rounded border border-[#23221a] px-3 py-1.5 text-[10.5px] uppercase tracking-widest text-[#c8b97a] hover:border-[#c8b97a] transition"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c8b97a" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>Attach Source File</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#101009] text-xs">
              {contextSources.map((source) => (
                <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center space-x-3">
                    <span className="w-8 text-[#c8b97a] font-bold uppercase">{source.type}</span>
                    <span className="text-[#f0ead6] font-medium">{source.name}</span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-[11px] text-[#6f685a]">{source.shortDescription}</span>
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        source.status === "ready"
                          ? "text-emerald-400"
                          : source.status === "fetching"
                          ? "text-[var(--beam-gold)] animate-pulse"
                          : "text-red-400"
                      }`}
                    >
                      {source.status === "fetching"
                        ? `fetching ${source.progressPercent || 62}%`
                        : source.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Bar with Animated Typewriter Placeholder & Opacity-only Caret */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center space-x-3 border-y border-[#23221a] py-4 my-2 focus-within:border-[var(--beam-gold)] transition"
        >
          <span className="text-base font-bold text-[#c8b97a]">&gt;</span>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={commandInput}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setCommandInput(e.target.value)}
              className="w-full bg-transparent text-sm text-[#f0ead6] focus:outline-none font-mono z-10"
            />

            {/* Typewriter Placeholder & Opacity-Only Caret */}
            {!commandInput && !isInputFocused && (
              <div className="absolute inset-0 pointer-events-none flex items-center text-sm text-[#8a8070] font-mono">
                <span>{placeholderText}</span>
                <span className={`inline-block w-2 h-4 ml-0.5 bg-[var(--beam-gold)] ${caretClass}`} />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="shrink-0 text-[10px] uppercase tracking-widest text-[#3a3428] hover:text-[#c8b97a] transition font-bold cursor-pointer"
          >
            ↩ RUN
          </button>
        </form>

        {/* Slash Command Bar */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs pt-2 text-[11px]"
          id="slash-bar"
        >
          <div className="flex flex-wrap items-center gap-3">
            {[
              "/search",
              "/eligibility",
              "/match",
              "/score",
              "/draft",
              "/attach",
              "/roster",
            ].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => handleSlashClick(cmd)}
                className="text-[#6f685a] hover:text-[#c8b97a] transition font-mono cursor-pointer"
              >
                <span className="text-[#c8b97a]">/</span>
                {cmd.slice(1)}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-[#3a3428] uppercase tracking-wider">
            DRAG FILES ONTO CONSOLE · ENTER TO RUN
          </span>
        </div>

        {/* STATE A Quiet Presence Line */}
        <div className="mt-4 pt-3 border-t border-[#16160f] flex items-center justify-between text-[11px] font-mono text-[#6f685a]">
          <button
            type="button"
            onClick={onSummonRoster}
            className="flex items-center space-x-2 text-left hover:text-[var(--beam-gold-bright)] transition cursor-pointer group"
          >
            <span className="text-[var(--beam-gold)] font-bold">{activePursuitsCount} ACTIVE PURSUITS</span>
            <span>·</span>
            <span>{peopleWorkingCount} PEOPLE WORKING NOW</span>
            <span>·</span>
            <span className="text-[#8a8070] italic">{presencePullText}</span>
            <span>·</span>
            <span className="text-[var(--beam-gold)] font-bold group-hover:translate-y-0.5 transition-transform">
              ROSTER ↓
            </span>
          </button>

          <span className="text-[10px] text-[#3a3428] uppercase tracking-widest hidden sm:inline">
            CLICK ROSTER ↓ OR TYPE /ROSTER
          </span>
        </div>
      </div>
    </div>
  );
}
