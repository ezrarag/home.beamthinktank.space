"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BeamHotspot } from "@/constants/beamHotspots";
import { loadOptionalModule } from "@/lib/optionalDeps";

type MotionState = "unknown" | "granted" | "denied" | "unavailable";

interface SkyExperienceProps {
  hotspots: BeamHotspot[];
  selectedHotspotId?: string;
  onSelectHotspot: (hotspot: BeamHotspot) => void;
}

interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

const SKY_CONFIG = {
  starCount: Number(process.env.NEXT_PUBLIC_BEAM_SKY_STAR_COUNT ?? 220),
  dragSensitivity: Number(process.env.NEXT_PUBLIC_BEAM_SKY_DRAG_SENSITIVITY ?? 1),
  pitchLimitDeg: Number(process.env.NEXT_PUBLIC_BEAM_SKY_PITCH_LIMIT_DEG ?? 60),
};

function rad(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hotspotAngles(lat: number, lng: number): { yaw: number; pitch: number } {
  const yaw = rad((lng + 95) * 1.6);
  const pitch = rad((lat - 37) * 1.2);
  return { yaw, pitch };
}

export default function SkyExperience({ hotspots, selectedHotspotId, onSelectHotspot }: SkyExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectedRef = useRef<ScreenPoint[]>([]);
  const [motionState, setMotionState] = useState<MotionState>("unknown");
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);
  const [r3fReady, setR3fReady] = useState(false);

  const stars = useMemo(
    () =>
      Array.from({ length: Math.max(80, SKY_CONFIG.starCount) }, (_, i) => ({
        id: `star-${i}`,
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.8 + 0.2,
        alpha: Math.random() * 0.6 + 0.25,
      })),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const checkR3f = async () => {
      const [fiber, drei] = await Promise.all([
        loadOptionalModule("@react-three/fiber"),
        loadOptionalModule("@react-three/drei"),
      ]);
      if (!cancelled && fiber && drei) setR3fReady(true);
    };
    void checkR3f();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hasMotion = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
    if (!hasMotion) {
      setMotionState("unavailable");
      return;
    }

    const maybeRequestPermission = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof maybeRequestPermission.requestPermission === "function") {
      setMotionState("unknown");
    } else {
      setMotionState("granted");
    }
  }, []);

  useEffect(() => {
    if (motionState !== "granted") return;

    const handler = (event: DeviceOrientationEvent) => {
      if (typeof event.alpha === "number") setYaw(rad(event.alpha));
      if (typeof event.beta === "number") {
        const limit = Math.max(20, Math.min(89, SKY_CONFIG.pitchLimitDeg));
        setPitch(rad(clamp(event.beta - 35, -limit, limit)));
      }
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [motionState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "#070b12";
      ctx.fillRect(0, 0, rect.width, rect.height);

      for (const star of stars) {
        const sx = star.x * rect.width;
        const sy = star.y * rect.height;
        ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      projectedRef.current = [];
      for (const hotspot of hotspots) {
        const angles = hotspotAngles(hotspot.lat, hotspot.lng);
        const relYaw = angles.yaw - yaw;
        const relPitch = angles.pitch - pitch;

        const x = rect.width / 2 + relYaw * (rect.width * 0.24);
        const y = rect.height / 2 - relPitch * (rect.height * 0.42);

        if (x < -40 || x > rect.width + 40 || y < -40 || y > rect.height + 40) continue;

        projectedRef.current.push({ id: hotspot.id, x, y });

        const selected = hotspot.id === selectedHotspotId;

        ctx.beginPath();
        ctx.fillStyle = selected ? "rgba(137,192,208,0.95)" : "rgba(255,255,255,0.88)";
        ctx.arc(x, y, selected ? 7 : 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(137,192,208,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, selected ? 12 : 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "12px sans-serif";
        ctx.fillText(hotspot.city, x + 11, y - 11);
      }

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frameId);
  }, [hotspots, pitch, yaw, selectedHotspotId, stars]);

  async function enableMotion() {
    try {
      const maybeRequestPermission = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

      if (typeof maybeRequestPermission.requestPermission !== "function") {
        setMotionState("granted");
        return;
      }

      const permission = await maybeRequestPermission.requestPermission();
      setMotionState(permission === "granted" ? "granted" : "denied");
    } catch {
      setMotionState("denied");
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    setDragging(true);
    setLastPointer({ x: event.clientX, y: event.clientY });
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging || !lastPointer || motionState === "granted") return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    const drag = Math.max(0.25, Math.min(3, SKY_CONFIG.dragSensitivity));
    setYaw((current) => current - dx * 0.004 * drag);
    setPitch((current) => clamp(current + dy * 0.003 * drag, -1.1, 1.1));
    setLastPointer({ x: event.clientX, y: event.clientY });
  }

  function onPointerUp() {
    setDragging(false);
    setLastPointer(null);
  }

  function onCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hit = projectedRef.current.find((point) => {
      const dx = point.x - x;
      const dy = point.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= 18;
    });

    if (!hit) return;
    const hotspot = hotspots.find((entry) => entry.id === hit.id);
    if (hotspot) onSelectHotspot(hotspot);
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-[#090d15]">
      <canvas
        ref={canvasRef}
        aria-label="Interactive sky map"
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onCanvasClick}
      />

      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/80">
        {motionState === "granted" ? "Motion enabled" : "Drag to look around"}
        {r3fReady ? " • R3F packages detected (adapter-ready)." : ""}
      </div>

      {motionState === "unknown" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            type="button"
            aria-label="Enable motion controls"
            onClick={enableMotion}
            className="rounded-full border border-white/25 bg-black/55 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Enable Motion
          </button>
        </div>
      ) : null}
    </div>
  );
}
