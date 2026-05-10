/**
 * Recording context and event types
 */

export interface RecordingContext {
  state: "idle" | "requesting" | "recording" | "paused" | "stopped";
  elapsedMs: number;
  stepCount: number;
  lastError?: string;
  captureResolution?: number;
}

export type RecordingEvent =
  | { type: "START_REQUESTED" }
  | { type: "START_GRANTED" }
  | { type: "START_DENIED"; error: string }
  | { type: "TICK"; elapsedMs: number }
  | { type: "STEP_CAPTURED"; triggerType: string }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "STREAM_ENDED" }
  | { type: "ERROR"; message: string };
