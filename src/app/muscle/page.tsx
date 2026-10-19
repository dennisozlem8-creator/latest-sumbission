"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashCard, DashEmpty, DashIntro, DashShell } from "@/components/clinic/DashKit";
import { MyoWarePanel } from "@/components/MyoWarePanel";
import { useAuth } from "@/components/AuthProvider";
import { deleteMyoWareRecording, loadMyoWareRecordings, type MyoWareRecording } from "@/lib/myoware-log";
import { PhotoFrame } from "@/components/LandingMedia";
import { MuscleLiveDemo } from "@/components/MuscleLiveDemo";

function HelpBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mt-3 overflow-hidden rounded-[1.35rem] bg-white p-5 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
      <summary className="cursor-pointer font-semibold text-[#1b3348]">{title}</summary>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[#2f4a60]">{children}</div>
    </details>
  );
}

export default function MuscleSensorPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MyoWareRecording[]>([]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => setRows(loadMyoWareRecordings(user.email));
    refresh();
    window.addEventListener("revive-myoware-saved", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("revive-myoware-saved", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [user]);

  if (!user) return null;

  return (
    <DashShell>
      <DashIntro
        kicker="Measure"
        title="Bluetooth muscle sensor"
        text="Play a demo flex, then connect with Bluetooth. The effort reading fills the Recovery Passport."
      />
      <div className="mt-5">
        <MuscleLiveDemo />
      </div>
      <PhotoFrame src="/images/landing-myoware.png?v=6" alt="" className="mt-6 h-52 rounded-[1.35rem] lg:hidden" imgClassName="object-cover object-[center_40%]" />

      <div className="mt-6">
        <MyoWarePanel />
      </div>

      <HelpBlock title="Bluetooth — do this now">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Leave the Elegoo Uno unplugged. The Wireless Shield has its own battery.</li>
            <li>Unstack the Wireless Shield from the muscle sensor. Plug the programming cable into the <strong className="text-foreground">Wireless Shield</strong> only to load the program.</li>
            <li>
              Set <strong className="text-foreground">POWER SOURCE</strong> to{" "}
              <strong className="text-foreground">VBAT</strong>. Flip <strong className="text-foreground">POWER ON</strong>.
            </li>
            <li>
              Arduino IDE: Boards Manager → install <strong className="text-foreground">esp32</strong> by Espressif.
              Tools → Board → <strong className="text-foreground">ESP32 Dev Module</strong>. Tools → Port → the shield.
            </li>
            <li>
              Download{" "}
              <a className="font-medium text-brand-light underline" href="/firmware/wireless-myoware">
                wireless-myoware.ino
              </a>
              . File → Open that file. Upload. Wait for Done uploading. Close Serial Monitor.
            </li>
            <li>Flip POWER OFF. Unplug the programming cable. Snap the shield onto the muscle sensor (GND / REF only fit one way).</li>
            <li>
              Pads: <strong className="text-foreground">MID</strong> on the muscle,{" "}
              <strong className="text-foreground">END</strong> along the muscle,{" "}
              <strong className="text-foreground">REF</strong> on nearby bone.
            </li>
            <li>
              POWER ON. The LED should blink. Chrome on a computer → this page →{" "}
              <strong className="text-foreground">Connect with Bluetooth</strong> → pick{" "}
              <strong className="text-foreground">MyoWareSensor1</strong>. Flex.
            </li>
          </ol>
          <p className="mt-3">
            Good signs: the LED stays on after Chrome connects, then ENV numbers jump when you flex.
            Factory firmware will not work with this website — upload the file above, then connect with Bluetooth.
          </p>
      </HelpBlock>

        <DashCard className="mt-4 p-5">
          <h2 className="rm-serif text-xl font-semibold text-[#1b3348]">Wireless stack</h2>
          <p className="mt-2 text-sm text-[#2f4a60]">No jumper wires. The shield snaps onto the sensor.</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/myoware-wireless.svg"
              alt="MyoWare Wireless Shield snapped onto the muscle sensor"
              width={640}
              height={280}
              className="h-auto w-full"
            />
          </div>
          <a
            href="/firmware/wireless-myoware"
            className="rm-btn rm-btn-ghost mt-4 inline-flex w-full justify-center"
          >
            Download wireless-myoware.ino
          </a>
        </DashCard>

        <HelpBlock title="If Bluetooth cannot find MyoWareSensor1">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Use Chrome or Edge on a computer. Not Safari. Not iPhone.</li>
            <li>POWER SOURCE = VBAT. POWER ON. LED should blink until Chrome connects.</li>
            <li>Stay within a few feet. Unplug the programming cable before you tap Connect with Bluetooth.</li>
            <li>If the computer does not see a port when uploading, install the CH340 driver, then pick ESP32 Dev Module.</li>
          </ol>
        </HelpBlock>

        <HelpBlock title="If ENV stays 0">
          <ol className="list-decimal space-y-2 pl-5">
            <li>The Wireless Shield POWER switch must be ON.</li>
            <li>The shield must be snapped onto the muscle sensor.</li>
            <li>Pads on clean skin: MID on the muscle, END along it, REF on bone.</li>
            <li>If the ENV LED stays on at rest, turn the GAIN screw a little counterclockwise.</li>
          </ol>
        </HelpBlock>

        <HelpBlock title="Load the wireless program in Arduino IDE">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Download wireless-myoware.ino. File → Open that file. Do not paste it into an old sketch.</li>
            <li>Tools → Board → ESP32 Dev Module. Tools → Port → the Wireless Shield (not the Elegoo).</li>
            <li>Upload. Wait for Done uploading. Close Serial Monitor. POWER OFF. Unplug the programming cable.</li>
            <li>Snap onto the sensor, POWER ON, then Connect with Bluetooth.</li>
          </ol>
        </HelpBlock>

        <DashCard className="mt-6">
          {rows.length === 0 ? (
            <DashEmpty
              title="No muscle recordings yet"
              text="Connect MyoWare, flex, then save. Stored on this device only."
              href="/session"
              action="Use in a session"
            />
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
                          {row.avgEmg}% avg · peak {row.maxEmg}%
                        </p>
                        <p className="text-[#2f4a60]">
                          {new Date(row.date).toLocaleString()} · {row.durationSec}s · {row.samples.length} readings
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-sm font-semibold text-[#9a4f4f]"
                        onClick={() => {
                          deleteMyoWareRecording(row.id);
                          setRows(loadMyoWareRecordings(user.email));
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

        <p className="mt-6 text-center text-xs text-muted">
          For progress tracking only. This is not a medical EMG test or a diagnosis.
        </p>
        <p className="mt-4 text-center">
          <Link href="/session" className="text-sm font-semibold text-[#1b3348]">
            Use this in a session →
          </Link>
        </p>
    </DashShell>
  );
}
