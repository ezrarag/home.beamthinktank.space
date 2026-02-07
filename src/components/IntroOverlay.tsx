"use client";

/**
 * @deprecated Replaced by ChapterCinematicOverlay for the homepage 4-chapter narrative.
 * This component is kept for reference only and is not used.
 */
import { AnimatePresence, motion } from "framer-motion";

const INTRO_DURATION_MS = 1800;
const FADE_OUT_DURATION_MS = 400;

interface IntroOverlayProps {
  isVisible: boolean;
  title: string;
  subtitle?: string;
  reducedMotion: boolean;
}

export default function IntroOverlay({
  isVisible,
  title,
  subtitle,
  reducedMotion,
}: IntroOverlayProps) {
  const exitDuration = reducedMotion ? 0 : FADE_OUT_DURATION_MS / 1000;
  const exitTransition = {
    duration: exitDuration,
    ease: "easeOut" as const,
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30"
          initial={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: reducedMotion ? 1 : 0.98,
            transition: exitTransition,
          }}
          transition={{ duration: exitDuration, ease: "easeOut" }}
          aria-live="polite"
          aria-label={`Chapter: ${title}`}
        >
          <div className="text-center">
            <h2 className="font-sans text-4xl font-semibold tracking-tight text-white drop-shadow-md sm:text-5xl md:text-6xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 font-sans text-sm font-normal tracking-wide text-white/80 sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { INTRO_DURATION_MS, FADE_OUT_DURATION_MS };
