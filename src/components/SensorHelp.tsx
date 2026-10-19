"use client";

import { useState } from "react";
import { KidsIcon } from "./KidsIcon";

type SensorHelpProps = {
  variant?: "default" | "kids" | "compact";
};

export function SensorHelp({ variant = "default" }: SensorHelpProps) {
  const [open, setOpen] = useState(variant === "compact");

  const isKids = variant === "kids";

  if (isKids) {
    return (
      <div className="kids-glass p-4">
        <p className="text-lg font-extrabold text-[#1a1a6a]">
          Practice sensor. Stretch with the picture. The bots count.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${
        isKids
          ? "kids-glass"
          : "rounded-xl border border-[var(--border)] bg-surface"
      } ${variant === "compact" ? "p-3" : "p-4"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold text-foreground">
          {isKids ? (
            <span className="inline-flex items-center gap-2">
              <KidsIcon name="gamepad" size={20} />
              Demo sensor mode
            </span>
          ) : (
            "How sensor connection works"
          )}
        </span>
        <span className="text-xs text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2 text-sm text-body">
          <p>
            <strong className="text-foreground">Heart rate can be live.</strong> Pair a Bluetooth
            heart strap and tap <strong className="text-foreground">Connect with Bluetooth</strong> in
            Chrome or Edge. Live BPM then replaces the practice heart numbers. Recordings save on this
            device.
          </p>
          <p>
            <strong className="text-foreground">Joint angle is live over Bluetooth.</strong> Power
            the MPU-6050 from a phone charger, pair the HC-05, and tap Connect with Bluetooth. Photo
            Goniometer still works from the camera.
          </p>
          <p>
            Apple Watch and many Fitbits do not share heart rate with a website. iPhone Safari
            cannot pair Bluetooth straps — use Chrome on Android or Chrome/Edge on a computer.
          </p>
          {isKids && (
            <p className="flex items-start gap-2 font-semibold text-amber-900">
              <KidsIcon name="sparkle" size={18} className="mt-0.5" />
              <span>
                In quest mode, move with the on-screen stretch — the bots count reps from the demo readings!
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
