"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashCard, DashEmpty, DashIntro, DashShell } from "@/components/clinic/DashKit";
import { HeartRatePanel } from "@/components/HeartRatePanel";
import { useAuth } from "@/components/AuthProvider";
import { deleteHeartRecording, loadHeartRecordings, type HeartRecording } from "@/lib/heart-log";

function HelpBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mt-3 overflow-hidden rounded-[1.35rem] bg-white p-5 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
      <summary className="cursor-pointer font-semibold text-[#1b3348]">{title}</summary>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[#2f4a60]">{children}</div>
    </details>
  );
}

export default function HeartSensorPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HeartRecording[]>([]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => setRows(loadHeartRecordings(user.email));
    refresh();
    window.addEventListener("revive-heart-saved", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("revive-heart-saved", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [user]);

  if (!user) return null;

  return (
    <DashShell wide={false}>
      <DashIntro
        kicker="Optional sensor"
        title="Bluetooth heart sensor"
        text="Pair a heart-rate strap. No cable. Live beats fill the session."
      />
      <DashCard className="mt-5 p-5">
        <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">Connect with Bluetooth</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#2f4a60]">
          <li>Put the strap on and wake it.</li>
          <li>Open this page in Chrome or Edge on a computer.</li>
          <li>Tap Connect with Bluetooth and pick the strap.</li>
        </ol>
        <p className="mt-3 text-sm text-[#2f4a60]">
          Polar H9, Polar H10, Wahoo TICKR, Coospo, and Magene work. Apple Watch usually does not.
        </p>
      </DashCard>

      <div className="mt-6">
        <HeartRatePanel />
      </div>

      <HelpBlock title="If the strap does not appear">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Use Chrome or Edge on a computer. Not Safari. Not iPhone.</li>
          <li>Wake the strap and stay within a few feet.</li>
          <li>Tap Connect with Bluetooth again and pick the strap name.</li>
        </ol>
      </HelpBlock>

      <DashCard className="mt-6">
        {rows.length === 0 ? (
          <DashEmpty title="No heart recordings yet" text="Connect a Bluetooth strap, then save a reading. Stored on this device only." href="/session" action="Back to session" />
        ) : (
          <div className="p-5">
            <h2 className="rm-serif text-xl font-semibold text-[#1b3348]">Saved recordings</h2>
            <ul className="mt-4 space-y-2">
              {rows
                .slice()
                .reverse()
                .map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-[#f7fbfe] px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-[#1b3348]">
                        {row.avgBpm} bpm avg · {row.minBpm}–{row.maxBpm}
                      </p>
                      <p className="text-[#2f4a60]">
                        {new Date(row.date).toLocaleString()} · {row.source} · {row.durationSec}s · {row.samples.length} beats
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#9a4f4f]"
                      onClick={() => {
                        deleteHeartRecording(row.id);
                        setRows(loadHeartRecordings(user.email));
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </DashCard>

      <p className="mt-6 text-center text-sm text-[#2f4a60]">For progress tracking only. This is not a medical heart monitor or a diagnosis.</p>
      <p className="mt-4 text-center">
        <Link href="/session" className="text-sm font-semibold text-[#1b3348]">
          Back to session →
        </Link>
      </p>
    </DashShell>
  );
}
