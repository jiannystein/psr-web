export function extractFrame(video, maxLongEdge) {
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (!width || !height) {
        width = 1280;
        height = 720;
    }
    if (maxLongEdge) {
        const longEdge = Math.max(width, height);
        if (longEdge > maxLongEdge) {
            const scale = maxLongEdge / longEdge;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }
    ctx.drawImage(video, 0, 0, width, height);
    return { canvas, width, height };
}
