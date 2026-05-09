import { useEffect, useState, type WheelEvent } from "react";

import type { CaptureStep } from "@models/models";
import { formatResolutionLabel, formatTimestampInfo, formatTriggerLabel } from "@utils/presentation";

interface StepListProps {
  steps: CaptureStep[];
  getPreviewUrl: (blobKey: string) => Promise<string | null>;
  canDelete: boolean;
  onDescriptionChange: (stepId: string, description: string) => void;
  onDeleteStep: (stepId: string) => void;
}

export function StepList(props: StepListProps): JSX.Element {
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
  const [zoomedStepId, setZoomedStepId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const closeZoom = (): void => {
    setZoomedStepId(null);
    setZoomScale(1);
  };

  const openZoom = (stepId: string): void => {
    setZoomedStepId(stepId);
    setZoomScale(1);
  };

  const onZoomWheel = (event: WheelEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const sensitivity = 0.0015;
    const nextScale = zoomScale + (-event.deltaY * sensitivity);
    setZoomScale(Math.max(1, Math.min(6, Number(nextScale.toFixed(2)))));
  };

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadPreviews(): Promise<void> {
      const next: Record<string, string> = {};
      for (const step of props.steps) {
        const url = await props.getPreviewUrl(step.image.blobKey);
        if (url) {
          next[step.id] = url;
          objectUrls.push(url);
        }
      }

      if (!cancelled) {
        setPreviewMap(next);
      }
    }

    void loadPreviews();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [props.steps, props.getPreviewUrl]);

  if (props.steps.length === 0) {
    return (
      <article className="rounded-xl border border-slate-300/70 bg-white p-5 text-slate-600 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130] dark:text-slate-300">
        No steps captured yet.
      </article>
    );
  }

  return (
    <section className="space-y-5">
      {props.steps.map((step) => (
        <article key={step.id} className="step-card rounded-xl border border-slate-300/70 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-[#1a2130]">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-lg font-semibold">Step {step.stepNumber}</h3>
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <div>{formatTimestampInfo(step.capturedAt).isoUtc}</div>
              <div>{formatTimestampInfo(step.capturedAt).localTime}</div>
            </div>
          </div>

          <div className="mb-3 grid gap-2 text-sm md:grid-cols-3">
            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Action</div>
              <div>{formatTriggerLabel(step.triggerType)}</div>
            </div>
            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Resolution</div>
              <div>{formatResolutionLabel(step.image.width, step.image.height)}</div>
            </div>
            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Cursor</div>
              <div>{step.cursor.xPx}, {step.cursor.yPx}</div>
            </div>
          </div>

          {previewMap[step.id] && (
            <img
              src={previewMap[step.id]}
              alt={`Capture step ${step.stepNumber}`}
              className="mb-3 w-full cursor-zoom-in rounded-md border border-slate-300 dark:border-slate-600"
              onClick={() => openZoom(step.id)}
            />
          )}

          <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300" htmlFor={`desc-${step.id}`}>
            Description
          </label>
          <textarea
            id={`desc-${step.id}`}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900"
            rows={3}
            defaultValue={step.annotation.description}
            onBlur={(event) => props.onDescriptionChange(step.id, event.target.value)}
          />

          {props.canDelete && (
            <div className="mt-4">
              <button
                className="w-full rounded-lg border border-red-400/50 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                onClick={() => props.onDeleteStep(step.id)}
              >
                Delete This Step
              </button>
            </div>
          )}
        </article>
      ))}

      {zoomedStepId && previewMap[zoomedStepId] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3"
          onClick={closeZoom}
          onWheel={onZoomWheel}
        >
          <img
            src={previewMap[zoomedStepId]}
            alt="Zoomed step screenshot"
            className="max-h-[92vh] max-w-[92vw] cursor-zoom-out select-none rounded border border-slate-500 shadow-2xl"
            style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center" }}
          />
        </div>
      )}
    </section>
  );
}
