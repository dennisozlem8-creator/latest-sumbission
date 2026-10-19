import { usbBlockReason, usbHeartRateSupported, usbPortLabel } from "@/lib/heart-sensor";

export const WIRED_MYOWARE_BAUD = 115200;
export const MYOWARE_BLE_SERVICE = "ec3af789-2154-49f4-a9fc-bc6c88e9e930";
export const MYOWARE_BLE_CHARACTERISTIC = "f3a56edf-8f1e-4533-93bf-5601b2e91308";
export const NORDIC_UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NORDIC_UART_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

export type SerialMyoWareSample = {
  env?: number;
  emg?: number;
  hello?: boolean;
  board?: string;
  chip?: string;
};

export type UsbMyoWareProof = {
  board: string | null;
  chip: string | null;
  started: boolean;
  lastEnv: number | null;
  lastEmg: number | null;
  lastPacketAt: number | null;
  packetCount: number;
};

export const EMPTY_MYOWARE_PROOF: UsbMyoWareProof = {
  board: null,
  chip: null,
  started: false,
  lastEnv: null,
  lastEmg: null,
  lastPacketAt: null,
  packetCount: 0,
};

export function applyMyoWareSampleToProof(
  proof: UsbMyoWareProof,
  sample: SerialMyoWareSample,
  now = Date.now()
): UsbMyoWareProof {
  const next = { ...proof };
  if (sample.board) next.board = sample.board;
  if (sample.chip) next.chip = sample.chip;
  if (sample.hello) {
    next.started = true;
    next.chip = next.chip ?? "MyoWare 2.0";
    next.board = next.board ?? sample.board ?? "MyoWare";
  }
  if (sample.env != null) {
    next.lastEnv = sample.env;
    next.lastPacketAt = now;
    next.packetCount += 1;
    next.started = true;
  }
  if (sample.emg != null) {
    next.lastEmg = sample.emg;
    next.lastPacketAt = now;
    next.packetCount += 1;
    next.started = true;
  }
  return next;
}

export function myoWareHasSignal(proof: UsbMyoWareProof) {
  return (proof.lastEnv ?? 0) > 8 || (proof.lastEmg ?? 0) > 1;
}

export function parseSerialMyoWareLine(line: string): SerialMyoWareSample | null {
  const text = line.trim().replace(/\r$/, "");
  if (!text) return null;
  if (/^HELLO\b/i.test(text) && /MYOWARE/i.test(text)) {
    return {
      hello: true,
      chip: "MyoWare 2.0",
      board: /WIRELESS/i.test(text) ? "MyoWare Wireless Shield" : /ELEGOO/i.test(text) ? "Elegoo Uno R3" : undefined,
    };
  }
  if (/^SRC\s+/i.test(text)) {
    return { board: "Elegoo Uno R3", hello: true };
  }
  if (/^CHIP\s+/i.test(text)) {
    return { chip: "MyoWare 2.0", hello: true };
  }
  if (/^PONG\b/i.test(text) && /MYOWARE/i.test(text)) {
    return { hello: true, chip: "MyoWare 2.0" };
  }
  const envMatch = text.match(/^(?:ENV|ADC)\s*[:=]?\s*(\d{1,4})$/i);
  if (envMatch) {
    const env = Number(envMatch[1]);
    return { env, emg: envToEffort(env), hello: true };
  }
  const emgMatch = text.match(/^(?:EMG|EFFORT)\s*[:=]?\s*(\d{1,3})$/i);
  if (emgMatch) {
    return { emg: Math.min(100, Number(emgMatch[1])), hello: true };
  }
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const env = Math.round(Number(text));
    if (env >= 0 && env <= 4095) {
      return { env, emg: envToEffort(env), hello: true };
    }
  }
  return null;
}

function envToEffort(env: number) {
  const emg = env > 1023 ? Math.round(env / 41) : Math.round(env / 10);
  return Math.max(0, Math.min(100, emg));
}

export type MyoWareConnection = {
  deviceName: string;
  disconnect: () => void;
};

type ConnectOptions = {
  port?: SerialPort;
  onEnv?: (env: number) => void;
  onEmg: (emg: number) => void;
  onLine?: (line: string) => void;
  onDisconnect: () => void;
};

export function requestUsbMyoWarePort() {
  if (!navigator.serial?.requestPort) {
    throw new Error(usbBlockReason().replace("/heart", "/muscle") || "This browser cannot use USB.");
  }
  return navigator.serial.requestPort();
}

export function bluetoothMyoWareSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.bluetooth?.requestDevice);
}

export function ingestMyoWareText(
  text: string,
  onSample: (sample: SerialMyoWareSample) => void,
  onLine?: (line: string) => void
) {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    onLine?.(trimmed);
    const sample = parseSerialMyoWareLine(trimmed);
    if (sample) onSample(sample);
  }
}

export async function connectWirelessMyoWare(options: ConnectOptions): Promise<MyoWareConnection> {
  if (!navigator.bluetooth?.requestDevice) {
    throw new Error(
      "This browser cannot use Bluetooth. Open Google Chrome or Microsoft Edge on a computer. Safari and iPhone cannot pair the Wireless Shield with this website."
    );
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: "MyoWare" }, { namePrefix: "ReviveMyoWare" }],
    optionalServices: [MYOWARE_BLE_SERVICE, NORDIC_UART_SERVICE],
  });

  const server = await device.gatt?.connect();
  if (!server) {
    throw new Error("Bluetooth found the shield, but it would not open. Flip POWER OFF, wait 3 seconds, POWER ON, then try Connect with Bluetooth again.");
  }

  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  try {
    const service = await server.getPrimaryService(MYOWARE_BLE_SERVICE);
    characteristic = await service.getCharacteristic(MYOWARE_BLE_CHARACTERISTIC);
  } catch {
    try {
      const service = await server.getPrimaryService(NORDIC_UART_SERVICE);
      characteristic = await service.getCharacteristic(NORDIC_UART_TX);
    } catch {
      throw new Error(
        "The Wireless Shield was found, but it is not sending muscle data. Upload wireless-myoware.ino with board ESP32 Dev Module, then POWER OFF, unplug USB, snap it onto the sensor, and POWER ON."
      );
    }
  }

  const decoder = new TextDecoder();
  const onValue = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic | null;
    const view = target?.value;
    if (!view) return;
    ingestMyoWareText(decoder.decode(view), (sample) => {
      if (sample.env != null) options.onEnv?.(sample.env);
      if (sample.emg != null) options.onEmg(sample.emg);
    }, options.onLine);
  };

  const onGone = () => {
    characteristic?.removeEventListener("characteristicvaluechanged", onValue);
    device.removeEventListener("gattserverdisconnected", onGone);
    options.onDisconnect();
  };

  characteristic.addEventListener("characteristicvaluechanged", onValue);
  device.addEventListener("gattserverdisconnected", onGone);
  await characteristic.startNotifications();

  options.onLine?.("HELLO MYOWARE WIRELESS");

  return {
    deviceName: device.name?.trim() || "MyoWare Wireless Shield",
    disconnect: () => {
      characteristic?.removeEventListener("characteristicvaluechanged", onValue);
      device.removeEventListener("gattserverdisconnected", onGone);
      try {
        characteristic?.stopNotifications().catch(() => undefined);
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

export async function connectWiredMyoWare(
  options: ConnectOptions
): Promise<MyoWareConnection> {
  const port = options.port ?? (await requestUsbMyoWarePort());
  try {
    await port.open({ baudRate: WIRED_MYOWARE_BAUD });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const name = error instanceof DOMException ? error.name : "";
    if (name === "InvalidStateError") {
      /* already open */
    } else if (name === "NetworkError" || /failed to open/i.test(message)) {
      throw new Error(
        "Chrome could not open the USB port. Close Serial Monitor, tap Disconnect on the Heart page if that tab is open, unplug the Elegoo, plug it back in, then tap Connect with USB."
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
  }, 1200);

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
          const sample = parseSerialMyoWareLine(line);
          if (sample?.env != null) options.onEnv?.(sample.env);
          if (sample?.emg != null) options.onEmg(sample.emg);
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
  return {
    deviceName: usbPortLabel(info),
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

export function myoWareBrowserHelp() {
  if (typeof navigator === "undefined") return "";
  if (bluetoothMyoWareSupported()) {
    return "Tap Connect with Bluetooth and pick MyoWareSensor1.";
  }
  if (!usbHeartRateSupported()) {
    return usbBlockReason().replace("/heart", "/muscle");
  }
  return "Tap Connect with Bluetooth and pick MyoWareSensor1, then flex the muscle under the pads.";
}
