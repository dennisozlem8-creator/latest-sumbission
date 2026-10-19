"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { DashCard, DashIntro, DashShell } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { PhotoFrame } from "@/components/LandingMedia";
import { MotionLiveDemo } from "@/components/MotionLiveDemo";
import { MotionPanel } from "@/components/MotionPanel";

function HelpBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="mt-3 overflow-hidden rounded-[1.35rem] bg-white p-5 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
      <summary className="cursor-pointer font-semibold text-[#1b3348]">{title}</summary>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[#2f4a60]">{children}</div>
    </details>
  );
}

export default function MotionSensorPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashShell>
      <DashIntro
        kicker="Measure"
        title="Bluetooth motion sensor"
        text="Power the Uno from a phone charger. Pair the HC-05, then connect. The live angle fills the Recovery Passport."
      />
      <div className="mt-5">
        <MotionLiveDemo />
      </div>
      <PhotoFrame
        src="/images/landing-mpu.png?v=8"
        alt="MPU-6050 modules on the upper arm and wrist"
        className="mt-6 h-56 rounded-[1.35rem] sm:h-64 lg:hidden"
        imgClassName="object-cover object-[left_42%]"
      />

      <DashCard className="mt-6 p-5">
        <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">Connect with Bluetooth</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#2f4a60]">
          <li>Power the Uno from a phone charger. Leave it unplugged from the computer.</li>
          <li>The HC-05 light should blink fast. In System Settings → Bluetooth, connect HC-05. PIN 1234.</li>
          <li>In Chrome, tap Connect with Bluetooth and pick the line named HC-05.</li>
          <li>Tip the sensor. The log should show I2C OK, then ANGLE.</li>
        </ol>
      </DashCard>

      <div className="mt-6">
        <MotionPanel />
      </div>

      <DashCard className="mt-4 p-5">
        <h2 className="rm-serif text-xl font-semibold text-[#1b3348]">MPU-6050 wires</h2>
        <p className="mt-2 text-sm text-[#2f4a60]">These stay on the Uno. The computer connects over Bluetooth.</p>
        <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-[#4f90c6]/12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/mpu6050-wiring.svg"
            alt="MPU-6050 VCC to 5V, GND to GND, SCL to A5, SDA to A4"
            width={640}
            height={280}
            className="h-auto w-full"
          />
        </div>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-body">
          <li>VCC → Uno 3.3V.</li>
          <li>GND → GND</li>
          <li>SCL → A5</li>
          <li>SDA → A4. Leave INT and AD0 empty.</li>
        </ol>
        <a
          href="/firmware/bluetooth-mpu"
          className="rm-btn rm-btn-ghost mt-4 inline-flex w-full justify-center"
        >
          Download bluetooth-mpu.ino
        </a>
      </DashCard>

      <DashCard className="mt-4 p-5">
        <h2 className="rm-serif text-xl font-semibold text-[#1b3348]">HC-05 Bluetooth</h2>
        <p className="mt-2 text-sm leading-6 text-[#2f4a60]">
          The MPU stays on the Uno. The HC-05 sends the angle to the computer. Leave the MPU power wire where it is.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-body">
          <li>MPU VCC stays on Uno 3.3V. GND → GND. SDA → A4. SCL → A5.</li>
          <li>HC-05 VCC → Uno 5V. HC-05 GND → GND.</li>
          <li>HC-05 TXD → Uno pin 0 (RX). HC-05 RXD → Uno pin 1 (TX). Not pins 2 and 3.</li>
          <li>Leave EN, STATE, and KEY empty.</li>
        </ol>
        <p className="mt-3 text-sm leading-6 text-[#2f4a60]">
          The computer cable is only for loading the program once. Unplug the wires on pins 0 and 1, upload bluetooth-mpu.ino with the board set to Arduino Uno, then plug those two wires back. Unplug the Uno from the computer and power it from a phone charger. Pair the HC-05. The PIN is 1234. Then tap Connect with Bluetooth and pick the port named HC-05.
        </p>
        <a href="/firmware/bluetooth-mpu" className="rm-btn rm-btn-ghost mt-4 inline-flex w-full justify-center">
          Download bluetooth-mpu.ino
        </a>
      </DashCard>

      <HelpBlock title="Load the program, then connect">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Download{" "}
            <a className="font-medium text-brand-light underline" href="/firmware/bluetooth-mpu">
              bluetooth-mpu.ino
            </a>
            . File → Open that file. Do not paste it into an old sketch.
          </li>
          <li>Unplug the HC-05 wires on pins 0 and 1. Tools → Board → Arduino Uno. Upload. Close Serial Monitor. Plug those wires back.</li>
          <li>Unplug the Uno from the computer and power it from a phone charger.</li>
          <li>Pair HC-05 with PIN 1234. This page → Connect with Bluetooth → pick HC-05. Tip the sensor. ANGLE should change.</li>
        </ol>
      </HelpBlock>

      <HelpBlock title="If SCAN says none">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Confirm four wires only: VCC, GND, SCL, SDA. INT, AD0, XDA, XCL stay empty.</li>
          <li>Power: if the pin says VCC or VIN, use Uno 5V. If it says only 3.3V, use Uno 3.3V. GND must be on the Elegoo GND.</li>
          <li>SCL in A5, SDA in A4. If SCAN is still none, swap those two wires and upload again.</li>
          <li>Re-upload bluetooth-mpu.ino. Close Serial Monitor. Power from a phone charger, then Connect with Bluetooth.</li>
        </ol>
      </HelpBlock>

      <p className="mt-6 text-center text-sm text-[#2f4a60]">
        For progress tracking only. This is not a diagnosis.
      </p>
      <p className="mt-4 text-center">
        <Link href="/session" className="text-sm font-semibold text-[#1b3348]">
          Use this in a session →
        </Link>
      </p>
    </DashShell>
  );
}
