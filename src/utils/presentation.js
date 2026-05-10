/**
 * Presentation and formatting utilities
 */
export function formatByteSize(bytes) {
    if (bytes === 0)
        return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
export function formatResolutionLabel(width, height) {
    // Return the smaller dimension as the common resolution label
    const shortEdge = Math.min(width, height);
    if (shortEdge >= 1080)
        return "1080p";
    if (shortEdge >= 720)
        return "720p";
    if (shortEdge >= 480)
        return "480p";
    return `${shortEdge}p`;
}
export function formatTriggerLabel(trigger) {
    // Format the trigger event label for display
    return trigger.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}
export function qualityPresetDescription(preset) {
    switch (preset) {
        case "native":
            return "Original quality";
        case "1080p":
            return "1080p (best for sharing)";
        case "720p":
            return "720p (balanced)";
        case "480p":
            return "480p (smallest file)";
        default:
            return "Unknown";
    }
}
export function formatTimestampInfo(ms) {
    const date = new Date(ms);
    return {
        isoUtc: date.toISOString().split("T")[1].split(".")[0],
        localTime: date.toLocaleTimeString(),
    };
}
