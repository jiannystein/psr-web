/**
 * Presentation and formatting utilities
 */

import type { ExportQualityPreset } from "@models/models";

export type { ExportQualityPreset } from "@models/models";

export function formatByteSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatResolutionLabel(width: number, height: number): string {
  // Return the smaller dimension as the common resolution label
  const shortEdge = Math.min(width, height);
  if (shortEdge >= 1080) return "1080p";
  if (shortEdge >= 720) return "720p";
  if (shortEdge >= 480) return "480p";
  return `${shortEdge}p`;
}

export function formatTriggerLabel(trigger: string): string {
  // Format the trigger event label for display
  return trigger.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

export function qualityPresetDescription(preset: ExportQualityPreset): string {
  switch (preset) {
    case "lossless":
      return "PNG · pixel-perfect, no quality loss · largest file";
    case "medium":
      return "JPEG 85% · sharp and clear · recommended";
    case "low":
      return "JPEG 65% · smaller file · some softness";
    default:
      return "";
  }
}

export function formatTimestampInfo(ms: number): { isoUtc: string; localTime: string } {
  const date = new Date(ms);
  return {
    isoUtc: date.toISOString().split("T")[1].split(".")[0],
    localTime: date.toLocaleTimeString(),
  };
}
