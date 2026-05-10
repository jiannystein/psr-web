/**
 * Time formatting utilities
 */

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatElapsed(ms: number): string {
  return formatDuration(ms);
}

export function formatTime(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString();
}

export function formatDate(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleDateString();
}

  export function nowIso(): string {
    return new Date().toISOString();
    }
