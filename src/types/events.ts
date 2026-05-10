/**
 * Recording context and event types
 */

export interface RecordingContext {
  state: "idle" | "requesting" | "recording" | "paused" | "stopped";
  elapsedMs: number;
  stepCount: number;
  lastError: string | null;
  captureResolution: number | null; // max long edge in pixels
}

export type RecordingEvent =
  | { type: "START_REQUESTED" }
  | { type: "START_GRANTED" }
  | { type: "TICK"; elapsedMs: number }
  | { type: "STEP_CAPTURED"; stepId: string }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "ERROR"; message: string };
