/**
 * CaptureController - Main orchestrator for screen recording
 * Manages recording state, step capture, and export
 */
import { requestDisplayStream, stopDisplayStream } from "@core/capture/streamManager";
export function createCaptureController() {
    let context = {
        state: "idle",
        elapsedMs: 0,
        stepCount: 0
    };
    let stream = null;
    const listeners = new Set();
    let tickTimerId = null;
    function notify() {
        listeners.forEach((l) => l(getState()));
    }
    function getState() {
        return {
            context,
            steps: [],
            quotaWarning: false,
            periodicIntervalSec: 5,
            captureLongEdge: 1920,
            lastInfo: context.lastError
        };
    }
    const start = async () => {
        context = { ...context, state: "requesting" };
        notify();
        try {
            const granted = await requestDisplayStream();
            stream = granted.stream;
            context = { ...context, state: "recording", stepCount: 0 };
            // Start timer
            tickTimerId = window.setInterval(() => {
                context = { ...context, elapsedMs: context.elapsedMs + 1000 };
                notify();
            }, 1000);
            // Listen for stream end
            stream.getVideoTracks()[0]?.addEventListener("ended", () => {
                context = { ...context, state: "stopped" };
                if (tickTimerId !== null) {
                    window.clearInterval(tickTimerId);
                }
                notify();
            });
            notify();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Display permission denied or screen capture not supported.";
            context = { ...context, state: "idle", lastError: message };
            notify();
        }
    };
    const pause = () => {
        if (context.state === "recording") {
            context = { ...context, state: "paused" };
            if (tickTimerId !== null) {
                window.clearInterval(tickTimerId);
            }
            notify();
        }
    };
    const resume = () => {
        if (context.state === "paused") {
            context = { ...context, state: "recording" };
            tickTimerId = window.setInterval(() => {
                context = { ...context, elapsedMs: context.elapsedMs + 1000 };
                notify();
            }, 1000);
            notify();
        }
    };
    const stop = async () => {
        if (tickTimerId !== null) {
            window.clearInterval(tickTimerId);
            tickTimerId = null;
        }
        stopDisplayStream(stream);
        stream = null;
        context = { ...context, state: "stopped" };
        notify();
    };
    const setDescription = async (_stepId, _description) => {
        // Placeholder
    };
    const deleteStep = async (_stepId) => {
        // Placeholder
    };
    const setPeriodicIntervalSec = (_seconds) => {
        // Placeholder
    };
    const setCaptureLongEdge = (_value) => {
        // Placeholder
    };
    const getPreviewUrl = async (_blobKey) => {
        return null;
    };
    const exportHtml = async (_options) => {
        const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>PSRWeb Export</title></head>
<body><h1>PSRWeb Recording</h1><p>No steps captured.</p></body>
</html>`;
        return new Blob([html], { type: "text/html" });
    };
    const estimateHtmlExportSize = async (_options) => {
        return 10000;
    };
    return {
        getState,
        start,
        pause,
        resume,
        stop,
        setDescription,
        deleteStep,
        setPeriodicIntervalSec,
        setCaptureLongEdge,
        getPreviewUrl,
        exportHtml,
        estimateHtmlExportSize,
        subscribe: (listener) => {
            listeners.add(listener);
            listener(getState());
            return () => listeners.delete(listener);
        }
    };
}
