import { useEffect, useMemo, useRef, useState } from "react";

import type { CaptureStep } from "@models/models";
import { formatByteSize, formatTimestampInfo, formatTriggerLabel } from "@utils/presentation";
import { Button } from "@components/Button";
import { AnnotationCanvas } from "./AnnotationCanvas";

interface StepListProps {
  steps: CaptureStep[];
  sessionState: "idle" | "requesting" | "recording" | "paused" | "stopped";
  getPreviewUrl: (blobKey: string) => Promise<string | null>;
  canDelete: boolean;
  onDescriptionChange: (stepId: string, description: string) => void;
  onDeleteStep: (stepId: string) => void;
  onExport?: (compositeUrlMap: Record<string, string>) => void;
  onCompositeChange?: (stepId: string, compositeUrl: string) => void;
  onNewRecording?: () => void;
}

export function StepList(props: StepListProps): JSX.Element {
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  // Stores composite (annotated) data URLs for each step — used by export
  const compositeUrlMapRef = useRef<Record<string, string>>({});

  // Reset selection mode when state changes away from stopped
  useEffect(() => {
    if (props.sessionState !== "stopped") {
      setSelectionMode(false);
      setSelectedSteps(new Set());
    }
  }, [props.sessionState]);

  const toggleSelectionMode = (): void => {
    setSelectionMode(!selectionMode);
    setSelectedSteps(new Set());
  };

  const cancelSelectionMode = (): void => {
    setSelectionMode(false);
    setSelectedSteps(new Set());
  };

  const toggleStepSelection = (stepId: string): void => {
    const newSelected = new Set(selectedSteps);
    if (newSelected.has(stepId)) {
      newSelected.delete(stepId);
    } else {
      newSelected.add(stepId);
    }
    setSelectedSteps(newSelected);
  };

  const selectAll = (): void => {
    setSelectedSteps(new Set(props.steps.map((s) => s.id)));
  };

  const selectNone = (): void => {
    setSelectedSteps(new Set());
  };

  const deleteSelected = (): void => {
    selectedSteps.forEach((stepId) => props.onDeleteStep(stepId));
    setSelectedSteps(new Set());
    cancelSelectionMode();
  };

  const keepSelected = (): void => {
    props.steps
      .filter((s) => !selectedSteps.has(s.id))
      .forEach((s) => props.onDeleteStep(s.id));
    setSelectedSteps(new Set());
    cancelSelectionMode();
  };

  // Only load preview URLs once session is stopped (hide screenshots during recording)
  useEffect(() => {
    if (props.sessionState !== "stopped") {
      setPreviewMap({});
      return;
    }

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
  }, [props.steps, props.getPreviewUrl, props.sessionState]);

  // Session stats calculations
  const sessionStats = useMemo(() => {
    if (props.steps.length === 0) {
      return { startTime: "-", duration: "-", stepCount: 0, totalSize: 0 };
    }

    const firstStep = props.steps[0];
    const lastStep = props.steps[props.steps.length - 1];
    const startTime = formatTimestampInfo(firstStep.capturedAt).localTime;

    const startMs = new Date(firstStep.capturedAt).getTime();
    const endMs = new Date(lastStep.capturedAt).getTime();
    const durationMs = endMs - startMs;
    const durationSec = Math.round(durationMs / 1000);
    const durationMin = Math.floor(durationSec / 60);
    const durationSecRem = durationSec % 60;
    const duration = `${durationMin}:${durationSecRem.toString().padStart(2, "0")}`;

    const totalSize = props.steps.reduce((acc, step) => acc + step.image.byteSize, 0);

    return {
      startTime,
      duration,
      stepCount: props.steps.length,
      totalSize,
    };
  }, [props.steps]);

  // ── Idle / Requesting: no steps yet ──
  if (props.steps.length === 0 && (props.sessionState === "idle" || props.sessionState === "requesting")) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm" style={{ borderRadius: "var(--r)" }}>
        <p className="font-semibold text-[var(--fg)]" style={{ fontSize: "14px", letterSpacing: "-0.01em" }}>
          Approve screen sharing to start recording.
        </p>
        <p className="mt-2 text-[var(--muted)]" style={{ fontSize: "12px", lineHeight: "1.6" }}>
          Steps will appear here after you stop the recording.
        </p>
      </div>
    );
  }

  // ── Recording / Paused: hide all screenshots, show live counter ──
  if (props.sessionState === "recording" || props.sessionState === "paused") {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden" style={{ borderRadius: "var(--r)" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[oklch(55%_0.2_22)]" />
          <span className="text-sm font-semibold text-[var(--fg)]">
            {props.sessionState === "recording" ? "Recording in progress" : "Recording paused"}
          </span>
          <span className="ml-auto font-mono text-xs text-[var(--muted)]">{props.steps.length} step{props.steps.length !== 1 ? "s" : ""} captured</span>
        </div>
        <div className="px-5 py-6 text-center text-[var(--muted)]" style={{ fontSize: "12px", lineHeight: "1.7" }}>
          Screenshots are hidden during capture to avoid spoiling the recording.
          <br />
          They will appear here after you stop.
        </div>
        {props.steps.length > 0 && (
          <div className="px-5 pb-5 flex flex-col gap-2">
            {props.steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span
                  className="px-2 py-0.5 rounded text-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_8%,transparent)] border border-[color-mix(in_oklch,var(--accent)_22%,transparent)]"
                  style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
                >
                  Step {step.stepNumber}
                </span>
                <span className="text-[var(--muted)]" style={{ fontSize: "10px" }}>
                  {formatTriggerLabel(step.triggerType)}
                </span>
                <span className="ml-auto text-[var(--muted)]" style={{ fontSize: "10px" }}>
                  {formatTimestampInfo(step.capturedAt).localTime}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Stopped with 0 steps ──
  if (props.steps.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm" style={{ borderRadius: "var(--r)" }}>
        <p className="font-semibold text-[var(--fg)]" style={{ fontSize: "14px", letterSpacing: "-0.01em" }}>
          No steps captured
        </p>
        <p className="mt-2 text-[var(--muted)]" style={{ fontSize: "12px", lineHeight: "1.6" }}>
          Start a new recording to capture steps.
        </p>
        {props.onNewRecording && (
          <button
            type="button"
            onClick={props.onNewRecording}
            className="mt-4 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--fg)] hover:bg-[var(--bg)] transition-colors"
          >
            New Recording
          </button>
        )}
      </div>
    );
  }

  // ── Stopped with steps: full review screen ──
  return (
    <>
      {/* Session banner */}
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm"
        style={{ borderRadius: "var(--r)" }}
      >
        {/* Banner header: stats + actions */}
        <div className="border-b border-[var(--border)] px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Stats */}
          <div className="flex items-stretch gap-0 flex-wrap">
            {[
              { label: "Started", value: sessionStats.startTime },
              { label: "Duration", value: sessionStats.duration },
              { label: "Steps", value: String(sessionStats.stepCount) },
              { label: "Size", value: formatByteSize(sessionStats.totalSize) },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col justify-center py-1 ${i > 0 ? "pl-5 ml-5 border-l border-[var(--border)]" : ""}`}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <p className="text-[var(--muted)] mb-0.5" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {stat.label}
                </p>
                <p className="font-semibold text-[var(--fg)]" style={{ fontSize: "15px", letterSpacing: "-0.03em", lineHeight: "1" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {props.onNewRecording && (
              <Button variant="secondary" size="md" onClick={props.onNewRecording}>
                New Recording
              </Button>
            )}
            {props.onExport && (
              <Button variant="primary" size="md" onClick={() => props.onExport!(compositeUrlMapRef.current)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 3v8M5 8l3 3 3-3" /><path d="M3 13h10" />
                </svg>
                Export HTML
              </Button>
            )}
          </div>
        </div>

        {/* Steps sub-header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)]">
          <span className="font-semibold text-[var(--fg)]" style={{ fontSize: "13px", letterSpacing: "-0.01em" }}>
            Captured steps
          </span>
          <span className="text-[var(--muted)]" style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
            {props.steps.length} total
          </span>
          <div className="flex-1" />
          {!selectionMode && props.canDelete && (
            <Button variant="secondary" size="sm" onClick={toggleSelectionMode}>
              Select steps
            </Button>
          )}
          {selectionMode && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={selectAll}>All</Button>
              <Button variant="secondary" size="sm" onClick={selectNone}>None</Button>
            </div>
          )}
        </div>

        {/* Step cards */}
        <div className="flex flex-col gap-4 p-5">
          {props.steps.map((step) => (
            <article
              key={step.id}
              className={[
                "rounded-lg border overflow-hidden transition-all",
                selectionMode ? "cursor-pointer" : "",
                selectedSteps.has(step.id)
                  ? "border-[var(--accent)] shadow-[0_0_0_2px_color-mix(in_oklch,var(--accent)_16%,transparent)]"
                  : "border-[var(--border)]",
                "bg-[var(--surface)]",
              ].join(" ")}
              style={{ borderRadius: "var(--r)" }}
              onClick={() => { if (selectionMode) toggleStepSelection(step.id); }}
            >
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]" style={{ fontFamily: "var(--font-mono)" }}>
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedSteps.has(step.id)}
                    onChange={(e) => { e.stopPropagation(); toggleStepSelection(step.id); }}
                    className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                  />
                )}
                <span
                  className="px-2 py-1 rounded text-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_8%,transparent)] border border-[color-mix(in_oklch,var(--accent)_22%,transparent)]"
                  style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
                >
                  Step {step.stepNumber}
                </span>
                <div className="flex gap-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[var(--muted)] bg-[var(--bg)] border border-[var(--border)]" style={{ fontSize: "10px" }}>
                    {formatTriggerLabel(step.triggerType)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[var(--muted)] bg-[var(--bg)] border border-[var(--border)]" style={{ fontSize: "10px" }}>
                    {step.image.width}×{step.image.height}
                  </span>
                </div>
                <div className="flex-1" />
                <span className="text-[var(--muted)]" style={{ fontSize: "10px" }}>
                  {formatTimestampInfo(step.capturedAt).localTime}
                </span>
                {!selectionMode && props.canDelete && (
                  <button
                    type="button"
                    title="Delete step"
                    onClick={(e) => { e.stopPropagation(); props.onDeleteStep(step.id); }}
                    className="text-[var(--danger)] opacity-60 hover:opacity-100 transition-opacity text-[10px] underline underline-offset-2 ml-2"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Screenshot with annotation canvas */}
              {previewMap[step.id] ? (
                <AnnotationCanvas
                  imgUrl={previewMap[step.id]}
                  onShapesChange={(_, compositeUrl) => {
                    compositeUrlMapRef.current = {
                      ...compositeUrlMapRef.current,
                      [step.id]: compositeUrl,
                    };
                    props.onCompositeChange?.(step.id, compositeUrl);
                  }}
                />
              ) : (
                <div
                  className="w-full border-b border-[var(--border)] flex items-center justify-center text-[var(--muted)]"
                  style={{ aspectRatio: "16/9", background: "var(--bg)", fontSize: "12px" }}
                >
                  Loading…
                </div>
              )}

              {/* Description */}
              <div className="p-4">
                <label
                  className="block font-medium text-[var(--muted)] mb-2"
                  htmlFor={`desc-${step.id}`}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em" }}
                >
                  Description
                </label>
                <textarea
                  id={`desc-${step.id}`}
                  className="w-full rounded p-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklch,var(--accent)_10%,transparent)] resize-none"
                  rows={3}
                  style={{ fontSize: "13px", lineHeight: "1.55" }}
                  defaultValue={step.annotation.description}
                  onBlur={(event) => props.onDescriptionChange(step.id, event.target.value)}
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Bulk selection bar */}
      {selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[oklch(18%_0.012_250)] text-white px-5 py-3 border-t border-[oklch(25%_0.01_250)] flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[oklch(70%_0.008_250)]" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              {selectedSteps.size} step{selectedSteps.size !== 1 ? "s" : ""} selected
            </p>
            <p className="text-[oklch(50%_0.008_250)]" style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>
              Selected steps will be permanently removed from this session.
            </p>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={cancelSelectionMode}
            className="h-8 px-4 rounded text-sm font-medium bg-[oklch(26%_0.012_250)] text-[oklch(72%_0.008_250)] border-none cursor-pointer hover:bg-[oklch(30%_0.012_250)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedSteps.size === 0}
            onClick={keepSelected}
            className="h-8 px-4 rounded text-sm font-medium bg-[oklch(48%_0.15_255)] text-white border-none cursor-pointer hover:bg-[oklch(43%_0.15_255)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Keep selected, delete rest
          </button>
          <button
            type="button"
            disabled={selectedSteps.size === 0}
            onClick={deleteSelected}
            className="h-8 px-4 rounded text-sm font-medium bg-[oklch(55%_0.2_22)] text-white border-none cursor-pointer hover:bg-[oklch(48%_0.2_22)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete selected
          </button>
        </div>
      )}

      {/* Spacing for fixed selection bar */}
      {selectionMode && <div style={{ height: "72px" }} />}
    </>
  );
}
