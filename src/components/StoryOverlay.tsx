"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useCallback } from "react";
import { allyStoryChapters } from "@/constants/allyStoryChapters";

interface StoryOverlayProps {
  isOpen: boolean;
  isPinned: boolean;
  activeChapter: number;
  onChapterChange: (index: number) => void;
  onClose: () => void;
}

// Simple silhouette SVG of a person
const CharacterSilhouette = () => (
  <svg
    viewBox="0 0 100 140"
    className="h-24 w-16 opacity-60"
    fill="currentColor"
  >
    {/* Head */}
    <circle cx="50" cy="20" r="18" />
    {/* Body */}
    <path d="M50 40 C30 45 25 70 30 100 L35 100 L40 75 L45 100 L55 100 L60 75 L65 100 L70 100 C75 70 70 45 50 40 Z" />
    {/* Arms */}
    <path d="M30 55 C15 60 10 80 15 95 L20 93 C18 80 22 65 32 60 Z" />
    <path d="M70 55 C85 60 90 80 85 95 L80 93 C82 80 78 65 68 60 Z" />
  </svg>
);

/** @deprecated replaced by ObservationOverlay */
export default function StoryOverlay({
  isOpen,
  isPinned,
  activeChapter,
  onChapterChange,
  onClose,
}: StoryOverlayProps) {
  const chapter = allyStoryChapters[activeChapter];
  const hasVideo = chapter?.videoUrl && chapter.videoUrl.length > 0;

  // Handle Escape key to close when pinned
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPinned) {
        onClose();
      }
    },
    [isPinned, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isPinned ? onClose : undefined}
          />

          {/* Content container */}
          <motion.div
            className="relative z-10 flex max-h-[85vh] w-[min(90vw,600px)] flex-col items-center gap-6 rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-lg"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Close button (visible when pinned) */}
            {isPinned && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 text-white/50 transition hover:text-white"
                aria-label="Close overlay"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Character silhouette + label */}
            <div className="flex items-center gap-4 text-white/80">
              <CharacterSilhouette />
              <div>
                <h3 className="text-lg font-medium tracking-wide">Ally</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Housing (demo)
                </p>
              </div>
            </div>

            {/* Video container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40">
              {hasVideo ? (
                <video
                  key={chapter.videoUrl}
                  className="h-full w-full object-cover"
                  src={chapter.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-sm uppercase tracking-wide text-white/40">
                    Chapter coming soon
                  </p>
                </div>
              )}
            </div>

            {/* Chapter label */}
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Chapter {activeChapter + 1}: {chapter?.label ?? "Unknown"}
            </p>

            {/* Chapter controls */}
            <div className="flex items-center gap-3">
              {allyStoryChapters.map((ch, index) => {
                const isActive = index === activeChapter;
                const hasChapterVideo = ch.videoUrl && ch.videoUrl.length > 0;

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onChapterChange(index)}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                      isActive
                        ? "border-white/60 bg-white/20 text-white"
                        : "border-white/20 bg-white/5 text-white/50 hover:border-white/40 hover:text-white/80"
                    } ${!hasChapterVideo ? "opacity-50" : ""}`}
                    aria-label={`Chapter ${index + 1}: ${ch.label}`}
                  >
                    <span className="text-xs font-medium">{index + 1}</span>
                    {!hasChapterVideo && (
                      <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-yellow-500/80" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hint text */}
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">
              {isPinned ? "Press ESC or click backdrop to close" : "Click to pin"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
