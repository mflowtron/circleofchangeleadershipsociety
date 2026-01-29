import { Html5Qrcode } from "html5-qrcode";

export type QrStartPreset = {
  label: string;
  width?: number;
  height?: number;
  fps: number;
};

export function getDefaultQrStartPresets(): QrStartPreset[] {
  // Ordered from highest quality to most compatible.
  return [
    { label: "4k@30", width: 3840, height: 2160, fps: 30 },
    { label: "1440p@30", width: 2560, height: 1440, fps: 30 },
    { label: "1080p@30", width: 1920, height: 1080, fps: 30 },
    { label: "720p@30", width: 1280, height: 720, fps: 30 },
    // Last resort: lower fps for weaker devices
    { label: "1080p@15", width: 1920, height: 1080, fps: 15 },
    { label: "720p@15", width: 1280, height: 720, fps: 15 },
  ];
}

export function serializeDomError(err: unknown): {
  name?: string;
  message: string;
  raw: unknown;
} {
  if (err instanceof Error) return { name: err.name, message: err.message, raw: err };
  if (typeof err === "string") return { message: err, raw: err };
  try {
    return { message: JSON.stringify(err), raw: err };
  } catch {
    return { message: String(err), raw: err };
  }
}

function buildCameraConstraints(base: MediaTrackConstraints, preset: QrStartPreset): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = { ...base };
  if (preset.width) constraints.width = { ideal: preset.width };
  if (preset.height) constraints.height = { ideal: preset.height };
  return constraints;
}

export async function startQrWithFallback(params: {
  scanner: Html5Qrcode;
  cameraBases: MediaTrackConstraints[];
  onDecodedText: (text: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseScanConfig: any;
  presets?: QrStartPreset[];
}): Promise<{ preset: QrStartPreset; cameraConstraints: MediaTrackConstraints }>
{
  const presets = params.presets ?? getDefaultQrStartPresets();
  const errors: Array<{ preset: string; baseIndex: number; name?: string; message: string }> = [];

  for (let baseIndex = 0; baseIndex < params.cameraBases.length; baseIndex++) {
    const base = params.cameraBases[baseIndex];
    for (const preset of presets) {
      const cameraConstraints = buildCameraConstraints(base, preset);
      const scanConfig = { ...params.baseScanConfig, fps: preset.fps };

      console.groupCollapsed?.(
        `[QRScanner] start attempt: ${preset.label} (base ${baseIndex + 1}/${params.cameraBases.length})`
      );
      console.log("cameraConstraints:", cameraConstraints);
      console.log("scanConfig:", scanConfig);

      try {
        await params.scanner.start(
          cameraConstraints,
          scanConfig,
          params.onDecodedText,
          () => {} // Ignore "no QR found" errors
        );
        console.log(`[QRScanner] start success using preset: ${preset.label}`);
        console.groupEnd?.();
        return { preset, cameraConstraints };
      } catch (err) {
        const e = serializeDomError(err);
        errors.push({ preset: preset.label, baseIndex, name: e.name, message: e.message });
        console.warn(`[QRScanner] start failed for preset ${preset.label}:`, e.name, e.message, e.raw);
        console.groupEnd?.();
      }
    }
  }

  const last = errors[errors.length - 1];
  const summary = last
    ? `Last error: ${last.name ? `${last.name}: ` : ""}${last.message}`
    : "Unknown error";

  console.error("[QRScanner] All presets failed", errors);
  throw new Error(`Failed to start camera. ${summary}`);
}
