"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { overlayNavItems } from "@/constants/overlayNavItems";

type OverlayNavItem = (typeof overlayNavItems)[number];

type OverlayNavContextValue = {
  isVisible: boolean;
  activeItem: OverlayNavItem | null;
  registerActivity: () => void;
  setActiveItemId: (id: OverlayNavItem["id"] | null) => void;
  contextPanelOpen: boolean;
  setContextPanelOpen: (open: boolean) => void;
};

const OverlayNavContext = createContext<OverlayNavContextValue | null>(null);

export function OverlayNavProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeItemId, setActiveItemId] = useState<OverlayNavItem["id"] | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = useCallback(() => {
    clearTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setActiveItemId(null);
    }, 6500);
  }, []);

  const registerActivity = useCallback(() => {
    setIsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const activeItem = useMemo(
    () => overlayNavItems.find((item) => item.id === activeItemId) ?? null,
    [activeItemId]
  );

  const value = useMemo(
    () => ({
      isVisible,
      activeItem,
      registerActivity,
      setActiveItemId,
      contextPanelOpen,
      setContextPanelOpen,
    }),
    [isVisible, activeItem, registerActivity, contextPanelOpen]
  );

  return <OverlayNavContext.Provider value={value}>{children}</OverlayNavContext.Provider>;
}

export function useOverlayNav() {
  const context = useContext(OverlayNavContext);
  if (!context) {
    throw new Error("useOverlayNav must be used within OverlayNavProvider");
  }
  return context;
}
