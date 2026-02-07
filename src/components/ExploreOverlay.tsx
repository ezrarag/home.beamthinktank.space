"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ExploreOverlayProps {
  isActive: boolean;
  sectionHeader: string;
  exploreNodes: string[];
  reducedMotion: boolean;
}

export default function ExploreOverlay({
  isActive,
  sectionHeader,
  exploreNodes,
  reducedMotion,
}: ExploreOverlayProps) {
  const duration = reducedMotion ? 0 : 0.25;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{
            duration,
            ease: "easeOut",
          }}
        >
          <div
            className="mx-3 mb-3 rounded-2xl border border-white/10 bg-black/55 p-4 text-white/90 backdrop-blur-md md:mx-4 md:mb-4 md:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              {sectionHeader}
            </p>
            <ul className="mt-4 space-y-2" role="list">
              {exploreNodes.map((label, index) => (
                <li key={`${label}-${index}`}>
                  <span
                    className="inline-block cursor-default border-b border-transparent py-0.5 text-sm text-white/90 transition-[border-color,text-shadow] hover:border-white/50 hover:text-white"
                    role="text"
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
