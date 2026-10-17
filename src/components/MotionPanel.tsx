"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BLUETOOTH_MPU_BAUD,
  connectWiredMpu,
  mpuUsbHelp,
  mpuUsbSupported,
  parseSerialMpuLine,
  requestUsbMpuPort,
  type MpuConnection,
} from "@/lib/mpu-sensor";
import { SafePicture } from "@/components/SafePicture";

type MotionPanelProps = {
  compact?: boolean;
  live?: boolean;
  onConnected?: () => void;
  onAngle?: (angle: number) => void;
};

export function MotionPanel({ compact, live, onConnected, onAngle }: MotionPanelProps) {
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [angle, setAngle] = useState(0);
  const [error, setError] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [serialLog, setSerialLog] = useState<string[]>([]);
  const [i2cOk, setI2cOk] = useState(false);
  const connectionRef = useRef<MpuConnection | null>(null);
  const onAngleRef = useRef(onAngle);
  const onConnectedRef = useRef(onConnected);
  onAngleRef.current = onAngle;
  onConnectedRef.current = onConnected;
  const usbOk = mpuUsbSupported();

  useEffect(() => {
    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, []);

  async function connectUsb(baudRate = 115200) {
    if (!usbOk) {
      setError(mpuUsbHelp());
      return;
    }
    const bluetooth = baudRate === BLUETOOTH_MPU_BAUD;
    setConnecting(true);
    setError("");
    setSerialLog([]);
    setI2cOk(false);
    try {
      const port = await requestUsbMpuPort();
      const connection = await connectWiredMpu({
        port,
        baudRate,
        onAngle: (next) => {
          setAngle(next);
          setI2cOk(true);
          setReady(true);
          onAngleRef.current?.(next);
        },
        onLine: (line) => {
          setSerialLog((prev) => [...prev.slice(-7), line]);
          const sample = parseSerialMpuLine(line);
          if (sample?.hello) setReady(true);
          if (sample?.i2cOk) setI2cOk(true);
          if (sample?.error) {
            const raw = sample.error.replace(/^ERR\s+/i, "");
            setError(
              /no I2C/i.test(raw)
                ? "The motion chip did not answer. Check MPU power, GND, then SCL and SDA."
                : raw
            );
          }
        },
        onDisconnect: () => {
          connectionRef.current = null;
          setReady(false);
          setConnecting(false);
        },
      });
      connectionRef.current = connection;
      setDeviceName(connection.deviceName);
      setReady(true);
      onConnectedRef.current?.();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError" || name === "AbortError") {
        setError(
          bluetooth
            ? "No port was chosen. Pair the HC-05 first, then pick the port named HC-05. Not Bluetooth-Incoming-Port."
            : "No USB device was chosen. Plug in the Elegoo, close Serial Monitor, tap Connect with USB, then pick Arduino Uno."
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not open USB.");
      }
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    setReady(false);
    setAngle(0);
    setSerialLog([]);
    setI2cOk(false);
    setError("");
  }

  return (
    <section className={`rm-card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-4">
        <SafePicture
          src="/images/landing-mpu.png?v=8"
          alt=""
          width={160}
          height={120}
          className="h-16 w-20 shrink-0 rounded-2xl object-cover object-[left_40%]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {connecting
              ? "Opening the USB motion sensor"
              : ready
                ? i2cOk || angle > 0
                  ? "USB motion sensor — live angle"
                  : "USB motion sensor connected — waiting for the angle"
                : "USB motion sensor"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {ready
              ? `${deviceName || "USB motion sensor"} · live tilt`
              : compact
                ? "USB motion sensor. Live angle while you move."
                : mpuUsbHelp()}
          </p>
        </div>
        {ready ? <p className="rm-display tabular-nums text-[#1b3348]">{angle}°</p> : null}
      </div>

      {ready && !compact && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-background px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Motion signal</p>
          <p className="mt-1 font-semibold text-foreground">
            {i2cOk || angle > 0
              ? "USB yes — move the joint and watch ANGLE"
              : "USB yes — waiting for I2C OK. If the log says SCAN none, the chip has no power or SCL/SDA are swapped."}
          </p>
          <p className="mt-1 text-sm text-body">
            Tape the MPU-6050 on one bone of the joint. Keep USB plugged into the computer. The number is tilt, not a diagnosis.
          </p>
        </div>
      )}

      {!compact && serialLog.length > 0 && (
        <div className="mt-3 rounded-xl bg-background px-3 py-2 font-mono text-xs text-muted">
          <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted">
            Sensor log — look for HELLO MPU6050 and ANGLE
          </p>
          {serialLog.map((line, i) => (
            <p
              key={`${line}-${i}`}
              className={/^(HELLO|ANGLE|I2C OK|WHO|SCAN)\b/i.test(line) ? "font-semibold text-foreground" : undefined}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-alert">{error}</p> : null}
      {live && ready ? (
        <p className="mt-3 text-sm font-semibold text-brand-light">Live angle is filling this session.</p>
      ) : null}

      <div className={`mt-4 flex flex-col gap-2 ${compact ? "" : "sm:flex-row"}`}>
        {!ready ? (
          <>
            <button
              type="button"
              className="rm-btn rm-btn-brand w-full disabled:opacity-40 sm:w-auto sm:px-8"
              disabled={connecting || !usbOk}
              onClick={() => void connectUsb()}
            >
              {connecting ? "Connecting…" : "Connect with USB"}
            </button>
            <button
              type="button"
              className="rm-btn rm-btn-ghost w-full disabled:opacity-40 sm:w-auto sm:px-8"
              disabled={connecting || !usbOk}
              onClick={() => void connectUsb(BLUETOOTH_MPU_BAUD)}
            >
              {connecting ? "Connecting…" : "Connect HC-05"}
            </button>
          </>
        ) : (
          <button type="button" className="rm-btn rm-btn-ghost w-full sm:w-auto sm:px-8" onClick={disconnect}>
            Disconnect
          </button>
        )}
      </div>
    </section>
  );
}

export function PhotoMeasureCard() {
  return (
    <Link href="/goniometer" className="rm-card flex overflow-hidden p-0 no-underline">
      <SafePicture
        src="/images/landing-photo-goniometer.png?v=2"
        alt=""
        width={240}
        height={180}
        className="h-28 w-32 shrink-0 object-cover sm:h-32 sm:w-40"
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4">
        <span className="text-sm font-semibold text-[#2f4a60]">Camera</span>
        <span className="mt-0.5 font-semibold text-foreground">Phone or laptop camera</span>
        <span className="mt-1 text-sm text-muted">
          Side view. The app marks hip, knee, and ankle — or you tap the three points.
        </span>
        <span className="rm-btn rm-btn-brand mt-3 inline-flex h-10 w-fit min-h-0 rounded-full px-5 text-sm">
          Open the camera
        </span>
      </span>
    </Link>
  );
}
