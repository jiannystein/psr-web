export function transitionRecordingContext(context, event) {
    switch (context.state) {
        case "idle":
            if (event.type === "START_REQUESTED") {
                return { ...context, state: "requesting" };
            }
            break;
        case "requesting":
            if (event.type === "START_GRANTED") {
                return { ...context, state: "recording" };
            }
            if (event.type === "START_DENIED") {
                return { ...context, state: "idle", lastError: event.error };
            }
            break;
        case "recording":
            if (event.type === "PAUSE") {
                return { ...context, state: "paused" };
            }
            if (event.type === "STOP") {
                return { ...context, state: "stopped" };
            }
            if (event.type === "STREAM_ENDED") {
                return { ...context, state: "stopped" };
            }
            break;
        case "paused":
            if (event.type === "RESUME") {
                return { ...context, state: "recording" };
            }
            if (event.type === "STOP") {
                return { ...context, state: "stopped" };
            }
            break;
        case "stopped":
            if (event.type === "START_REQUESTED") {
                return { ...context, state: "requesting", elapsedMs: 0, stepCount: 0 };
            }
            break;
    }
    return context;
}
