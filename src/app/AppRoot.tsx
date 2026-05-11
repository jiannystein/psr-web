import { useEffect, useMemo, useRef, useState } from "react";

import { createCaptureController } from "@features/recording/captureController";
import { RecordingToolbar } from "@features/recording/RecordingToolbar";
import { StepList } from "@features/review/StepList";
import { saveBlob } from "@features/export/saveFile";
import { formatByteSize, formatResolutionLabel, qualityPresetDescription, type ExportQualityPreset } from "@utils/presentation";

const controller = createCaptureController();

const GITHUB_URL = "https://github.com/jiannystein/psr-web";

declare const __BUILD_TIME__: string;

const LOGO_URL = new URL("../assets/psr-logo-mark.svg", import.meta.url).href;

function LogoMark(): JSX.Element {
  return (
    <img src={LOGO_URL} alt="" aria-hidden="true" className="h-7 w-7" />
  );
}

export function AppRoot(): JSX.Element {
  const [state, setState] = useState(controller.getState());
  const [exportQuality, setExportQuality] = useState<ExportQualityPreset>("medium");
  const [estimatedExportSizeBytes, setEstimatedExportSizeBytes] = useState<number | null>(null);
  const [isEstimatingExportSize, setIsEstimatingExportSize] = useState(false);
  // Accumulates composite (annotated) data URLs per step — updated by StepList, used by both export buttons
  const compositeUrlMapRef = useRef<Record<string, string>>({});

  // Auto-select capture resolution based on physical screen size on first load
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const physLong = Math.max(window.screen.width, window.screen.height) * dpr;
    if (physLong >= 3840) {
      controller.setCaptureLongEdge(3840);
    } else {
      controller.setCaptureLongEdge(1920);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => controller.subscribe(setState), []);

  // Derive review mode: stopped with at least one step
  const isReviewMode = state.context.state === "stopped" && state.steps.length > 0;

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

    async function estimate(): Promise<void> {
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

  const onExport = async (compositeUrlMap: Record<string, string>): Promise<void> => {
    const blob = await controller.exportHtml(
      {
        format: "html",
        includeMetadata: true,
        includeTimestamps: true,
        inlineImages: true,
        printOptimized: true,
        qualityPreset: exportQuality
      },
      compositeUrlMap
    );
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
    if (typeof window === "undefined") return 2160;
    return window.innerHeight + (window.outerHeight - window.innerHeight) * 2;
  }, []);

  const availableResolutions = useMemo(() => {
    const all = [
      { value: "native", label: "Native stream resolution" },
      { value: "3840", label: "4K max" },
      { value: "2560", label: "1440p max" },
      { value: "1920", label: "1080p max" }
    ];

    if (screenHeight <= 1080) {
      return all.filter((r) => r.value !== "3840" && r.value !== "2560");
    }
    if (screenHeight <= 1440) {
      return all.filter((r) => r.value !== "3840");
    }
    return all;
  }, [screenHeight]);

  return (
    <main className="min-h-screen bg-[linear-gradient(#f8fbff,#f8fbff)] text-slate-900 dark:bg-[linear-gradient(#131923,#131923)] dark:text-slate-100">
      <div className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-slate-300/70 bg-white/80 px-4 backdrop-blur md:px-8 dark:border-slate-700/80 dark:bg-[#171d29]/80">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          <LogoMark />
          <span>PSRWeb</span>
        </div>
        <div className="flex-1" />
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          GitHub
        </a>
        <span className="rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-600 dark:border-slate-600 dark:text-slate-300">
          {topbarStatusLabel}
        </span>
      </div>

      <section className={`mx-auto grid w-full gap-5 px-4 py-7 md:px-8 lg:items-start ${isReviewMode ? "max-w-4xl" : "max-w-6xl lg:grid-cols-[minmax(0,1fr)_270px]"}`}>
        <div className="space-y-6">
          {!isReviewMode && (
          <header className="rounded-xl border border-slate-300/70 bg-white p-6 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[oklch(58%_0.18_255)]">Local-only · no data leaves your browser</p>
            <div className="mt-2 flex items-center gap-3">
              <LogoMark />
              <h1 className="text-2xl font-semibold tracking-tight">Problem Step Recorder</h1>
            </div>
            <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Capture screen steps while troubleshooting, annotate each step, and export a self-contained HTML report for IT teams.
            </p>
          </header>
          )}

          {!isReviewMode && (
          <article className="rounded-xl border border-slate-300/70 bg-white p-6 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Session</h2>
              <span className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">{sessionStatusLabel}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Periodic interval</p>
                <p className="mt-1 text-lg font-medium">{state.periodicIntervalSec}s</p>
              </div>
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Capture quality</p>
                <p className="mt-1 text-lg font-medium">{captureResolutionLabel}</p>
                {state.sourceResolution && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Source: {formatResolutionLabel(state.sourceResolution.width, state.sourceResolution.height)}</p>
                )}
              </div>
            </div>

            {state.context.lastError && (
              <p className="mt-4 rounded-lg border border-red-400/50 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">{state.context.lastError}</p>
            )}
            {state.lastInfo && (
                <p className="mt-3 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">{state.lastInfo}</p>
            )}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Stop sharing will stop recording as well.</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label htmlFor="periodicInterval" className="text-sm text-slate-700 dark:text-slate-300">Periodic capture (seconds)</label>
              <input
                id="periodicInterval"
                type="number"
                min={0}
                max={300}
                value={state.periodicIntervalSec}
                onChange={(event) => controller.setPeriodicIntervalSec(Number(event.target.value))}
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">0 disables</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[220px,1fr] md:items-start">
              <label htmlFor="captureResolution" className="pt-2 text-sm text-slate-700 dark:text-slate-300">Capture resolution</label>
              <div>
                <select
                  id="captureResolution"
                  value={state.captureLongEdge === null ? "native" : String(state.captureLongEdge)}
                  onChange={(event) => {
                    const value = event.target.value;
                    controller.setCaptureLongEdge(value === "native" ? null : Number(value));
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900"
                >
                  {availableResolutions.map((res) => (
                    <option key={res.value} value={res.value}>
                      {res.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
                  Capture resolution controls source detail. Export quality controls final file encoding.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[220px,1fr] md:items-start">
              <label htmlFor="exportQuality" className="pt-2 text-sm text-slate-700 dark:text-slate-300">HTML export quality</label>
              <div>
                <select
                  id="exportQuality"
                  value={exportQuality}
                  onChange={(event) => setExportQuality(event.target.value as ExportQualityPreset)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900"
                >
                  <option value="lossless">Lossless</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{qualityPresetDescription(exportQuality)}</p>
                <p className="mt-3 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                  Estimated HTML size: {isEstimatingExportSize ? "Calculating..." : estimatedExportSizeBytes !== null ? formatByteSize(estimatedExportSizeBytes) : "-"}
                </p>
              </div>
            </div>
          </article>
          )}

          <StepList
            steps={state.steps}
            sessionState={state.context.state}
            getPreviewUrl={controller.getPreviewUrl}
            canDelete={state.context.state === "stopped"}
            onDescriptionChange={(stepId: string, description: string) => void controller.setDescription(stepId, description)}
            onDeleteStep={(stepId: string) => void controller.deleteStep(stepId)}
            onCompositeChange={(stepId, compositeUrl) => {
              compositeUrlMapRef.current = { ...compositeUrlMapRef.current, [stepId]: compositeUrl };
            }}
            onExport={(compositeUrlMap) => {
              compositeUrlMapRef.current = compositeUrlMap;
              void onExport(compositeUrlMap);
            }}
            onNewRecording={() => { window.open(window.location.href, "_blank"); }}
          />
        </div>

        {!isReviewMode && (
        <aside className="sticky top-16 hidden space-y-4 lg:block">
          <div className="rounded-xl border border-slate-300/70 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]">
            <h3 className="text-sm font-semibold">Workflow</h3>
            <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>1. Start recording from the toolbar.</li>
              <li>2. Perform your steps on the shared source.</li>
              <li>3. Stop recording and review captured steps.</li>
              <li>4. Delete unwanted steps and add descriptions.</li>
              <li>5. Export a self-contained HTML report.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-slate-300/70 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]">
            <h3 className="text-sm font-semibold">Tips</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>Use <strong className="font-medium text-slate-900 dark:text-slate-100">Window capture</strong> to avoid screenshotting the toolbar.</p>
              <p>Stopping screen share automatically ends the recording session.</p>
              <p>Periodic capture helps preserve context during long-running actions.</p>
            </div>
          </div>
        </aside>
        )}
      </section>

      <RecordingToolbar
        context={state.context}
        stepCount={state.context.stepCount}
        quotaWarning={state.quotaWarning}
        toolbarVisibleWarning={state.sourceType === "screen"}
        onStart={() => void controller.start()}
        onStop={() => void controller.stop()}
        onExport={() => void onExport(compositeUrlMapRef.current)}
      />

      <footer className="border-t border-slate-300/70 bg-white/50 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-700/80 dark:bg-[#0a0f17]/50 dark:text-slate-400">
        <div className="mx-auto max-w-6xl space-y-1">
          <div>
            PSRWeb v2.1 ·{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              github.com/jiannystein/psr-web
            </a>
          </div>
          <div className="font-mono text-[10px] opacity-60">
            Built{" "}
            {new Date(__BUILD_TIME__).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>
      </footer>
    </main>
  );
}
