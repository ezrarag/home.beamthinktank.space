"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { overlayNavItems } from "@/constants/overlayNavItems";
import { useOverlayNav } from "@/components/OverlayNavProvider";

export default function PrimaryOverlayNav() {
  const { isVisible, registerActivity, setActiveItemId, contextPanelOpen, setContextPanelOpen } =
    useOverlayNav();

  const handleNavItemHover = (id: string | null) => {
    setActiveItemId(id);
    if (id !== null) setContextPanelOpen(false);
  };

  return (
    <motion.nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-6"
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-hidden={!isVisible}
    >
      <div
        className="pointer-events-auto mx-auto flex w-[min(92vw,1080px)] items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/80 backdrop-blur-lg"
        onMouseMove={registerActivity}
        onMouseLeave={() => handleNavItemHover(null)}
        onFocus={registerActivity}
      >
        <div className="flex items-center gap-6">
          {overlayNavItems.map((item) =>
            item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className="text-white/70 transition hover:text-white"
                onMouseEnter={() => handleNavItemHover(item.id)}
                onFocus={() => handleNavItemHover(item.id)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                className="text-white/70 transition hover:text-white"
                onMouseEnter={() => handleNavItemHover(item.id)}
                onFocus={() => handleNavItemHover(item.id)}
              >
                {item.label}
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-4 text-white/60">
          <button
            type="button"
            className="text-xs tracking-wide text-white/60 transition hover:text-white"
            onClick={() => {
              registerActivity();
              setContextPanelOpen(!contextPanelOpen);
            }}
          >
            Context
          </button>
          <button
            type="button"
            className="hidden text-xs tracking-wide text-white/60 transition hover:text-white md:inline"
          >
            Search
          </button>
          <button
            type="button"
            className="text-white/50 transition hover:text-white"
          >
            Sign in
          </button>
          <Link
            href="/onboard/community"
            className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white/70 transition hover:text-white"
            onMouseEnter={() => handleNavItemHover(null)}
          >
            Join BEAM
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
