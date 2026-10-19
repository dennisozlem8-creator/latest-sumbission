"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  applySerialSampleToProof,
  bluetoothHeartRateSupported,
  connectHeartRateSensor,
  connectWiredHeartSensor,
  EMPTY_USB_PROOF,
  parseSerialHeartLine,
  usbHeartRateSupported,
  type HeartRateConnection,
  type UsbHeartProof,
} from "@/lib/heart-sensor";
import {
  saveHeartRecording,
  summarizeHeartSamples,
  type HeartSample,
} from "@/lib/heart-log";

const HISTORY = 24;

type HeartRateContextValue = {
  bluetoothSupported: boolean;
  usbSupported: boolean;
  connecting: boolean;
  connected: boolean;
  source: "bluetooth" | "usb" | null;
  deviceName: string;
  bpm: number | null;
  history: number[];
  rawHistory: number[];
  error: string;
  serialLog: string[];
  usbProof: UsbHeartProof;
  recording: boolean;
  recordCount: number;
  connect: (acceptAll?: boolean) => Promise<boolean>;
  connectUsb: (port?: SerialPort) => Promise<boolean>;
  disconnect: () => void;
  startRecording: () => void;
  stopAndSave: (userEmail: string) => string;
};

const HeartRateContext = createContext<HeartRateContextValue | null>(null);

export function HeartRateProvider({ children }: { children: React.ReactNode }) {
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [usbSupported, setUsbSupported] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<"bluetooth" | "usb" | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [bpm, setBpm] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>(() => Array(HISTORY).fill(0));
  const [rawHistory, setRawHistory] = useState<number[]>(() => Array(HISTORY).fill(0));
  const [error, setError] = useState("");
  const [serialLog, setSerialLog] = useState<string[]>([]);
  const [usbProof, setUsbProof] = useState<UsbHeartProof>(EMPTY_USB_PROOF);
  const [recording, setRecording] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const connectionRef = useRef<HeartRateConnection | null>(null);
  const recordingRef = useRef(false);
  const recordStartRef = useRef(0);
  const samplesRef = useRef<HeartSample[]>([]);
  const deviceNameRef = useRef("");
  const sourceRef = useRef<"bluetooth" | "usb" | null>(null);

  useEffect(() => {
    setBluetoothSupported(bluetoothHeartRateSupported());
    setUsbSupported(usbHeartRateSupported());
    return () => {
      connectionRef.current?.disconnect();
    };
  }, []);

  const ingestBpm = useCallback((next: number) => {
    setBpm(next);
    setHistory((prev) => [...prev.slice(1), next]);
    if (!recordingRef.current) return;
    const time = (performance.now() - recordStartRef.current) / 1000;
    samplesRef.current.push({ time: Number(time.toFixed(2)), bpm: next });
    setRecordCount(samplesRef.current.length);
  }, []);

  const ingestRaw = useCallback((raw: number) => {
    setRawHistory((prev) => [...prev.slice(1), raw]);
    if (!recordingRef.current) return;
    const last = samplesRef.current[samplesRef.current.length - 1];
    if (last && last.raw == null) {
      last.raw = raw;
    }
  }, []);

  const disconnect = useCallback(() => {
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    recordingRef.current = false;
    setConnected(false);
    setSource(null);
    sourceRef.current = null;
    setDeviceName("");
    deviceNameRef.current = "";
    setBpm(null);
    setUsbProof(EMPTY_USB_PROOF);
    setConnecting(false);
    setRecording(false);
  }, []);

  const handleGone = useCallback(() => {
    connectionRef.current = null;
    recordingRef.current = false;
    setConnected(false);
    setSource(null);
    sourceRef.current = null;
    setDeviceName("");
    deviceNameRef.current = "";
    setBpm(null);
    setUsbProof(EMPTY_USB_PROOF);
    setConnecting(false);
    setRecording(false);
    setError("The heart sensor disconnected. Plug it in or tap Connect to pair it again.");
  }, []);

  const connect = useCallback(
    async (acceptAll = false) => {
      setError("");
      setConnecting(true);
      try {
        connectionRef.current?.disconnect();
        const connection = await connectHeartRateSensor({
          acceptAll,
          onBpm: ingestBpm,
          onDisconnect: handleGone,
        });
        connectionRef.current = connection;
        setDeviceName(connection.deviceName);
        deviceNameRef.current = connection.deviceName;
        setSource("bluetooth");
        sourceRef.current = "bluetooth";
        setConnected(true);
        setHistory(Array(HISTORY).fill(0));
        setRawHistory(Array(HISTORY).fill(0));
        return true;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotFoundError" || name === "AbortError") {
          setError("No heart sensor was chosen. Make sure the strap is on and awake, then try again.");
        } else if (name === "SecurityError") {
          setError("Bluetooth was blocked. Use Chrome or Edge on https://www.revivemotion.ai and allow Bluetooth.");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Could not connect to the heart sensor."
          );
        }
        setConnected(false);
        return false;
      } finally {
        setConnecting(false);
      }
    },
    [handleGone, ingestBpm]
  );

  const connectUsb = useCallback(async (port?: SerialPort) => {
    setError("");
    setConnecting(true);
    try {
      connectionRef.current?.disconnect();
      setUsbProof(EMPTY_USB_PROOF);
      setSerialLog([]);
      const connection = await connectWiredHeartSensor({
        port,
        onBpm: ingestBpm,
        onRaw: ingestRaw,
        onLine: (line) => {
          setSerialLog((prev) => [...prev.slice(-7), line]);
          const sample = parseSerialHeartLine(line);
          if (!sample) return;
          setUsbProof((prev) => {
            const next = applySerialSampleToProof(prev, sample);
            if (next.board || next.chip) {
              const name = [next.board ?? "Elegoo Uno R3", next.chip ?? "MAX30102"].join(" · ");
              setDeviceName(name);
              deviceNameRef.current = name;
            }
            return next;
          });
        },
        onErrorLine: (message) => {
          setError(message);
        },
        onDisconnect: handleGone,
      });
      connectionRef.current = connection;
      if (!/MAX30102/i.test(deviceNameRef.current)) {
        setDeviceName(connection.deviceName);
        deviceNameRef.current = connection.deviceName;
      }
      setSource("usb");
      sourceRef.current = "usb";
      setConnected(true);
      setHistory(Array(HISTORY).fill(0));
      setRawHistory(Array(HISTORY).fill(0));
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError" || name === "AbortError") {
        setError("No Bluetooth sensor was chosen. Wake the strap, then tap Connect with Bluetooth.");
      } else if (name === "SecurityError") {
        setError("Bluetooth access was blocked. Use Chrome or Edge on a computer, and allow the sensor.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not open the Bluetooth heart sensor."
        );
      }
      setConnected(false);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [handleGone, ingestBpm, ingestRaw]);

  const startRecording = useCallback(() => {
    if (!connected) {
      setError("Connect the wired sensor or a heart strap first.");
      return;
    }
    samplesRef.current = [];
    recordStartRef.current = performance.now();
    recordingRef.current = true;
    setRecordCount(0);
    setRecording(true);
    setError("");
  }, [connected]);

  const stopAndSave = useCallback(
    (userEmail: string) => {
      recordingRef.current = false;
      setRecording(false);
      const samples = samplesRef.current;
      const summary = summarizeHeartSamples(samples);
      if (!summary || !userEmail) {
        return "Need a few live beats before saving. Keep the sensor on, then record again.";
      }
      saveHeartRecording({
        id: crypto.randomUUID(),
        userEmail,
        date: new Date().toISOString(),
        source: sourceRef.current ?? "usb",
        deviceName: deviceNameRef.current || "Heart sensor",
        durationSec: summary.durationSec,
        avgBpm: summary.avgBpm,
        minBpm: summary.minBpm,
        maxBpm: summary.maxBpm,
        samples,
      });
      samplesRef.current = [];
      setRecordCount(0);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("revive-heart-saved"));
      }
      return `Saved ${samples.length} heart readings · avg ${summary.avgBpm} bpm.`;
    },
    []
  );

  const value = useMemo(
    () => ({
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
      connectUsb,
      disconnect,
      startRecording,
      stopAndSave,
    }),
    [
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
      connectUsb,
      disconnect,
      startRecording,
      stopAndSave,
    ]
  );

  return <HeartRateContext.Provider value={value}>{children}</HeartRateContext.Provider>;
}

export function useHeartRate() {
  const ctx = useContext(HeartRateContext);
  if (!ctx) {
    throw new Error("useHeartRate must be used inside HeartRateProvider");
  }
  return ctx;
}
