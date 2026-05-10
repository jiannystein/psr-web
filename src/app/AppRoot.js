import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createCaptureController } from "@features/recording/captureController";
import { RecordingToolbar } from "@features/recording/RecordingToolbar";
import { StepList } from "@features/review/StepList";
import { saveBlob } from "@features/export/saveFile";
import { formatByteSize, formatResolutionLabel, qualityPresetDescription } from "@utils/presentation";
const controller = createCaptureController();
const THEME_KEY = "psrweb-theme";
function resolveInitialTheme() {
    if (typeof window === "undefined") {
        return "light";
    }
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
        return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function LogoMark() {
    return (_jsx("img", { src: "/psr-logo-mark.svg", alt: "", "aria-hidden": "true", className: "h-7 w-7" }));
}
export function AppRoot() {
    const [state, setState] = useState(controller.getState());
    const [exportQuality, setExportQuality] = useState("720p");
    const [estimatedExportSizeBytes, setEstimatedExportSizeBytes] = useState(null);
    const [isEstimatingExportSize, setIsEstimatingExportSize] = useState(false);
    const [theme, setTheme] = useState(() => resolveInitialTheme());
    useEffect(() => controller.subscribe(setState), []);
    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.setAttribute("data-theme", theme);
        window.localStorage.setItem(THEME_KEY, theme);
    }, [theme]);
    const topbarStatusLabel = useMemo(() => {
        if (state.context.state === "recording") {
            return "Recording";
        }
        if (state.context.state === "paused") {
            return "Paused";
        }
        if (state.context.state === "stopped") {
            return `${state.context.stepCount} steps`;
        }
        if (state.context.state === "requesting") {
            return "Requesting";
        }
        return "Ready";
    }, [state.context.state, state.context.stepCount]);
    const sessionStatusLabel = useMemo(() => {
        if (state.context.state === "recording") {
            return "Recording";
        }
        if (state.context.state === "paused") {
            return "Paused";
        }
        if (state.context.state === "stopped") {
            return "Stopped";
        }
        if (state.context.state === "requesting") {
            return "Requesting";
        }
        return "Idle";
    }, [state.context.state]);
    useEffect(() => {
        let cancelled = false;
        async function estimate() {
            setIsEstimatingExportSize(true);
            const size = await controller.estimateHtmlExportSize({
                format: "html",
                includeMetadata: true,
                includeTimestamps: true,
                inlineImages: true,
                printOptimized: true,
                qualityPreset: exportQuality
            });
            if (!cancelled) {
                setEstimatedExportSizeBytes(size);
                setIsEstimatingExportSize(false);
            }
        }
        void estimate();
        return () => {
            cancelled = true;
        };
    }, [exportQuality, state.steps, state.captureLongEdge]);
    const onExport = async () => {
        const blob = await controller.exportHtml({
            format: "html",
            includeMetadata: true,
            includeTimestamps: true,
            inlineImages: true,
            printOptimized: true,
            qualityPreset: exportQuality
        });
        const timestamp = new Date().toISOString().replaceAll(":", "-");
        await saveBlob(blob, `psrweb-${exportQuality}-${timestamp}.html`);
    };
    const captureResolutionLabel = useMemo(() => {
        if (state.captureLongEdge === null) {
            return "Native";
        }
        return `${state.captureLongEdge}p max long edge`;
    }, [state.captureLongEdge]);
    const screenHeight = useMemo(() => {
        if (typeof window === "undefined")
            return 2160;
        return window.innerHeight + (window.outerHeight - window.innerHeight) * 2;
    }, []);
    const availableResolutions = useMemo(() => {
        const all = [
            { value: "native", label: "Native stream resolution" },
            { value: "3840", label: "4K max" },
            { value: "2560", label: "1440p max" },
            { value: "1920", label: "1080p max" },
            { value: "1280", label: "720p max" }
        ];
        if (screenHeight <= 1080) {
            return all.filter((r) => r.value !== "3840" && r.value !== "2560");
        }
        if (screenHeight <= 1440) {
            return all.filter((r) => r.value !== "3840");
        }
        return all;
    }, [screenHeight]);
    return (_jsxs("main", { className: "min-h-screen bg-[linear-gradient(#f8fbff,#f8fbff)] text-slate-900 dark:bg-[linear-gradient(#131923,#131923)] dark:text-slate-100", children: [_jsxs("div", { className: "sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-slate-300/70 bg-white/80 px-4 backdrop-blur md:px-8 dark:border-slate-700/80 dark:bg-[#171d29]/80", children: [_jsxs("div", { className: "flex items-center gap-3 text-sm font-semibold tracking-tight text-slate-900 dark:text-white", children: [_jsx(LogoMark, {}), _jsx("span", { children: "PSRWeb" })] }), _jsx("div", { className: "flex-1" }), _jsx("button", { type: "button", onClick: () => setTheme((current) => (current === "dark" ? "light" : "dark")), className: "rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700", "aria-label": theme === "dark" ? "Switch to light theme" : "Switch to dark theme", children: theme === "dark" ? "Light" : "Dark" }), _jsx("span", { className: "rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-600 dark:border-slate-600 dark:text-slate-300", children: topbarStatusLabel })] }), _jsxs("section", { className: "mx-auto grid w-full max-w-6xl gap-5 px-4 py-7 md:px-8 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "rounded-xl border border-slate-300/70 bg-white p-6 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]", children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.12em] text-[oklch(58%_0.18_255)]", children: "Local-only \u00B7 no data leaves your browser" }), _jsxs("div", { className: "mt-2 flex items-center gap-3", children: [_jsx(LogoMark, {}), _jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Problem Step Recorder" })] }), _jsx("p", { className: "mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300", children: "Capture screen steps while troubleshooting, annotate each step, and export a self-contained HTML report for IT teams." })] }), _jsxs("article", { className: "rounded-xl border border-slate-300/70 bg-white p-6 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Session" }), _jsx("span", { className: "rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300", children: sessionStatusLabel })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70", children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400", children: "Periodic interval" }), _jsxs("p", { className: "mt-1 text-lg font-medium", children: [state.periodicIntervalSec, "s"] })] }), _jsxs("div", { className: "rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70", children: [_jsx("p", { className: "text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400", children: "Capture quality" }), _jsx("p", { className: "mt-1 text-lg font-medium", children: captureResolutionLabel }), state.sourceResolution && (_jsxs("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: ["Source: ", formatResolutionLabel(state.sourceResolution.width, state.sourceResolution.height)] }))] })] }), state.context.lastError && (_jsx("p", { className: "mt-4 rounded-lg border border-red-400/50 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200", children: state.context.lastError })), state.lastInfo && (_jsx("p", { className: "mt-3 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200", children: state.lastInfo })), _jsx("p", { className: "mt-4 text-xs text-slate-500 dark:text-slate-400", children: "Stop sharing will stop recording as well." }), _jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-3", children: [_jsx("label", { htmlFor: "periodicInterval", className: "text-sm text-slate-700 dark:text-slate-300", children: "Periodic capture (seconds)" }), _jsx("input", { id: "periodicInterval", type: "number", min: 0, max: 300, value: state.periodicIntervalSec, onChange: (event) => controller.setPeriodicIntervalSec(Number(event.target.value)), className: "w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900" }), _jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: "0 disables" })] }), _jsxs("div", { className: "mt-5 grid gap-3 md:grid-cols-[220px,1fr] md:items-start", children: [_jsx("label", { htmlFor: "captureResolution", className: "pt-2 text-sm text-slate-700 dark:text-slate-300", children: "Capture resolution" }), _jsxs("div", { children: [_jsx("select", { id: "captureResolution", value: state.captureLongEdge === null ? "native" : String(state.captureLongEdge), onChange: (event) => {
                                                            const value = event.target.value;
                                                            controller.setCaptureLongEdge(value === "native" ? null : Number(value));
                                                        }, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900", children: availableResolutions.map((res) => (_jsx("option", { value: res.value, children: res.label }, res.value))) }), _jsx("p", { className: "mt-2 text-xs italic text-slate-500 dark:text-slate-400", children: "Capture resolution controls source detail. Export quality controls final file encoding." })] })] }), _jsxs("div", { className: "mt-5 grid gap-3 md:grid-cols-[220px,1fr] md:items-start", children: [_jsx("label", { htmlFor: "exportQuality", className: "pt-2 text-sm text-slate-700 dark:text-slate-300", children: "HTML export quality" }), _jsxs("div", { children: [_jsxs("select", { id: "exportQuality", value: exportQuality, onChange: (event) => setExportQuality(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900", children: [_jsx("option", { value: "lossless", children: "Lossless" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "low", children: "Low" })] }), _jsx("p", { className: "mt-2 text-xs italic text-slate-600 dark:text-slate-300", children: qualityPresetDescription(exportQuality) }), _jsxs("p", { className: "mt-3 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200", children: ["Estimated HTML size: ", isEstimatingExportSize ? "Calculating..." : estimatedExportSizeBytes !== null ? formatByteSize(estimatedExportSizeBytes) : "-"] })] })] })] }), _jsx(StepList, { steps: state.steps, sessionState: state.context.state, getPreviewUrl: controller.getPreviewUrl, canDelete: state.context.state === "stopped", onDescriptionChange: (stepId, description) => void controller.setDescription(stepId, description), onDeleteStep: (stepId) => void controller.deleteStep(stepId) })] }), _jsxs("aside", { className: "sticky top-16 hidden space-y-4 lg:block", children: [_jsxs("div", { className: "rounded-xl border border-slate-300/70 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Workflow" }), _jsxs("ol", { className: "mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300", children: [_jsx("li", { children: "1. Start recording from the toolbar." }), _jsx("li", { children: "2. Perform your steps on the shared source." }), _jsx("li", { children: "3. Stop recording and review captured steps." }), _jsx("li", { children: "4. Delete unwanted steps and add descriptions." }), _jsx("li", { children: "5. Export a self-contained HTML report." })] })] }), _jsxs("div", { className: "rounded-xl border border-slate-300/70 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Tips" }), _jsxs("div", { className: "mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300", children: [_jsxs("p", { children: ["Use ", _jsx("strong", { className: "font-medium text-slate-900 dark:text-slate-100", children: "Window capture" }), " to avoid screenshotting the toolbar."] }), _jsx("p", { children: "Stopping screen share automatically ends the recording session." }), _jsx("p", { children: "Periodic capture helps preserve context during long-running actions." })] })] })] })] }), _jsx(RecordingToolbar, { context: state.context, stepCount: state.context.stepCount, quotaWarning: state.quotaWarning, toolbarVisibleWarning: state.sourceType === "screen", onStart: () => void controller.start(), onStop: () => void controller.stop(), onExport: () => void onExport() }), _jsx("footer", { className: "border-t border-slate-300/70 bg-white/50 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-700/80 dark:bg-[#0a0f17]/50 dark:text-slate-400", children: _jsxs("div", { className: "mx-auto max-w-6xl space-y-1", children: [_jsx("div", { children: "PSRWeb v2.0.0 \u2022 Theme Toggle & UI Redesign" }), _jsxs("div", { children: ["Build: May 10, 2026 \u2022 ", new Date().toLocaleTimeString()] })] }) })] }));
}
