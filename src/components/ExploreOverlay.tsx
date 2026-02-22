"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

interface ExploreOverlayProps {
  isActive: boolean;
  reducedMotion: boolean;
}

export default function ExploreOverlay({
  isActive,
  reducedMotion,
}: ExploreOverlayProps) {
  const duration = reducedMotion ? 0 : 0.25;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="pointer-events-auto absolute inset-x-0 top-0 z-20"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{
            duration,
            ease: "easeOut",
          }}
        >
          <div
            className="mx-3 mt-3 rounded-2xl border border-white/10 bg-black/55 p-4 text-white/90 backdrop-blur-md md:mx-4 md:mt-4 md:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Observation Mode
            </p>
            <p className="mt-1 text-sm text-white/80">
              General navigation
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Search
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Sign in
              </button>
              <Link
                href="/onboard/community"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Join BEAM
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Admin portal
              </Link>
              <Link
                href="/participant-dashboard"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Participant dashboard
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
