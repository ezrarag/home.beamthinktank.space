"use client";

import { AnimatePresence, motion } from "framer-motion";
import { chapters } from "@/constants/chapters";
import { lenses } from "@/constants/lenses";

interface ObservationOverlayProps {
  isActive: boolean;
  onSelectLens: (lensId: string) => void;
}

export default function ObservationOverlay({
  isActive,
  onSelectLens,
}: ObservationOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div
            className="mx-3 mb-3 rounded-2xl border border-white/10 bg-black/55 p-4 text-white/90 backdrop-blur-md md:mx-4 md:mb-4 md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                BEAM Think Tank — Observation Mode
              </p>
              <h3 className="text-base font-medium tracking-wide text-white">
                We study patterns of attraction and access.
              </h3>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {lenses.map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => onSelectLens(lens.id)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  {lens.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-white/50">
              {chapters.map((chapter, index) => (
                <span key={chapter.id} className="flex items-center gap-2">
                  <span className="text-white/70">{index + 1}</span>
                  <span>{chapter.label}</span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
