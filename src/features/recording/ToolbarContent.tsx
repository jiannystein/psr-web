import { formatElapsed } from "@utils/time";

interface ToolbarContentProps {
  state: "idle" | "requesting" | "recording" | "paused" | "stopped";
  elapsedMs: number;
  stepCount: number;
  quotaWarning: boolean;
  toolbarVisibleWarning: boolean;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
  compact?: boolean;
}

export function ToolbarContent(props: ToolbarContentProps): JSX.Element {
  const isRecording = props.state === "recording";
  const isStopped = props.state === "stopped";
  const canStart = props.state === "idle" || isStopped;

  return (
    <div className={props.compact ? "flex h-full flex-col justify-between" : "flex h-full flex-col gap-3"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-3 w-3 rounded-full ${isRecording ? "animate-pulse bg-[oklch(55%_0.2_22)]" : "bg-slate-400 dark:bg-slate-500"}`} />
          <div>
            <p className="text-xs text-slate-700 dark:text-slate-300">Everything stays on your device</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{props.stepCount} steps captured</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatElapsed(props.elapsedMs)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <button className="rounded border border-transparent bg-[oklch(58%_0.18_255)] px-3 py-1.5 text-white transition hover:brightness-95 disabled:opacity-50" disabled={!canStart} onClick={props.onStart}>Start</button>
        <button className="rounded border border-slate-300 bg-slate-100 px-3 py-1.5 text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600" disabled={props.state === "idle" || isStopped} onClick={props.onStop}>Stop</button>
        <button className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" disabled={!isStopped} onClick={props.onExport}>Export</button>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">Stop sharing will stop recording as well.</p>

      {props.toolbarVisibleWarning && (
        <p className="rounded border border-amber-400/50 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Toolbar visible in screenshots - consider switching to Window capture.
        </p>
      )}

      {props.quotaWarning && (
        <p className="rounded border border-amber-400/50 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Storage usage is high.
        </p>
      )}
    </div>
  );
}
