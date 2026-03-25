"use client";

import { useEffect, useState } from "react";

interface AnimatedStatProps {
  label: string;
  target: number;
  suffix?: string;
  prefix?: string;
  start: boolean;
}

export function AnimatedStat({ label, target, suffix = "", prefix = "", start }: AnimatedStatProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    let frameId = 0;
    const startedAt = performance.now();
    const duration = 1400;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [start, target]);

  return (
    <div className="beam-card rounded-[24px] px-4 py-4">
      <div className="font-mono text-3xl text-[var(--beam-gold-bright)] sm:text-[2rem]">
        {prefix}
        {new Intl.NumberFormat("en-US").format(value)}
        {suffix}
      </div>
      <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">{label}</p>
    </div>
  );
}
