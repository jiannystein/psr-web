/**
 * Core domain models for PSRWeb
 */

import type { Shape } from "@models/annotations";

export interface CaptureImage {
  width: number;
  height: number;
  format: "png" | "jpeg";
  hash: string;
  blobKey: string; // Reference to blob in storage
  byteSize: number; // Size of image in bytes
}

export interface CaptureCursor {
  xPx: number;
  yPx: number;
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
}

export type ExportQualityPreset = "native" | "1080p" | "720p" | "480p";

export interface ExportOptions {
  format: "html" | "json" | "pdf";
  includeMetadata: boolean;
  includeTimestamps: boolean;
  inlineImages: boolean;
  printOptimized: boolean;
  qualityPreset: ExportQualityPreset;
}
