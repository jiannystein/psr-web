/**
 * CaptureController - Main orchestrator for screen recording
 * Manages recording state, step capture, and export
 */
export class CaptureController {
    constructor() {
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "listeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "timerInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "getPreviewUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (_stepId) => {
                // This would typically create a blob URL for the step image
                // For now, return a placeholder
                return "#";
            }
        });
        this.state = {
            steps: [],
            context: {
                state: "idle",
                elapsedMs: 0,
                stepCount: 0,
                lastError: null,
                captureResolution: null,
            },
            captureLongEdge: null,
            periodicIntervalSec: 5,
            sourceResolution: null,
            lastInfo: null,
            quotaWarning: false,
            sourceType: "screen",
        };
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        this.listeners.forEach((listener) => listener(this.state));
    }
    getState() {
        return this.state;
    }
    async startRecording() {
        // Emit START_REQUESTED event
        this.dispatchEvent({ type: "START_REQUESTED" });
        // Simulate permission granting
        this.state.context.state = "recording";
        this.dispatchEvent({ type: "START_GRANTED" });
        // Start timer
        this.startTimer();
        this.notify();
    }
    pauseRecording() {
        if (this.state.context.state === "recording") {
            this.state.context.state = "paused";
            this.stopTimer();
            this.dispatchEvent({ type: "PAUSE" });
            this.notify();
        }
    }
    resumeRecording() {
        if (this.state.context.state === "paused") {
            this.state.context.state = "recording";
            this.startTimer();
            this.dispatchEvent({ type: "RESUME" });
            this.notify();
        }
    }
    stopRecording() {
        if (this.state.context.state !== "stopped") {
            this.stopTimer();
            this.state.context.state = "stopped";
            this.dispatchEvent({ type: "STOP" });
            this.notify();
        }
    }
    startTimer() {
        this.timerInterval = window.setInterval(() => {
            this.state.context.elapsedMs += 100;
            this.dispatchEvent({
                type: "TICK",
                elapsedMs: this.state.context.elapsedMs,
            });
            this.notify();
        }, 100);
    }
    stopTimer() {
        if (this.timerInterval !== null) {
            window.clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    dispatchEvent(_event) {
        // Event dispatch logic - can be extended later
    }
    addStep(step) {
        this.state.steps.push(step);
        this.state.context.stepCount = this.state.steps.length;
        this.dispatchEvent({ type: "STEP_CAPTURED", stepId: step.id });
        this.notify();
    }
    setDescription(stepId, description) {
        const step = this.state.steps.find((s) => s.id === stepId);
        if (step) {
            step.description = description;
            this.notify();
        }
    }
    deleteStep(_stepId) {
        this.state.steps = this.state.steps.filter((s) => s.id !== _stepId);
        this.state.context.stepCount = this.state.steps.length;
        this.notify();
    }
    setCaptureLongEdge(edge) {
        this.state.captureLongEdge = edge;
        this.notify();
    }
    setPeriodicIntervalSec(sec) {
        this.state.periodicIntervalSec = sec;
        this.notify();
    }
    estimateHtmlExportSize(_options) {
        // Rough estimate: base HTML + steps * avg step size
        const avgStepSize = 500000; // ~500KB per step (image + metadata)
        return 10000 + this.state.steps.length * avgStepSize;
    }
    start() {
        this.startRecording();
    }
    stop() {
        this.stopRecording();
    }
    async exportHtml(_options) {
        // Generate HTML export
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PSRWeb Export</title>
</head>
<body>
  <h1>PSRWeb Recording</h1>
  <p>Steps: ${this.state.steps.length}</p>
  <p>Duration: ${Math.floor(this.state.context.elapsedMs / 1000)}s</p>
</body>
</html>`;
        return new Blob([html], { type: "text/html" });
    }
}
export function createCaptureController() {
    return new CaptureController();
}
