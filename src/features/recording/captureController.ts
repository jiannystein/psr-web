/**
 * CaptureController - Main orchestrator for screen recording.
 * Handles: stream management, frame extraction, input triggers, periodic capture,
 * in-memory step storage, preview URLs, and HTML export.
 */

import type { CaptureStep, CaptureSession, ExportOptions, TriggerType } from "@models/models";
import type { RecordingContext } from "@models/events";
import { requestDisplayStream, stopDisplayStream } from "@core/capture/streamManager";
import { extractFrame } from "@core/capture/frameExtractor";
import { attachInputTriggers } from "@features/recording/inputTriggers";
import type { InputTriggerSubscription } from "@features/recording/inputTriggers";
import { generateHtmlExport, estimateHtmlExportSizePrecise } from "@features/export/exportHtml";

export interface CaptureControllerState {
  context: RecordingContext;
  steps: CaptureStep[];
  quotaWarning: boolean;
  periodicIntervalSec: number;
  captureLongEdge: number | null;
  sourceType?: string;
  sourceResolution?: { width: number; height: number };
  lastInfo?: string;
}

type StateListener = (state: CaptureControllerState) => void;

export interface CaptureController {
  getState: () => CaptureControllerState;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  captureNow: () => Promise<void>;
  setDescription: (stepId: string, description: string) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  setPeriodicIntervalSec: (seconds: number) => void;
  setCaptureLongEdge: (value: number | null) => void;
  getPreviewUrl: (blobKey: string) => Promise<string | null>;
  exportHtml: (options: ExportOptions, compositeUrlMap?: Record<string, string>) => Promise<Blob>;
  estimateHtmlExportSize: (options: ExportOptions) => Promise<number>;
  subscribe: (listener: (state: CaptureControllerState) => void) => () => void;
}

export function createCaptureController(): CaptureController {
  // --- Context & listener state ---
  let context: RecordingContext = { state: "idle", elapsedMs: 0, stepCount: 0 };
  const listeners = new Set<StateListener>();

  // --- Recording state ---
  let stream: MediaStream | null = null;
  let videoEl: HTMLVideoElement | null = null;
  let sessionId = "";
  let sessionStartTime = 0;
  let steps: CaptureStep[] = [];

  // blobKey -> Blob (for export & preview creation)
  const blobs = new Map<string, Blob>();

  // --- Timers ---
  let tickTimerId: number | null = null;
  let periodicTimerId: number | null = null;

  // --- Settings ---
  let periodicIntervalSec = 5;
  let captureLongEdge: number | null = 1920;

  // --- Input triggers ---
  let inputSub: InputTriggerSubscription | null = null;

  // --- Generation counter to cancel in-flight captures when stop is called ---
  let captureGeneration = 0;

  // --- Helpers ---
  function notify(): void {
    const snapshot = getState();
    listeners.forEach((l) => l(snapshot));
  }

  function getState(): CaptureControllerState {
    return {
      context: { ...context },
      steps: [...steps],
      quotaWarning: blobs.size > 200,
      periodicIntervalSec,
      captureLongEdge,
      sourceType: undefined,
      lastInfo: context.lastError
    };
  }

  // --- Core frame capture ---
  async function captureStep(triggerType: TriggerType, cursor?: { x: number; y: number }): Promise<void> {
    if (!videoEl || (context.state !== "recording" && context.state !== "paused")) {
      return;
    }

    // Snapshot the generation at the start so we can bail if stop() fires during the async work
    const gen = captureGeneration;

    let frame;
    try {
      frame = extractFrame(videoEl, captureLongEdge ?? undefined);
    } catch {
      return; // Video not ready yet; skip this capture
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      frame.canvas.toBlob(
        (b) => resolve(b),
        "image/jpeg",
        0.92
      );
    });

    // If stop() was called while we were awaiting toBlob, discard this capture
    if (captureGeneration !== gen || !blob) {
      return;
    }

    const blobKey = `blob_${Date.now()}_${steps.length}`;
    blobs.set(blobKey, blob);

    const step: CaptureStep = {
      id: `step_${blobKey}`,
      sessionId,
      index: steps.length,
      stepNumber: steps.length + 1,
      trigger: triggerType,
      triggerType,
      description: "",
      image: {
        width: frame.width,
        height: frame.height,
        format: "jpeg",
        hash: blobKey,
        blobKey,
        byteSize: blob.size,
        mimeType: "image/jpeg"
      },
      cursor: cursor
        ? { xPx: cursor.x, yPx: cursor.y }
        : { xPx: 0, yPx: 0 },
      capturedAt: Date.now(),
      annotations: [],
      annotation: { description: "" }
    };

    steps = [...steps, step];
    context = { ...context, stepCount: steps.length };
    notify();
  }

  // --- Periodic timer ---
  function startPeriodicTimer(): void {
    if (periodicIntervalSec > 0) {
      periodicTimerId = window.setInterval(() => {
        void captureStep("periodic");
      }, periodicIntervalSec * 1000);
    }
  }

  function stopPeriodicTimer(): void {
    if (periodicTimerId !== null) {
      window.clearInterval(periodicTimerId);
      periodicTimerId = null;
    }
  }

  // --- Video element lifecycle ---
  function createVideoElement(mediaStream: MediaStream): HTMLVideoElement {
    const video = document.createElement("video");
    video.srcObject = mediaStream;
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(video);
    return video;
  }

  function destroyVideoElement(): void {
    if (videoEl) {
      videoEl.pause();
      videoEl.srcObject = null;
      videoEl.remove();
      videoEl = null;
    }
  }

  // --- Public API ---
  const start = async (): Promise<void> => {
    context = { ...context, state: "requesting", lastError: undefined };
    notify();

    try {
      const granted = await requestDisplayStream();
      stream = granted.stream;

      sessionId = `session_${Date.now()}`;
      sessionStartTime = Date.now();
      steps = [];
      blobs.clear();

      // Create hidden video element and wait for it to be ready
      videoEl = createVideoElement(stream);
      await videoEl.play();

      context = { ...context, state: "recording", stepCount: 0, elapsedMs: 0 };

      // Tick timer (1s)
      tickTimerId = window.setInterval(() => {
        context = { ...context, elapsedMs: context.elapsedMs + 1000 };
        notify();
      }, 1000);

      // Periodic captures
      startPeriodicTimer();

      // Click / keyboard triggers
      inputSub = attachInputTriggers((evt) => {
        void captureStep(evt.triggerType, evt.cursor);
      });

      // Auto-stop when stream ends (user clicks "Stop sharing" in browser)
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void stop();
      });

      notify();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Screen share permission was denied or is not supported.";
      context = { ...context, state: "idle", lastError: message };
      notify();
    }
  };

  const pause = (): void => {
    if (context.state !== "recording") return;
    stopPeriodicTimer();
    if (tickTimerId !== null) {
      window.clearInterval(tickTimerId);
      tickTimerId = null;
    }
    context = { ...context, state: "paused" };
    notify();
  };

  const resume = (): void => {
    if (context.state !== "paused") return;
    tickTimerId = window.setInterval(() => {
      context = { ...context, elapsedMs: context.elapsedMs + 1000 };
      notify();
    }, 1000);
    startPeriodicTimer();
    context = { ...context, state: "recording" };
    notify();
  };

  const stop = async (): Promise<void> => {
    // Immediately invalidate any in-flight captures (e.g. triggered by the Stop button click itself)
    captureGeneration++;

    // Clean up timers
    if (tickTimerId !== null) {
      window.clearInterval(tickTimerId);
      tickTimerId = null;
    }
    stopPeriodicTimer();

    // Dispose input triggers
    if (inputSub) {
      inputSub.dispose();
      inputSub = null;
    }

    // Stop stream and video
    stopDisplayStream(stream);
    stream = null;
    destroyVideoElement();

    context = { ...context, state: "stopped" };
    notify();
  };

  const captureNow = async (): Promise<void> => {
    await captureStep("left");
  };

  const setDescription = async (stepId: string, description: string): Promise<void> => {
    steps = steps.map((s) =>
      s.id === stepId
        ? { ...s, description, annotation: { ...s.annotation, description } }
        : s
    );
    notify();
  };

  const deleteStep = async (stepId: string): Promise<void> => {
    const target = steps.find((s) => s.id === stepId);
    if (target) {
      blobs.delete(target.image.blobKey);
    }
    steps = steps
      .filter((s) => s.id !== stepId)
      .map((s, i) => ({ ...s, index: i, stepNumber: i + 1 }));
    context = { ...context, stepCount: steps.length };
    notify();
  };

  const setPeriodicIntervalSec = (seconds: number): void => {
    periodicIntervalSec = seconds;
    stopPeriodicTimer();
    if (context.state === "recording") {
      startPeriodicTimer();
    }
    notify();
  };

  const setCaptureLongEdge = (value: number | null): void => {
    captureLongEdge = value;
    notify();
  };

  const getPreviewUrl = async (blobKey: string): Promise<string | null> => {
    const blob = blobs.get(blobKey);
    return blob ? URL.createObjectURL(blob) : null;
  };

  const exportHtml = async (options: ExportOptions, compositeUrlMap?: Record<string, string>): Promise<Blob> => {
    if (steps.length === 0) {
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PSRWeb Export</title></head>
<body style="font-family:sans-serif;padding:2rem"><h1>PSRWeb Recording</h1><p>No steps were captured.</p></body></html>`;
      return new Blob([html], { type: "text/html" });
    }

    const session: CaptureSession = {
      id: sessionId || "unknown",
      startTime: sessionStartTime || Date.now(),
      state: context.state,
      stepCount: steps.length
    };

    return generateHtmlExport(session, steps, new Map(blobs), options, compositeUrlMap);
  };

  const estimateHtmlExportSize = async (options: ExportOptions): Promise<number> => {
    return estimateHtmlExportSizePrecise(steps, new Map(blobs), options);
  };

  return {
    getState,
    start,
    pause,
    resume,
    stop,
    captureNow,
    setDescription,
    deleteStep,
    setPeriodicIntervalSec,
    setCaptureLongEdge,
    getPreviewUrl,
    exportHtml,
    estimateHtmlExportSize,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    }
  };
}
