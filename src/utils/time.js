/**
 * Time formatting utilities
 */
export function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export function formatElapsed(ms) {
    return formatDuration(ms);
}
export function formatTime(ms) {
    const date = new Date(ms);
    return date.toLocaleTimeString();
}
export function formatDate(ms) {
    const date = new Date(ms);
    return date.toLocaleDateString();
}
