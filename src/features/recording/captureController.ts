/**
 * CaptureController - Main orchestrator for screen recording
 * Manages recording state, step capture, and export
 */

import type { CaptureStep, ExportOptions } from "@models/models";
import type { RecordingContext } from "@models/events";
import { requestDisplayStream, stopDisplayStream } from "@core/capture/streamManager";

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
  setDescription: (stepId: string, description: string) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  setPeriodicIntervalSec: (seconds: number) => void;
  setCaptureLongEdge: (value: number | null) => void;
  getPreviewUrl: (blobKey: string) => Promise<string | null>;
  exportHtml: (options: ExportOptions) => Promise<Blob>;
  estimateHtmlExportSize: (options: ExportOptions) => Promise<number>;
  subscribe: (listener: (state: CaptureControllerState) => void) => () => void;
}

export function createCaptureController(): CaptureController {
  let context: RecordingContext = {
    state: "idle",
    elapsedMs: 0,
    stepCount: 0
  };

  let stream: MediaStream | null = null;
  const listeners = new Set<StateListener>();
  let tickTimerId: number | null = null;

  function notify(): void {
    listeners.forEach((l) => l(getState()));
  }

  function getState(): CaptureControllerState {
    return {
      context,
      steps: [],
      quotaWarning: false,
      periodicIntervalSec: 5,
      captureLongEdge: 1920,
      lastInfo: context.lastError
    };
  }

  const start = async (): Promise<void> => {
    context = { ...context, state: "requesting" };
    notify();

    try {
      const granted = await requestDisplayStream();
      stream = granted.stream;
      context = { ...context, state: "recording", stepCount: 0 };

      // Start timer
      tickTimerId = window.setInterval(() => {
        context = { ...context, elapsedMs: context.elapsedMs + 1000 };
        notify();
      }, 1000);

      // Listen for stream end
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        context = { ...context, state: "stopped" };
        if (tickTimerId !== null) {
          window.clearInterval(tickTimerId);
        }
        notify();
      });

      notify();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Display permission denied or screen capture not supported.";
      context = { ...context, state: "idle", lastError: message };
      notify();
    }
  };

  const pause = (): void => {
    if (context.state === "recording") {
      context = { ...context, state: "paused" };
      if (tickTimerId !== null) {
        window.clearInterval(tickTimerId);
      }
      notify();
    }
  };

  const resume = (): void => {
    if (context.state === "paused") {
      context = { ...context, state: "recording" };
      tickTimerId = window.setInterval(() => {
        context = { ...context, elapsedMs: context.elapsedMs + 1000 };
        notify();
      }, 1000);
      notify();
    }
  };

  const stop = async (): Promise<void> => {
    if (tickTimerId !== null) {
      window.clearInterval(tickTimerId);
      tickTimerId = null;
    }
    stopDisplayStream(stream);
    stream = null;
    context = { ...context, state: "stopped" };
    notify();
  };

  const setDescription = async (_stepId: string, _description: string): Promise<void> => {
    // Placeholder
  };

  const deleteStep = async (_stepId: string): Promise<void> => {
    // Placeholder
  };

  const setPeriodicIntervalSec = (_seconds: number): void => {
    // Placeholder
  };

  const setCaptureLongEdge = (_value: number | null): void => {
    // Placeholder
  };

  const getPreviewUrl = async (_blobKey: string): Promise<string | null> => {
    return null;
  };

  const exportHtml = async (_options: ExportOptions): Promise<Blob> => {
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>PSRWeb Export</title></head>
<body><h1>PSRWeb Recording</h1><p>No steps captured.</p></body>
</html>`;
    return new Blob([html], { type: "text/html" });
  };

  const estimateHtmlExportSize = async (_options: ExportOptions): Promise<number> => {
    return 10000;
  };

  return {
    getState,
    start,
    pause,
    resume,
    stop,
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
