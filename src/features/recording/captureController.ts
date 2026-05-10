/**
 * CaptureController - Main orchestrator for screen recording
 * Manages recording state, step capture, and export
 */

import { CaptureStep, ExportOptions } from "@models/models";
import { RecordingContext, RecordingEvent } from "@models/events";

export interface CaptureControllerState {
  steps: CaptureStep[];
  context: RecordingContext;
  captureLongEdge: number | null; // Max long edge for captures in pixels
  periodicIntervalSec: number; // Interval between periodic captures in seconds
  sourceResolution: {
    width: number;
    height: number;
  } | null;
  lastInfo: {
    width: number;
    height: number;
  } | null;
  quotaWarning: boolean; // Storage quota warning
  sourceType: "screen" | "window";
}

type StateListener = (state: CaptureControllerState) => void;

export class CaptureController {
  private state: CaptureControllerState;
  private listeners: Set<StateListener> = new Set();
  private timerInterval: number | null = null;

  constructor() {
    this.state = {
      steps: [],
      context: {
        state: "idle",
        elapsedMs: 0,
        stepCount: 0,
        lastError: null,
        captureResolution: null,
      },
      captureLongEdge: null,
      periodicIntervalSec: 5,
      sourceResolution: null,
      lastInfo: null,
      quotaWarning: false,
      sourceType: "screen",
    };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState(): CaptureControllerState {
    return this.state;
  }

  async startRecording(): Promise<void> {
    // Emit START_REQUESTED event
    this.dispatchEvent({ type: "START_REQUESTED" });

    // Simulate permission granting
    this.state.context.state = "recording";
    this.dispatchEvent({ type: "START_GRANTED" });

    // Start timer
    this.startTimer();
    this.notify();
  }

  pauseRecording(): void {
    if (this.state.context.state === "recording") {
      this.state.context.state = "paused";
      this.stopTimer();
      this.dispatchEvent({ type: "PAUSE" });
      this.notify();
    }
  }

  resumeRecording(): void {
    if (this.state.context.state === "paused") {
      this.state.context.state = "recording";
      this.startTimer();
      this.dispatchEvent({ type: "RESUME" });
      this.notify();
    }
  }

  stopRecording(): void {
    if (this.state.context.state !== "stopped") {
      this.stopTimer();
      this.state.context.state = "stopped";
      this.dispatchEvent({ type: "STOP" });
      this.notify();
    }
  }

  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      this.state.context.elapsedMs += 100;
      this.dispatchEvent({
        type: "TICK",
        elapsedMs: this.state.context.elapsedMs,
      });
      this.notify();
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private dispatchEvent(_event: RecordingEvent): void {
    // Event dispatch logic - can be extended later
  }

  addStep(step: CaptureStep): void {
    this.state.steps.push(step);
    this.state.context.stepCount = this.state.steps.length;
    this.dispatchEvent({ type: "STEP_CAPTURED", stepId: step.id });
    this.notify();
  }

  setDescription(stepId: string, description: string): void {
    const step = this.state.steps.find((s) => s.id === stepId);
    if (step) {
      step.description = description;
      this.notify();
    }
  }

  deleteStep(_stepId: string): void {
    this.state.steps = this.state.steps.filter((s) => s.id !== _stepId);
    this.state.context.stepCount = this.state.steps.length;
    this.notify();
  }

  setCaptureLongEdge(edge: number | null): void {
    this.state.captureLongEdge = edge;
    this.notify();
  }

  setPeriodicIntervalSec(sec: number): void {
    this.state.periodicIntervalSec = sec;
    this.notify();
  }

  estimateHtmlExportSize(_options: ExportOptions): number {
    // Rough estimate: base HTML + steps * avg step size
    const avgStepSize = 500000; // ~500KB per step (image + metadata)
    return 10000 + this.state.steps.length * avgStepSize;
  }

  getPreviewUrl = async (_stepId: string): Promise<string> => {
    // This would typically create a blob URL for the step image
    // For now, return a placeholder
    return "#";
  };

  start(): void {
    this.startRecording();
  }

  stop(): void {
    this.stopRecording();
  }

  async exportHtml(_options: ExportOptions): Promise<Blob> {
    // Generate HTML export
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PSRWeb Export</title>
</head>
<body>
  <h1>PSRWeb Recording</h1>
  <p>Steps: ${this.state.steps.length}</p>
  <p>Duration: ${Math.floor(this.state.context.elapsedMs / 1000)}s</p>
</body>
</html>`;

    return new Blob([html], { type: "text/html" });
  }
}

export function createCaptureController(): CaptureController {
  return new CaptureController();
}
