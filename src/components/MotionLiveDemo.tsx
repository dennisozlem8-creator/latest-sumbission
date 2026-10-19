"use client";

import { useEffect, useRef, useState } from "react";
import { demoMotionAt, type MotionPhase } from "@/lib/motion-demo";
import { SafePicture } from "@/components/SafePicture";

const HISTORY = 40;
const TICK_MS = 70;

const PHASE_COPY: Record<MotionPhase | "idle", { kicker: string; line: string }> = {
  idle: { kicker: "Ready", line: "Play a demo move. Angle should jump, then fall." },
  rest: { kicker: "Resting", line: "Straps quiet. Start the move." },
  rising: { kicker: "Extending", line: "Angle is climbing. Keep the motion smooth." },
  peak: { kicker: "Peak angle", line: "This is the number the clinic sees." },
  falling: { kicker: "Return", line: "Coming back to rest." },
};

function phaseClass(phase: MotionPhase | "idle") {
  if (phase === "peak") return "rm-feedback rm-feedback--correct";
  if (phase === "rising") return "rm-feedback rm-feedback--almost";
  if (phase === "falling") return "rm-feedback rm-feedback--almost";
  return "rm-feedback rm-feedback--idle";
}

export function MotionLiveDemo() {
  const [running, setRunning] = useState(false);
  const startedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<number[]>(() => Array(HISTORY).fill(12));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("move")) return;
    const t = window.setTimeout(() => {
      startedRef.current = performance.now();
      setElapsed(0);
      setHistory(Array(HISTORY).fill(12));
      setRunning(true);
    }, 700);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const nextElapsed = performance.now() - startedRef.current;
      const sample = demoMotionAt(nextElapsed);
      setElapsed(nextElapsed);
      setHistory((prev) => [...prev.slice(1), sample.angle]);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const sample = running ? demoMotionAt(elapsed) : { angle: 0, phase: "idle" as const };
  const phase: MotionPhase | "idle" = running ? sample.phase : "idle";
  const copy = PHASE_COPY[phase];
  const max = Math.max(30, ...history);
  const width = 360;
  const height = 140;
  const points = history
    .map((value, index) => {
      const x = (index / Math.max(1, history.length - 1)) * width;
      const y = height - 8 - (value / max) * (height - 16);
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;

  function startMove() {
    startedRef.current = performance.now();
    setElapsed(0);
    setHistory(Array(HISTORY).fill(12));
    setRunning(true);
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_14px_32px_rgba(27,51,72,0.07)] ring-1 ring-[#4f90c6]/12">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]">
        <div className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-[#2f4a60]">MPU-6050 · live angle</p>
          <h2 className="rm-serif mt-1 text-2xl font-semibold text-[#1b3348]">Watch the joint move</h2>
          <p className="mt-1 text-base text-[#2f4a60]">
            Rest, then a hard extension. The big number and the angle chart move together.
          </p>

          <div className={`${phaseClass(phase)} mt-5 min-h-[13rem] transition-colors ${phase === "peak" ? "scale-[1.02]" : ""}`}>
            <p className="relative z-10 text-sm font-semibold">{copy.kicker}</p>
            <p
              className={`relative z-10 mt-2 font-semibold tabular-nums leading-none ${
                phase === "peak" ? "text-[4.75rem] sm:text-[6rem]" : "text-[4.25rem] sm:text-[5.25rem]"
              }`}
            >
              {sample.angle}°
            </p>
            <p className="relative z-10 mt-2 text-base">{copy.line}</p>
            <p className="relative z-10 mt-1 text-sm font-semibold tabular-nums">
              {running ? `${sample.angle}° · live` : "0°"}
            </p>
          </div>

          <div className="mt-4 rounded-[1.15rem] bg-[#f7fbfe] px-3 py-3">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#2f4a60]">Live angle</span>
              <span className="font-semibold tabular-nums text-[#1b3348]">{sample.angle}°</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full" role="img" aria-label="Live joint angle">
              <polygon points={area} fill={phase === "peak" ? "#3a7d62" : "#4f90c6"} opacity="0.2" />
              <polyline
                fill="none"
                stroke={phase === "peak" ? "#3a7d62" : "#4f90c6"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>

          <button type="button" onClick={startMove} className="rm-btn rm-btn-brand mt-5 w-full rounded-full">
            {running ? "Replay demo move" : "Play a demo move"}
          </button>
          <p className="mt-2 text-center text-sm text-[#2f4a60]">
            Same screen as a live ROM move. Power the Uno from a phone charger and tap Connect with Bluetooth when you have the hardware.
          </p>
        </div>
        <div className="hidden bg-[#cfe4f4] lg:flex lg:items-center">
          <SafePicture
            src="/images/landing-mpu.png?v=8"
            alt="MPU-6050 modules strapped on the upper arm and wrist"
            width={864}
            height={1152}
            className="block h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
