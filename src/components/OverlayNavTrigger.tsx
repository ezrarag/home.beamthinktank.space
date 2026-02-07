"use client";

import { useEffect } from "react";

import { useOverlayNav } from "@/components/OverlayNavProvider";

export default function OverlayNavTrigger() {
  const { registerActivity } = useOverlayNav();

  useEffect(() => {
    const handleActivity = () => registerActivity();

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [registerActivity]);

  return null;
}
