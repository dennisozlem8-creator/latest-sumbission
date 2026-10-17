import { usbBlockReason, usbHeartRateSupported, usbPortLabel } from "@/lib/heart-sensor";

export const WIRED_MPU_BAUD = 115200;
export const BLUETOOTH_MPU_BAUD = 9600;

export type SerialMpuSample = {
  angle?: number;
  hello?: boolean;
  board?: string;
  chip?: string;
  i2cOk?: boolean;
  scan?: string;
  error?: string;
};

export function parseSerialMpuLine(line: string): SerialMpuSample | null {
  const text = line.trim().replace(/\r$/, "");
  if (!text) return null;
  if (/^HELLO\b/i.test(text) && /MPU/i.test(text)) {
    return { hello: true, chip: "MPU-6050", board: /ELEGOO/i.test(text) ? "Elegoo Uno R3" : undefined };
  }
  if (/^SRC\s+/i.test(text)) return { hello: true, board: "Elegoo Uno R3" };
  if (/^CHIP\s+/i.test(text) && /MPU/i.test(text)) return { hello: true, chip: "MPU-6050" };
  if (/^PONG\b/i.test(text) && /MPU/i.test(text)) return { hello: true, chip: "MPU-6050" };
  if (/^I2C OK\b/i.test(text)) return { hello: true, i2cOk: true, chip: "MPU-6050" };
  if (/^SCAN\b/i.test(text)) return { scan: text.replace(/^SCAN\s*/i, "") || "none" };
  if (/^ERR\b/i.test(text) || /no I2C/i.test(text)) return { error: text };
  const angleMatch = text.match(/^ANGLE\s*[:=]?\s*(-?\d{1,3})$/i);
  if (angleMatch) {
    const angle = Math.max(0, Math.min(180, Math.abs(Number(angleMatch[1]))));
    return { angle, hello: true, i2cOk: true };
  }
  return null;
}

export function requestUsbMpuPort() {
  if (!navigator.serial?.requestPort) {
    throw new Error(mpuUsbHelp() || "This browser cannot use USB.");
  }
  return navigator.serial.requestPort();
}

export function mpuUsbSupported() {
  return usbHeartRateSupported();
}

export function mpuUsbHelp() {
  const blocked = usbBlockReason().replace("/heart", "/motion");
  if (blocked) return blocked;
  if (mpuUsbSupported()) {
    return "Close Serial Monitor. Tap Connect with USB, pick the Arduino Uno, then move the joint.";
  }
  return blocked;
}

export type MpuConnection = {
  deviceName: string;
  disconnect: () => void;
};

type ConnectOptions = {
  port?: SerialPort;
  baudRate?: number;
  onAngle: (angle: number) => void;
  onLine?: (line: string) => void;
  onDisconnect: () => void;
};

export async function connectWiredMpu(options: ConnectOptions): Promise<MpuConnection> {
  const port = options.port ?? (await requestUsbMpuPort());
  try {
    await port.open({ baudRate: options.baudRate ?? WIRED_MPU_BAUD });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const name = error instanceof DOMException ? error.name : "";
    if (name === "InvalidStateError") {
      /* already open */
    } else if (name === "NetworkError" || /failed to open/i.test(message)) {
      throw new Error(
        "Chrome could not open the USB port. Close Serial Monitor, disconnect MyoWare or Heart if that tab is using USB, unplug the Elegoo, plug it back in, then tap Connect with USB."
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
          const sample = parseSerialMpuLine(line);
          if (sample?.angle != null) options.onAngle(sample.angle);
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
