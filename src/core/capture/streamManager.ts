export interface ActiveStream {
  stream: MediaStream;
  sourceType: "tab" | "window" | "screen";
  label?: string;
  width?: number;
  height?: number;
}

export async function requestDisplayStream(): Promise<ActiveStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: "window",
      width: { ideal: 7680 },
      height: { ideal: 4320 },
      frameRate: { ideal: 1, max: 30 }
    },
    audio: false
  });

  const track = stream.getVideoTracks()[0];
  const settings = track.getSettings();

  const sourceType = settings.displaySurface === "browser"
    ? "tab"
    : settings.displaySurface === "window"
      ? "window"
      : "screen";

  return {
    stream,
    sourceType,
    label: track.label,
    width: settings.width,
    height: settings.height
  };
}

export function stopDisplayStream(stream: MediaStream | null): void {
  if (!stream) {
    return;
  }
  stream.getTracks().forEach((track) => track.stop());
}
