"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const STAGGER_DELAY_S = 0.3;
const VISIBLE_DURATION_MS = 8000;
const FADE_OUT_DURATION_MS = 2000;
const TITLE_FADE_IN_S = 0.4;

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export interface ChapterCinematicNode {
  id: string;
  label: string;
}

export interface ChapterCinematicOverlayProps {
  activeKey: string;
  title: string;
  subtitle?: string;
  nodes: ChapterCinematicNode[];
  isReducedMotion: boolean;
  onNodeClick: (nodeId: string) => void;
  onDone?: () => void;
  /** When true, cancel the auto-fade timer so the overlay stays until chapter change */
  cancelAutoFade?: boolean;
}

export default function ChapterCinematicOverlay({
  activeKey,
  title,
  subtitle,
  nodes,
  isReducedMotion,
  onNodeClick,
  onDone,
  cancelAutoFade = false,
}: ChapterCinematicOverlayProps) {
  const [phase, setPhase] = useState<"visible" | "fading">("visible");

  const staggerDelay = isReducedMotion ? 0 : STAGGER_DELAY_S;
  const fadeOutDuration = isReducedMotion ? 0 : FADE_OUT_DURATION_MS / 1000;
  const titleDuration = isReducedMotion ? 0 : TITLE_FADE_IN_S;

  // When chapter changes (activeKey), reset phase
  useEffect(() => {
    setPhase("visible");
  }, [activeKey]);

  // After VISIBLE_DURATION_MS, start fade-out; then call onDone after fade. Skip when user has interacted (cancelAutoFade).
  useEffect(() => {
    if (cancelAutoFade) return;

    const visibleMs = isReducedMotion ? 500 : VISIBLE_DURATION_MS;
    const t1 = window.setTimeout(() => {
      setPhase("fading");
    }, visibleMs);

    const fadeMs = isReducedMotion ? 0 : FADE_OUT_DURATION_MS;
    const t2 = window.setTimeout(() => {
      onDone?.();
    }, visibleMs + fadeMs);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [activeKey, isReducedMotion, onDone, cancelAutoFade]);

  const handleNodeClick = useCallback(
    (nodeId: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeClick(nodeId);
    },
    [onNodeClick]
  );

  return (
    <motion.div
      key={activeKey}
      className="pointer-events-none absolute inset-0 z-10"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === "fading" ? 0 : 1 }}
      transition={{
        duration: phase === "fading" ? fadeOutDuration : 0,
        ease: "easeOut",
      }}
      onAnimationComplete={() => {
        if (phase === "fading") onDone?.();
      }}
    >
      <div className="absolute left-6 top-6 max-w-[85vw] sm:left-8 sm:top-8 md:left-10 md:top-10 md:max-w-md">
        <motion.div
          className="pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: titleDuration, ease: "easeOut" }}
        >
          <h2 className="font-sans text-3xl font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 font-sans text-sm text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {subtitle}
            </p>
          )}
        </motion.div>

        <motion.ul
          className="mt-6 flex flex-col gap-2 [pointer-events:auto]"
          role="list"
          aria-label="Explore topics"
        >
          {nodes.map((node, index) => (
            <motion.li
              key={node.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: isReducedMotion ? 0 : 0.3,
                delay: isReducedMotion ? 0 : index * staggerDelay,
                ease: "easeOut",
              }}
            >
              <button
                type="button"
                onClick={handleNodeClick(node.id)}
                className="text-left font-sans text-sm text-white/85 transition hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:underline"
              >
                {node.label}
              </button>
            </motion.li>
          ))}
        </motion.ul>

        <motion.p
          className="pointer-events-none mt-6 font-sans text-[10px] uppercase tracking-[0.2em] text-white/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: titleDuration,
            delay: isReducedMotion ? 0 : nodes.length * staggerDelay + 0.2,
          }}
        >
          Hold to explore
        </motion.p>
      </div>
    </motion.div>
  );
}

export { slugify };
