"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { homeEntryChapterConfig } from "@/constants/homeEntryChapterConfig";
import { homeEntryVideos } from "@/constants/homeEntryVideos";
import ChapterCinematicOverlay, {
  slugify,
} from "@/components/ChapterCinematicOverlay";
import ExploreOverlay from "@/components/ExploreOverlay";

function capitalizeLabel(label: string): string {
  if (!label.length) return label;
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

const CINEMATIC_AUTO_HIDE_MS = 10000;

export default function HomeEntryGrid() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCinematicOverlay, setShowCinematicOverlay] = useState(true);
  const [userHasInteractedWithCinematic, setUserHasInteractedWithCinematic] =
    useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cinematicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const entry = homeEntryVideos[currentIndex];
  const hasVideo = entry?.videoUrl && entry.videoUrl.length > 0;
  const hasMultipleVideos = homeEntryVideos.length > 1;
  const chapterConfig = entry?.id ? homeEntryChapterConfig[entry.id] : undefined;

  const cinematicTitle =
    chapterConfig?.title ?? (entry?.label ? capitalizeLabel(entry.label) : "");
  const cinematicSubtitle = chapterConfig?.subtitle;
  const cinematicNodes = (chapterConfig?.exploreNodes ?? []).map((label) => ({
    id: slugify(label),
    label,
  }));
  const exploreSectionHeader =
    chapterConfig?.exploreSectionHeader ?? "What BEAM studies here";
  const exploreNodes = chapterConfig?.exploreNodes ?? [];

  const clearCinematicTimeout = useCallback(() => {
    if (cinematicTimeoutRef.current !== null) {
      clearTimeout(cinematicTimeoutRef.current);
      cinematicTimeoutRef.current = null;
    }
  }, []);

  const cancelCinematicAutoFade = useCallback(() => {
    setUserHasInteractedWithCinematic(true);
    clearCinematicTimeout();
  }, [clearCinematicTimeout]);

  const goToNext = useCallback(() => {
    cancelCinematicAutoFade();
    setCurrentIndex((i) => (i + 1) % homeEntryVideos.length);
  }, [cancelCinematicAutoFade]);

  const goToPrev = useCallback(() => {
    cancelCinematicAutoFade();
    setCurrentIndex((i) =>
      i === 0 ? homeEntryVideos.length - 1 : i - 1
    );
  }, [cancelCinematicAutoFade]);

  // Show cinematic overlay when chapter changes; auto-hide after CINEMATIC_AUTO_HIDE_MS unless user interacts
  useEffect(() => {
    if (homeEntryVideos.length === 0) return;
    setShowCinematicOverlay(true);
    setUserHasInteractedWithCinematic(false);
    cinematicTimeoutRef.current = setTimeout(() => {
      setShowCinematicOverlay(false);
      cinematicTimeoutRef.current = null;
    }, CINEMATIC_AUTO_HIDE_MS);
    return clearCinematicTimeout;
  }, [currentIndex, entry?.id, clearCinematicTimeout]);

  // Cancel auto-hide when user activates Explore (hold/hover)
  useEffect(() => {
    if (isActive) cancelCinematicAutoFade();
  }, [isActive, cancelCinematicAutoFade]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const handleChange = () => setIsTouchDevice(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isActive || isTouchDevice) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActive(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isTouchDevice]);

  const handleEnter = useCallback(() => {
    if (isTouchDevice) return;
    setIsActive(true);
  }, [isTouchDevice]);

  const handleLeave = useCallback(() => {
    if (isTouchDevice) return;
    setIsActive(false);
  }, [isTouchDevice]);

  const handleClick = useCallback(() => {
    if (!isTouchDevice) return;
    setIsActive((prev) => !prev);
  }, [isTouchDevice]);

  const handleCinematicNodeClick = useCallback(
    (nodeId: string) => {
      cancelCinematicAutoFade();
      // TODO: implement node -> route mapping
      console.log({ chapter: entry?.id, nodeId });
    },
    [cancelCinematicAutoFade, entry?.id]
  );

  const navButtonLook =
    "pointer-events-auto text-[10px] uppercase tracking-[0.3em] text-white/60 transition hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e0e]";

  return (
    <motion.div
      className="group relative h-full w-full overflow-hidden bg-[#0e0e0e]"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      {hasVideo ? (
        <video
          key={entry.id ?? currentIndex}
          className="absolute inset-0 h-full w-full object-cover"
          src={entry.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
          <p className="text-xs uppercase tracking-wide text-white/30">
            Video coming soon
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

      {homeEntryVideos.length > 0 && showCinematicOverlay && (
        <ChapterCinematicOverlay
          activeKey={entry?.id ?? String(currentIndex)}
          title={cinematicTitle}
          subtitle={cinematicSubtitle}
          nodes={cinematicNodes}
          isReducedMotion={reducedMotion}
          onNodeClick={handleCinematicNodeClick}
          onDone={() => setShowCinematicOverlay(false)}
          cancelAutoFade={userHasInteractedWithCinematic}
        />
      )}

      <ExploreOverlay
        isActive={isActive}
        sectionHeader={exploreSectionHeader}
        exploreNodes={exploreNodes}
        reducedMotion={reducedMotion}
      />

      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5">
        {!isActive && (
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/60 md:hidden">
            Hold to explore
          </span>
        )}
        {hasMultipleVideos && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className={navButtonLook}
            aria-label="Previous video"
          >
            Previous
          </button>
        )}
      </div>

      {hasMultipleVideos && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className={`${navButtonLook} absolute bottom-4 right-4`}
          aria-label="Next video"
        >
          Next
        </button>
      )}
    </motion.div>
  );
}
