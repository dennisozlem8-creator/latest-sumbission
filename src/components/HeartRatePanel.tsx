"use client";

import { useEffect, useState } from "react";
import {
  heartRateBrowserHelp,
  usbBlockReason,
  usbHasFingerData,
  usbSourceConfirmed,
  type UsbHeartProof,
} from "@/lib/heart-sensor";
import { useAuth } from "./AuthProvider";
import { useHeartRate } from "./HeartRateProvider";

type HeartRatePanelProps = {
  compact?: boolean;
  hideWired?: boolean;
  onConnected?: () => void;
};

export function HeartRatePanel({ compact, hideWired, onConnected }: HeartRatePanelProps) {
  const { user } = useAuth();
  const {
    bluetoothSupported,
    usbSupported,
    connecting,
    connected,
    source,
    deviceName,
    bpm,
    history,
    rawHistory,
    error,
    serialLog,
    usbProof,
    recording,
    recordCount,
    connect,
    disconnect,
    startRecording,
    stopAndSave,
  } = useHeartRate();
  const [saveMessage, setSaveMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const blocked = usbBlockReason();
  const live = connected && bpm != null && bpm > 0;
  const confirmed = source === "usb" && usbSourceConfirmed(usbProof, now);

  useEffect(() => {
    if (source !== "usb" || !connected) return;
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(tick);
  }, [source, connected]);
  const chart = live ? history.map((v) => (v > 0 ? v : bpm ?? 0)) : history;
  const canConnect = bluetoothSupported || usbSupported;

  return (
    <section className={`rm-card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
            live ? "bg-correct/15" : connecting ? "bg-brand/15" : "bg-surface-elevated"
          }`}
        >
          <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
            <path
              d="M24 40s-14-8.8-14-18.2C10 16 14.2 12 19 12c2.8 0 4.6 1.4 5 3.2.4-1.8 2.2-3.2 5-3.2 4.8 0 9 4 9 9.8C38 31.2 24 40 24 40z"
              fill={live ? "#3a7d62" : connecting ? "#4f90c6" : "#9bb8d0"}
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {connecting
              ? "Looking for your heart sensor…"
              : live
                ? source === "usb"
                  ? confirmed
                    ? "MAX30102 data confirmed"
                    : "Wired heart sensor live"
                  : "Heart sensor live"
                : connected
                  ? "Heart sensor connected — waiting for a beat"
                  : "Connect a heart sensor"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {live
              ? source === "usb"
                ? `${deviceName} · beats from the MAX30102 on the Elegoo Uno R3`
                : `${deviceName} · live beats per minute`
              : connected
                ? `${deviceName} · keep the sensor on the finger or chest`
                : hideWired
                  ? "Pair a Bluetooth heart-rate strap for live BPM."
                  : heartRateBrowserHelp()}
          </p>
        </div>
        {live ? (
          <p className="rm-display text-correct tabular-nums">{bpm}</p>
        ) : null}
      </div>

      {source === "usb" && connected && (
        <UsbSourceCard
          proof={usbProof}
          now={now}
          confirmed={confirmed}
          compact={compact}
        />
      )}

      {live && (
        <div className="mt-4">
          <p className="rm-label">Live heart rate</p>
          <div className="mt-2 flex h-20 items-end gap-0.5">
            {chart.map((value, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-correct/80"
                style={{
                  height: `${Math.max(8, Math.min(100, ((value || 40) / 180) * 100))}%`,
                  opacity: 0.4 + (i / Math.max(1, chart.length)) * 0.6,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {source === "usb" && connected && (
        <div className="mt-4">
          <p className="rm-label">Wire signal</p>
          <div className="mt-2 flex h-16 items-end gap-0.5">
            {rawHistory.map((value, i) => {
              const rawMax = Math.max(1, ...rawHistory);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-brand/70"
                  style={{
                    height: `${Math.max(6, Math.min(100, (value / rawMax) * 100))}%`,
                    opacity: 0.35 + (i / Math.max(1, rawHistory.length)) * 0.65,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {blocked && !connected && !hideWired && (
        <p className="mt-3 rounded-xl bg-alert/10 px-3 py-3 text-sm font-medium text-alert">{blocked}</p>
      )}

      {serialLog.length > 0 && (
        <div className="mt-3 rounded-xl bg-background px-3 py-2 font-mono text-xs text-muted">
          <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted">
            Sensor log — look for BPM
          </p>
          {serialLog.map((line, i) => (
            <p
              key={`${line}-${i}`}
              className={
                /^SCAN\b/i.test(line) || /^ERR\b.*I2C/i.test(line)
                  ? /\bnone\b/i.test(line) || /no I2C/i.test(line)
                    ? "font-semibold text-alert"
                    : "font-semibold text-correct"
                  : /^(RAW|BPM)\b/i.test(line)
                    ? "font-semibold text-foreground"
                    : undefined
              }
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-alert">{error}</p>}
      {saveMessage && !connected && <p className="mt-3 text-sm text-muted">{saveMessage}</p>}
      {recording && (
        <p className="mt-3 text-sm font-semibold text-brand-light">
          Recording… {recordCount} beats saved in this clip
        </p>
      )}

      {!canConnect && !hideWired && (
        <p className="mt-3 text-sm text-muted">
          Open this site on a Windows or Mac computer in <strong className="text-foreground">Chrome or Edge</strong> to
          pair a Bluetooth heart strap. Safari and iPhone cannot pair it here.
        </p>
      )}
      {hideWired && !connected && !bluetoothSupported && (
        <p className="mt-3 text-sm text-muted">
          Open this site in <strong className="text-foreground">Chrome or Edge</strong> on a computer to pair a
          Bluetooth heart strap.
        </p>
      )}

      <div className={`mt-4 flex flex-col gap-2 ${compact ? "" : "sm:flex-row sm:flex-wrap"}`}>
        {!connected ? (
          <>
            <button
              type="button"
              className="rm-btn rm-btn-brand flex-1 disabled:opacity-40"
              disabled={connecting || !bluetoothSupported}
              onClick={async () => {
                setSaveMessage("");
                const ok = await connect(false);
                if (ok) onConnected?.();
              }}
            >
              {connecting ? "Connecting…" : "Connect with Bluetooth"}
            </button>
            {bluetoothSupported && (
              <button
                type="button"
                className="text-sm font-medium text-brand-light"
                disabled={connecting}
                onClick={async () => {
                  setSaveMessage("");
                  const ok = await connect(true);
                  if (ok) onConnected?.();
                }}
              >
                Bluetooth sensor is not listed
              </button>
            )}
          </>
        ) : (
          <>
            {!recording ? (
              <button
                type="button"
                className="rm-btn rm-btn-brand flex-1"
                onClick={() => {
                  setSaveMessage("");
                  startRecording();
                }}
              >
                Record this session
              </button>
            ) : (
              <button
                type="button"
                className="rm-btn rm-btn-primary flex-1"
                onClick={() => {
                  if (!user) {
                    setSaveMessage("Sign in to save the recording on this device.");
                    return;
                  }
                  setSaveMessage(stopAndSave(user.email));
                }}
              >
                Stop and save
              </button>
            )}
            <button type="button" className="rm-btn rm-btn-ghost flex-1" onClick={disconnect}>
              Disconnect
            </button>
          </>
        )}
      </div>

    </section>
  );
}

function UsbSourceCard({
  proof,
  now,
  confirmed,
  compact,
}: {
  proof: UsbHeartProof;
  now: number;
  confirmed: boolean;
  compact?: boolean;
}) {
  const ageMs = proof.lastPacketAt != null ? now - proof.lastPacketAt : null;
  const fresh = ageMs != null && ageMs < 2500;
  const fingerOn = usbHasFingerData(proof);
  const scanNone = (proof.lastScan ?? "").toLowerCase() === "none";
  const usbOnly = proof.started && !proof.i2cOk;
  const waitingFinger = proof.i2cOk && !fingerOn;
  const chipKnown = proof.chipId === 21 ? "MAX30102 chip ID 21" : proof.chipId != null ? `chip ID ${proof.chipId}` : "waiting";
  const title = confirmed
    ? "Yes — live heart data"
    : usbOnly || scanNone
      ? "No I2C — chip not found"
      : waitingFinger
        ? "Sensor yes — put a finger on the lights"
        : "Checking the MAX30102";
  const status = !proof.started && !proof.chip
    ? "USB is open. Waiting for the Elegoo to say HELLO."
    : usbOnly || scanNone
      ? "No I2C means the heart chip did not answer. USB is fine. If the power pin says VIN or VCC, move that wire to Uno 5V. Leave the 3.3V pin empty. GND → GND. SCL → A5. SDA → A4."
    : waitingFinger
      ? "The chip is talking. Cover both red lights with one fingertip and hold still for 10 seconds. Do not use the fingertip tip only — cover both windows."
      : !fresh
        ? "Waiting for the next RAW line."
        : proof.lastBpm
          ? "Beats are coming from the MAX30102."
          : "Finger data is live. Counting beats.";

  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 ${
        confirmed ? "border-correct/40 bg-correct/10" : usbOnly || waitingFinger ? "border-almost/40 bg-almost/10" : "border-[var(--border)] bg-background"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Data source</p>
      <p className={`mt-1 font-semibold ${confirmed ? "text-correct" : "text-foreground"}`}>
        {title}
      </p>
      <p className="mt-1 text-sm text-body">{status}</p>
      {!compact && (
        <ul className="mt-3 space-y-1 text-sm text-body">
          <li>Board: {proof.board ?? "Elegoo Uno R3 (USB open)"}</li>
          <li>Sensor: {proof.chip ?? "waiting for CHIP MAX30102"}</li>
          <li>
            I2C scan:{" "}
            {proof.lastScan
              ? proof.lastScan === "none"
                ? "none — chip not found"
                : proof.lastScan
              : proof.started
                ? "waiting"
                : "waiting"}
          </li>
          <li>I2C: {proof.i2cOk ? "OK (SDA A4, SCL A5)" : proof.started ? "chip not found" : "waiting"}</li>
          <li>Identity: {chipKnown}</li>
          <li>
            Heart numbers:{" "}
            {proof.packetCount === 0
              ? "none yet (USB messages are not heart data)"
              : [
                  fresh && ageMs != null ? (ageMs < 800 ? "now" : `${(ageMs / 1000).toFixed(1)}s ago`) : null,
                  proof.lastRaw != null ? `RAW ${proof.lastRaw}` : null,
                  proof.lastBpm != null ? `BPM ${proof.lastBpm}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || `${proof.packetCount} readings`}
          </li>
        </ul>
      )}
    </div>
  );
}
