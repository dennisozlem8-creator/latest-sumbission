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
  applyMyoWareSampleToProof,
  bluetoothMyoWareSupported,
  connectWiredMyoWare,
  connectWirelessMyoWare,
  EMPTY_MYOWARE_PROOF,
  parseSerialMyoWareLine,
  type MyoWareConnection,
  type UsbMyoWareProof,
} from "@/lib/myoware-sensor";
import { usbHeartRateSupported } from "@/lib/heart-sensor";
import {
  saveMyoWareRecording,
  summarizeMyoWareSamples,
  type MyoWareSample,
} from "@/lib/myoware-log";

const HISTORY = 24;

type MyoWareContextValue = {
  usbSupported: boolean;
  bluetoothSupported: boolean;
  connecting: boolean;
  connected: boolean;
  source: "usb" | "bluetooth" | null;
  deviceName: string;
  emg: number | null;
  env: number | null;
  history: number[];
  error: string;
  serialLog: string[];
  usbProof: UsbMyoWareProof;
  recording: boolean;
  recordCount: number;
  connectUsb: (port?: SerialPort) => Promise<boolean>;
  connectBluetooth: () => Promise<boolean>;
  disconnect: () => void;
  startRecording: () => void;
  stopAndSave: (userEmail: string) => string;
};

const MyoWareContext = createContext<MyoWareContextValue | null>(null);

export function MyoWareProvider({ children }: { children: React.ReactNode }) {
  const [usbSupported, setUsbSupported] = useState(false);
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<"usb" | "bluetooth" | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [emg, setEmg] = useState<number | null>(null);
  const [env, setEnv] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>(() => Array(HISTORY).fill(0));
  const [error, setError] = useState("");
  const [serialLog, setSerialLog] = useState<string[]>([]);
  const [usbProof, setUsbProof] = useState<UsbMyoWareProof>(EMPTY_MYOWARE_PROOF);
  const [recording, setRecording] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const connectionRef = useRef<MyoWareConnection | null>(null);
  const recordingRef = useRef(false);
  const recordStartRef = useRef(0);
  const samplesRef = useRef<MyoWareSample[]>([]);
  const deviceNameRef = useRef("");
  const sourceRef = useRef<"usb" | "bluetooth" | null>(null);

  useEffect(() => {
    setUsbSupported(usbHeartRateSupported());
    setBluetoothSupported(bluetoothMyoWareSupported());
    return () => {
      connectionRef.current?.disconnect();
    };
  }, []);

  const ingestEmg = useCallback((next: number) => {
    setEmg(next);
    setHistory((prev) => [...prev.slice(1), next]);
    if (!recordingRef.current) return;
    const time = (performance.now() - recordStartRef.current) / 1000;
    samplesRef.current.push({ time: Number(time.toFixed(2)), emg: next });
    setRecordCount(samplesRef.current.length);
  }, []);

  const ingestEnv = useCallback((next: number) => {
    setEnv(next);
    if (!recordingRef.current) return;
    const last = samplesRef.current[samplesRef.current.length - 1];
    if (last && last.env == null) last.env = next;
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
    setEmg(null);
    setEnv(null);
    setUsbProof(EMPTY_MYOWARE_PROOF);
    setConnecting(false);
    setRecording(false);
  }, []);

  const handleGone = useCallback(() => {
    const wasBluetooth = sourceRef.current === "bluetooth";
    connectionRef.current = null;
    recordingRef.current = false;
    setConnected(false);
    setSource(null);
    sourceRef.current = null;
    setDeviceName("");
    deviceNameRef.current = "";
    setEmg(null);
    setEnv(null);
    setUsbProof(EMPTY_MYOWARE_PROOF);
    setConnecting(false);
    setRecording(false);
    setError(
      wasBluetooth
        ? "The Wireless Shield disconnected. Flip POWER ON and tap Connect with Bluetooth."
        : "The MyoWare disconnected. Turn the shield on and tap Connect with Bluetooth."
    );
  }, []);

  const connectUsb = useCallback(
    async (port?: SerialPort) => {
      setError("");
      setConnecting(true);
      try {
        connectionRef.current?.disconnect();
        setUsbProof(EMPTY_MYOWARE_PROOF);
        setSerialLog([]);
        const connection = await connectWiredMyoWare({
          port,
          onEmg: ingestEmg,
          onEnv: ingestEnv,
          onLine: (line) => {
            setSerialLog((prev) => [...prev.slice(-7), line]);
            const sample = parseSerialMyoWareLine(line);
            if (!sample) return;
            setUsbProof((prev) => {
              const next = applyMyoWareSampleToProof(prev, sample);
              if (next.board || next.chip) {
                const name = [next.board ?? "Elegoo Uno R3", next.chip ?? "MyoWare 2.0"].join(" · ");
                setDeviceName(name);
                deviceNameRef.current = name;
              }
              return next;
            });
          },
          onDisconnect: handleGone,
        });
        connectionRef.current = connection;
        if (!/MYOWARE/i.test(deviceNameRef.current)) {
          setDeviceName(connection.deviceName);
          deviceNameRef.current = connection.deviceName;
        }
        setSource("usb");
        sourceRef.current = "usb";
        setConnected(true);
        setHistory(Array(HISTORY).fill(0));
        return true;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotFoundError" || name === "AbortError") {
          setError("No Bluetooth device was chosen. Turn the shield on, then tap Connect with Bluetooth.");
        } else if (name === "SecurityError") {
          setError("USB access was blocked. Use Chrome or Edge on a computer, and allow the serial port.");
        } else {
          setError(err instanceof Error ? err.message : "Could not open the MyoWare Bluetooth connection.");
        }
        setConnected(false);
        return false;
      } finally {
        setConnecting(false);
      }
    },
    [handleGone, ingestEmg, ingestEnv]
  );

  const connectBluetooth = useCallback(async () => {
    setError("");
    setConnecting(true);
    try {
      connectionRef.current?.disconnect();
      setUsbProof(EMPTY_MYOWARE_PROOF);
      setSerialLog([]);
      const connection = await connectWirelessMyoWare({
        onEmg: ingestEmg,
        onEnv: ingestEnv,
        onLine: (line) => {
          setSerialLog((prev) => [...prev.slice(-7), line]);
          const sample = parseSerialMyoWareLine(line);
          if (!sample) return;
          setUsbProof((prev) => {
            const next = applyMyoWareSampleToProof(prev, {
              ...sample,
              board: sample.board ?? "MyoWare Wireless Shield",
              chip: sample.chip ?? "MyoWare 2.0",
              hello: true,
            });
            const name = [next.board ?? "MyoWare Wireless Shield", next.chip ?? "MyoWare 2.0"].join(" · ");
            setDeviceName(name);
            deviceNameRef.current = name;
            return next;
          });
        },
        onDisconnect: handleGone,
      });
      connectionRef.current = connection;
      setDeviceName(connection.deviceName);
      deviceNameRef.current = connection.deviceName;
      setSource("bluetooth");
      sourceRef.current = "bluetooth";
      setConnected(true);
      setHistory(Array(HISTORY).fill(0));
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError" || name === "AbortError") {
        setError("No Bluetooth device was chosen. POWER ON the Wireless Shield, then tap Connect with Bluetooth and pick MyoWareSensor1.");
      } else if (name === "SecurityError") {
        setError("Bluetooth was blocked. Use Chrome or Edge on https://www.revivemotion.ai and allow Bluetooth.");
      } else {
        setError(err instanceof Error ? err.message : "Could not connect to the Wireless Shield.");
      }
      setConnected(false);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [handleGone, ingestEmg, ingestEnv]);

  const startRecording = useCallback(() => {
    if (!connected) {
      setError("Connect the MyoWare with Bluetooth first.");
      return;
    }
    samplesRef.current = [];
    recordStartRef.current = performance.now();
    recordingRef.current = true;
    setRecordCount(0);
    setRecording(true);
    setError("");
  }, [connected]);

  const stopAndSave = useCallback((userEmail: string) => {
    recordingRef.current = false;
    setRecording(false);
    const samples = samplesRef.current;
    const summary = summarizeMyoWareSamples(samples);
    if (!summary || !userEmail) {
      return "Need a few live EMG numbers first. Flex the muscle, then record again.";
    }
    saveMyoWareRecording({
      id: crypto.randomUUID(),
      userEmail,
      date: new Date().toISOString(),
      deviceName: deviceNameRef.current || "MyoWare 2.0",
      durationSec: summary.durationSec,
      avgEmg: summary.avgEmg,
      maxEmg: summary.maxEmg,
      samples,
    });
    samplesRef.current = [];
    setRecordCount(0);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("revive-myoware-saved"));
    }
    return `Saved ${samples.length} muscle readings · avg ${summary.avgEmg}% · peak ${summary.maxEmg}%.`;
  }, []);

  const value = useMemo(
    () => ({
      usbSupported,
      bluetoothSupported,
      connecting,
      connected,
      source,
      deviceName,
      emg,
      env,
      history,
      error,
      serialLog,
      usbProof,
      recording,
      recordCount,
      connectUsb,
      connectBluetooth,
      disconnect,
      startRecording,
      stopAndSave,
    }),
    [
      usbSupported,
      bluetoothSupported,
      connecting,
      connected,
      source,
      deviceName,
      emg,
      env,
      history,
      error,
      serialLog,
      usbProof,
      recording,
      recordCount,
      connectUsb,
      connectBluetooth,
      disconnect,
      startRecording,
      stopAndSave,
    ]
  );

  return <MyoWareContext.Provider value={value}>{children}</MyoWareContext.Provider>;
}

export function useMyoWare() {
  const ctx = useContext(MyoWareContext);
  if (!ctx) {
    throw new Error("useMyoWare must be used inside MyoWareProvider");
  }
  return ctx;
}
