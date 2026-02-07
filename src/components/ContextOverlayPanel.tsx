"use client";

import { motion } from "framer-motion";

import { useOverlayNav } from "@/components/OverlayNavProvider";

const CONTEXT_PANEL_CONTENT = {
  label: "Context",
  description:
    "Where you are in the BEAM experience—chapter, style, and point of view. Use this to jump between chapters, switch visual styles, or change character perspective.",
};

export default function ContextOverlayPanel() {
  const { isVisible, activeItem, contextPanelOpen, registerActivity } = useOverlayNav();

  const showPanel = contextPanelOpen || (isVisible && activeItem);
  const displayItem = contextPanelOpen ? CONTEXT_PANEL_CONTENT : activeItem;

  return (
    <motion.aside
      className="pointer-events-none fixed left-1/2 bottom-28 z-50 w-[min(92vw,520px)] -translate-x-1/2"
      initial={{ opacity: 0, y: 16 }}
      animate={showPanel ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-hidden={!showPanel}
    >
      <div
        className="pointer-events-auto rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm text-white/70 shadow-xl backdrop-blur-lg"
        onMouseMove={registerActivity}
      >
        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
          {displayItem?.label}
        </div>
        <div className="mt-2 text-white/70">{displayItem?.description}</div>
        {displayItem && "children" in displayItem && displayItem.children ? (
          <div className="mt-3 grid gap-2 text-sm text-white/80">
            {displayItem.children.map((child: { id: string; label: string }) => (
              <button
                key={child.id}
                type="button"
                className="text-left text-white/70 transition hover:text-white"
              >
                {child.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.aside>
  );
}
