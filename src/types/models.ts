/**
 * Core domain models for PSRWeb
 */

import type { Shape } from "@models/annotations";

export type RecordingState = "idle" | "requesting" | "recording" | "paused" | "stopped";

export type CaptureSourceType = "tab" | "window" | "screen";

export type TriggerType =
  | "left"
  | "right"
  | "double"
  | "keyboard-enter"
  | "keyboard-tab"
  | "periodic"
  | "window-change";

export interface AppSettings {
  theme: "dark";
  periodicCaptureEnabled: boolean;
  periodicIntervalSec: number;
  autoWindowChangeDetection: boolean;
  maxSessionHours: number;
  preferredImageFormat: "webp" | "jpeg";
  imageQuality: number;
  warnStorageThresholdPct: number;
  dedupeEnabled: boolean;
  privacyNoticeDismissed: boolean;
}
export interface CaptureImage {
  width: number;
  height: number;
  format: "png" | "jpeg";
  hash: string;
  blobKey: string; // Reference to blob in storage
  byteSize: number; // Size of image in bytes
    mimeType?: string;
}

export interface CaptureCursor {
  xPx: number;
  yPx: number;
    xNorm?: number;
    yNorm?: number;
}

export interface CaptureStep {
  id: string;
  sessionId: string;
  index: number;
  stepNumber: number; // Display number
  trigger: string;
  triggerType: string; // Type of trigger event
  description: string;
  image: CaptureImage;
  cursor: CaptureCursor;
  capturedAt: number; // milliseconds since epoch
  annotations: Shape[]; // Array of annotation shapes
  annotation: {
    description: string;
    shapes?: unknown[]; // Annotation shapes
  };
}

export interface CaptureSession {
  id: string;
  startTime: number;
  endTime?: number;
  state: "idle" | "requesting" | "recording" | "paused" | "stopped";
  stepCount: number;
    startedAt?: string;
    endedAt?: string;
    sourceType?: CaptureSourceType;
    sourceLabel?: string;
    totalSteps?: number;
    settingsSnapshot?: AppSettings;
    storageBytes?: number;
    warnings?: string[];
}

export type ExportQualityPreset = "lossless" | "medium" | "low";

export interface ExportOptions {
  format: "html" | "json" | "pdf";
  includeMetadata: boolean;
  includeTimestamps: boolean;
  inlineImages: boolean;
  printOptimized: boolean;
    qualityPreset?: ExportQualityPreset;
}
