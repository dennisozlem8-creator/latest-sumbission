export const HEART_RATE_SERVICE = "heart_rate";
export const HEART_RATE_MEASUREMENT = "heart_rate_measurement";
export const WIRED_HEART_BAUD = 115200;

export const NO_I2C_HELP =
  "No I2C. USB is fine. The chip did not answer. If the power pin says VIN or VCC, move that one wire to Uno 5V. Leave the sensor 3.3V pin empty. Never put 5V on a pin labeled only 3.3V. GND → GND. SCL → A5. SDA → A4.";

export function bluetoothHeartRateSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.bluetooth?.requestDevice);
}

export function usbHeartRateSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.serial?.requestPort);
}

/** Bluetooth Heart Rate Measurement (0x2A37). */
export function parseHeartRateMeasurement(value: DataView): number | null {
  if (value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  const hr16 = (flags & 0x01) === 1;
  const bpm = hr16
    ? value.byteLength >= 3
      ? value.getUint16(1, true)
      : null
    : value.getUint8(1);
  if (bpm == null || !Number.isFinite(bpm) || bpm <= 0 || bpm > 250) return null;
  return bpm;
}

export type SerialHeartSample = {
  bpm?: number;
  raw?: number;
  error?: string;
  board?: string;
  chip?: string;
  chipId?: number;
  i2cOk?: boolean;
  hello?: boolean;
  noData?: boolean;
  scan?: string;
};

export type UsbHeartProof = {
  board: string | null;
  chip: string | null;
  chipId: number | null;
  i2cOk: boolean;
  started: boolean;
  lastRaw: number | null;
  lastBpm: number | null;
  lastPacketAt: number | null;
  packetCount: number;
  lastScan: string | null;
  noData: boolean;
};

export const EMPTY_USB_PROOF: UsbHeartProof = {
  board: null,
  chip: null,
  chipId: null,
  i2cOk: false,
  started: false,
  lastRaw: null,
  lastBpm: null,
  lastPacketAt: null,
  packetCount: 0,
  lastScan: null,
  noData: false,
};

const MAX30102_PART_ID = 21;

export function applySerialSampleToProof(
  proof: UsbHeartProof,
  sample: SerialHeartSample,
  now = Date.now()
): UsbHeartProof {
  const next = { ...proof };
  if (sample.board) next.board = sample.board;
  if (sample.chip) next.chip = sample.chip;
  if (sample.chipId != null) next.chipId = sample.chipId;
  if (sample.i2cOk) next.i2cOk = true;
  if (sample.hello) {
    next.started = true;
    next.chip = next.chip ?? "MAX30102";
    next.board = next.board ?? "Elegoo Uno R3";
  }
  if (sample.scan != null) {
    next.lastScan = sample.scan;
    next.started = true;
  }
  if (sample.noData) {
    next.noData = true;
  }
  if (sample.raw != null) {
    next.lastRaw = sample.raw;
    next.lastPacketAt = now;
    next.packetCount += 1;
    next.noData = sample.raw < 120;
  }
  if (sample.bpm != null) {
    next.lastBpm = sample.bpm;
    next.lastPacketAt = now;
    next.packetCount += 1;
    next.noData = false;
  }
  return next;
}

export function usbHasFingerData(proof: UsbHeartProof) {
  return (proof.lastRaw ?? 0) >= 120;
}

export function usbSourceConfirmed(proof: UsbHeartProof, now = Date.now()) {
  const fresh = proof.lastPacketAt != null && now - proof.lastPacketAt < 2500;
  const named = (proof.chip ?? "").toUpperCase().includes("MAX30102") || proof.started;
  return named && fresh && usbHasFingerData(proof);
}

export function usbPortLabel(info?: { usbVendorId?: number }) {
  const vid = info?.usbVendorId;
  if (vid === 0x2341 || vid === 0x2a03) return "Elegoo Uno R3 (Arduino USB)";
  if (vid === 0x1a86) return "Elegoo Uno R3 (CH340 USB)";
  if (vid != null) return `USB board (${vid.toString(16)})`;
  return "Elegoo Uno R3 (USB)";
}

function boardLabel(code: string) {
  if (/ELEGOO/i.test(code)) return "Elegoo Uno R3";
  return code.replace(/_/g, " ");
}

/** Lines from the Arduino sketch: `BPM 72`, `RAW 512`, `HELLO MAX30102 ELEGOO_UNO_R3`. */
export function parseSerialHeartLine(line: string): SerialHeartSample | null {
  const text = line.trim().replace(/\r$/, "");
  if (!text) return null;
  if (/^HELLO\b/i.test(text) && /MAX30102/i.test(text)) {
    return {
      hello: true,
      chip: "MAX30102",
      board: /ELEGOO/i.test(text) ? "Elegoo Uno R3" : undefined,
    };
  }
  if (/^SRC\s+/i.test(text)) {
    return { board: boardLabel(text.replace(/^SRC\s+/i, "").trim()) };
  }
  if (/^CHIP\s+/i.test(text)) {
    return { chip: text.replace(/^CHIP\s+/i, "").trim() };
  }
  if (/^I2C\s+OK/i.test(text)) {
    return { i2cOk: true };
  }
  if (/^I2C\s+PINS\b/i.test(text)) {
    return { i2cOk: true, hello: true, chip: "MAX30102" };
  }
  if (/^PONG\b/i.test(text)) {
    const hex = text.match(/PONG\s+([0-9A-Fa-f]+)/i);
    const addr = hex ? Number.parseInt(hex[1], 16) : 0;
    return { hello: true, chip: "MAX30102", i2cOk: addr > 0 };
  }
  if (/^I2C\s+MODE\b/i.test(text)) {
    return { hello: true, chip: "MAX30102" };
  }
  if (/^BUS RECOVER\b/i.test(text) || /^LED TRY\b/i.test(text) || /^RETRY I2C\b/i.test(text)) {
    return { hello: true, chip: "MAX30102" };
  }
  if (/^SCAN\b/i.test(text)) {
    const found = !/\bnone\b/i.test(text);
    return found
      ? { i2cOk: true, scan: text, hello: true }
      : {
          hello: true,
          scan: "none",
          error: NO_I2C_HELP,
        };
  }
  if (/^ADDR\b/i.test(text)) {
    return { i2cOk: true };
  }
  if (/MAX30102 start/i.test(text)) {
    return { hello: true, chip: "MAX30102" };
  }
  const idMatch = text.match(/^ID\s+(\d{1,3})$/i);
  if (idMatch) {
    return { chipId: Number(idMatch[1]), chip: Number(idMatch[1]) === MAX30102_PART_ID ? "MAX30102" : undefined };
  }
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text) as { bpm?: unknown; raw?: unknown; hr?: unknown };
      const bpmValue = obj.bpm ?? obj.hr;
      const bpm = typeof bpmValue === "number" ? bpmValue : Number(bpmValue);
      const raw = typeof obj.raw === "number" ? obj.raw : Number(obj.raw);
      const sample: SerialHeartSample = {};
      if (Number.isFinite(bpm) && bpm > 0 && bpm <= 250) sample.bpm = Math.round(bpm);
      if (Number.isFinite(raw) && raw >= 0) sample.raw = Math.round(raw);
      return sample.bpm != null || sample.raw != null ? sample : null;
    } catch {
      return null;
    }
  }
  const bpmMatch = text.match(/^(?:BPM|HR|HEART)\s*[:=]?\s*(\d{1,3})$/i);
  if (bpmMatch) {
    const bpm = Number(bpmMatch[1]);
    return bpm > 0 && bpm <= 250 ? { bpm } : null;
  }
  const rawMatch = text.match(/^(?:RAW|ADC|SIG|VALUE)\s*[:=]?\s*(\d{1,8})$/i);
  if (rawMatch) {
    return { raw: Number(rawMatch[1]) };
  }
  if (/^NODATA\b/i.test(text)) {
    return { noData: true };
  }
  if (/^ERR\b/i.test(text)) {
    if (/no I2C/i.test(text)) return { hello: true, scan: "none", error: NO_I2C_HELP };
    return { error: text.replace(/^ERR\s*/i, "").trim() || text };
  }
  if (/^\d{1,3}$/.test(text)) {
    const bpm = Number(text);
    return bpm > 0 && bpm <= 250 ? { bpm } : null;
  }
  return null;
}

export type HeartRateConnection = {
  deviceName: string;
  source: "bluetooth" | "usb";
  disconnect: () => void;
};

type ConnectOptions = {
  acceptAll?: boolean;
  port?: SerialPort;
  onBpm: (bpm: number) => void;
  onRaw?: (raw: number) => void;
  onErrorLine?: (message: string) => void;
  onLine?: (line: string) => void;
  onDisconnect: () => void;
};

function requestFilters(): BluetoothRequestDeviceFilter[] {
  return [
    { services: [HEART_RATE_SERVICE] },
    { namePrefix: "Polar" },
    { namePrefix: "TICKR" },
    { namePrefix: "Wahoo" },
    { namePrefix: "HRM" },
    { namePrefix: "Coospo" },
    { namePrefix: "Magene" },
    { namePrefix: "Garmin" },
    { namePrefix: "WHOOP" },
    { namePrefix: "Scosche" },
    { namePrefix: "Coros" },
  ];
}

export async function connectHeartRateSensor(
  options: ConnectOptions
): Promise<HeartRateConnection> {
  if (!navigator.bluetooth?.requestDevice) {
    throw new Error("This browser cannot talk to Bluetooth heart sensors. Use Chrome or Edge on a computer, or Chrome on Android.");
  }

  const device = options.acceptAll
    ? await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [HEART_RATE_SERVICE],
      })
    : await navigator.bluetooth.requestDevice({
        filters: requestFilters(),
        optionalServices: [HEART_RATE_SERVICE],
      });

  const server = await device.gatt?.connect();
  if (!server) {
    throw new Error("The sensor was found, but it would not open a connection. Wake the strap and try again.");
  }

  const service = await server.getPrimaryService(HEART_RATE_SERVICE);
  const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);

  const onValue = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic | null;
    const view = target?.value;
    if (!view) return;
    const bpm = parseHeartRateMeasurement(view);
    if (bpm != null) options.onBpm(bpm);
  };

  const onGone = () => {
    characteristic.removeEventListener("characteristicvaluechanged", onValue);
    device.removeEventListener("gattserverdisconnected", onGone);
    options.onDisconnect();
  };

  characteristic.addEventListener("characteristicvaluechanged", onValue);
  device.addEventListener("gattserverdisconnected", onGone);
  await characteristic.startNotifications();

  return {
    deviceName: device.name?.trim() || "Heart sensor",
    source: "bluetooth",
    disconnect: () => {
      characteristic.removeEventListener("characteristicvaluechanged", onValue);
      device.removeEventListener("gattserverdisconnected", onGone);
      try {
        characteristic.stopNotifications().catch(() => undefined);
      } catch {
        /* ignore */
      }
      try {
        device.gatt?.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

export function requestUsbHeartPort() {
  if (!navigator.serial?.requestPort) {
    throw new Error(usbBlockReason());
  }
  return navigator.serial.requestPort();
}

export async function connectWiredHeartSensor(
  options: ConnectOptions
): Promise<HeartRateConnection> {
  const port = options.port ?? (await requestUsbHeartPort());
  try {
    await port.open({ baudRate: WIRED_HEART_BAUD });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const name = error instanceof DOMException ? error.name : "";
    if (name === "InvalidStateError") {
      /* already open from a previous try */
    } else if (name === "NetworkError" || /failed to open/i.test(message)) {
      throw new Error(
        "Chrome could not open the USB port. Close Arduino Serial Monitor and Arduino IDE, unplug the Elegoo, plug it back in, then tap Connect with USB again. Pick the Arduino / USB Serial Device in the Chrome list."
      );
    } else {
      throw error;
    }
  }
  try {
    await port.setSignals?.({ dataTerminalReady: true, requestToSend: false });
  } catch {
    /* some adapters ignore DTR */
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let stopped = false;
  const reader = port.readable?.getReader();
  if (!reader) {
    await port.close().catch(() => undefined);
    throw new Error("The USB port opened, but this browser could not read from it.");
  }

  const onGone = () => {
    if (stopped) return;
    stopped = true;
    options.onDisconnect();
  };
  port.addEventListener("disconnect", onGone);

  const pingUsb = async () => {
    if (stopped || !port.writable) return;
    const writer = port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode("PING\n"));
    } catch {
      /* ignore */
    } finally {
      try {
        writer.releaseLock();
      } catch {
        /* ignore */
      }
    }
  };
  const pingTimer = setTimeout(() => {
    void pingUsb();
  }, 1600);

  void (async () => {
    try {
      while (!stopped) {
        const result = await reader.read();
        if (result.done) break;
        if (!result.value) continue;
        buffer += decoder.decode(result.value, { stream: true });
        let nl = buffer.indexOf("\n");
        while (nl >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, "").trim();
          buffer = buffer.slice(nl + 1);
          if (line) options.onLine?.(line);
          const sample = parseSerialHeartLine(line);
          if (sample?.bpm != null) options.onBpm(sample.bpm);
          if (sample?.raw != null) options.onRaw?.(sample.raw);
          if (sample?.error) options.onErrorLine?.(sample.error);
          nl = buffer.indexOf("\n");
        }
      }
    } catch {
      /* port closed */
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* ignore */
      }
      onGone();
    }
  })();

  const info = port.getInfo?.() ?? {};
  const label = usbPortLabel(info);

  return {
    deviceName: label,
    source: "usb",
    disconnect: () => {
      stopped = true;
      clearTimeout(pingTimer);
      port.removeEventListener("disconnect", onGone);
      void (async () => {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        try {
          await port.close();
        } catch {
          /* ignore */
        }
      })();
    },
  };
}

export function usbBlockReason() {
  if (typeof navigator === "undefined") return "";
  if (usbHeartRateSupported()) return "";
  const ua = navigator.userAgent;
  const iPhone = /iPhone|iPad|iPod/i.test(ua);
  const safari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg|Firefox|Chromium/i.test(ua);
  if (iPhone) {
    return "You are on a phone. Pair the Bluetooth sensor from Chrome on a Mac or Windows computer — not this phone.";
  }
  if (safari) {
    return "You are in Safari. Safari cannot pair this Bluetooth device. On this same computer, open Google Chrome, go to https://www.revivemotion.ai/heart, then tap Connect with Bluetooth.";
  }
  return "This browser cannot use Bluetooth. Open Google Chrome or Microsoft Edge on a computer.";
}

export function heartRateBrowserHelp() {
  if (typeof navigator === "undefined") return "";
  const blocked = usbBlockReason();
  if (blocked) return blocked;
  if (usbHeartRateSupported()) {
    return "Put the strap on, then tap Connect with Bluetooth and pick it in the Chrome list.";
  }
  if (bluetoothHeartRateSupported()) {
    return "Put the strap on, wait a few seconds, then tap Connect. A Chrome window will ask which device to use.";
  }
  return usbBlockReason();
}
