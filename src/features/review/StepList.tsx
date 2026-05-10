import { useEffect, useMemo, useState, type WheelEvent } from "react";

import type { CaptureStep } from "@models/models";
import { formatByteSize, formatResolutionLabel, formatTimestampInfo, formatTriggerLabel } from "@utils/presentation";
import { Button, IconButton } from "@components/Button";

interface StepListProps {
  steps: CaptureStep[];
  sessionState: "idle" | "requesting" | "recording" | "paused" | "stopped";
  getPreviewUrl: (blobKey: string) => Promise<string | null>;
  canDelete: boolean;
  onDescriptionChange: (stepId: string, description: string) => void;
  onDeleteStep: (stepId: string) => void;
}

export function StepList(props: StepListProps): JSX.Element {
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
  const [zoomedStepId, setZoomedStepId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());

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

  const badgeLabel = useMemo(() => {
    if (props.sessionState === "recording") {
      return "Recording";
    }
    if (props.sessionState === "paused") {
      return "Paused";
    }
    if (props.sessionState === "stopped") {
      return `Session ended · ${sessionStats.duration}`;
    }
    return "Ready";
  }, [props.sessionState, sessionStats.duration]);

  if (props.steps.length === 0) {
    if (props.sessionState === "idle" || props.sessionState === "requesting") {
      return (
        <div
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm"
          style={{
            borderRadius: "var(--r)",
          }}
        >
          <p
            className="font-semibold text-[var(--fg)]"
            style={{
              fontSize: "14px",
              letterSpacing: "-0.01em",
            }}
          >
            Approve screen sharing to start recording.
          </p>
          <p
            className="mt-2 text-[var(--muted)]"
            style={{
              fontSize: "12px",
              lineHeight: "1.6",
            }}
          >
            Steps will appear here once you start capturing.
          </p>
        </div>
      );
    }

    if (props.sessionState === "recording" || props.sessionState === "paused") {
      return (
        <div
          className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm"
          style={{
            borderRadius: "var(--r)",
          }}
        >
          <p
            className="font-semibold text-[var(--fg)]"
            style={{
              fontSize: "14px",
              letterSpacing: "-0.01em",
            }}
          >
            Recording in progress
          </p>
          <p
            className="mt-2 text-[var(--muted)]"
            style={{
              fontSize: "12px",
              lineHeight: "1.6",
            }}
          >
            Steps will appear here once you stop recording.
          </p>
        </div>
      );
    }

    return (
      <div
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm"
        style={{
          borderRadius: "var(--r)",
        }}
      >
        <p
          className="font-semibold text-[var(--fg)]"
          style={{
            fontSize: "14px",
            letterSpacing: "-0.01em",
          }}
        >
          All steps removed
        </p>
        <p
          className="mt-2 text-[var(--muted)]"
          style={{
            fontSize: "12px",
            lineHeight: "1.6",
          }}
        >
          Start a new recording to capture more steps.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Topbar */}
      <div
        className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--surface)_88%,transparent)] backdrop-blur-sm px-5"
        style={{
          fontFamily: "var(--font-display)",
        }}
      >
        <div className="flex items-center gap-2 font-semibold text-[var(--fg)]" style={{ fontSize: "14px", letterSpacing: "-0.025em" }}>
          <span>PSRWeb</span>
        </div>
        <div className="flex-1" />
        <div
          className="flex items-center gap-2 border border-[var(--border)] rounded-full px-3 py-1 text-[var(--muted)]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: props.sessionState === "stopped" ? "oklch(70% 0.008 250)" : "oklch(55% 0.2 22)",
            }}
          />
          {badgeLabel}
        </div>
      </div>

      {/* Banner */}
      {props.sessionState === "stopped" && (
        <div
          className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4"
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "24px",
          }}
        >
          <div
            className="flex flex-col justify-center pr-6 border-r border-[var(--border)]"
            style={{
              fontFamily: "var(--font-mono)",
            }}
          >
            <p
              className="text-[var(--muted)] mb-0.5"
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Started
            </p>
            <p
              className="font-semibold text-[var(--fg)]"
              style={{
                fontSize: "16px",
                letterSpacing: "-0.03em",
                lineHeight: "1",
              }}
            >
              {sessionStats.startTime}
            </p>
          </div>
          <div
            className="flex flex-col justify-center pr-6 border-r border-[var(--border)]"
            style={{
              fontFamily: "var(--font-mono)",
            }}
          >
            <p
              className="text-[var(--muted)] mb-0.5"
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Duration
            </p>
            <p
              className="font-semibold text-[var(--fg)]"
              style={{
                fontSize: "16px",
                letterSpacing: "-0.03em",
                lineHeight: "1",
              }}
            >
              {sessionStats.duration}
            </p>
          </div>
          <div
            className="flex flex-col justify-center pr-6 border-r border-[var(--border)]"
            style={{
              fontFamily: "var(--font-mono)",
            }}
          >
            <p
              className="text-[var(--muted)] mb-0.5"
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Steps
            </p>
            <p
              className="font-semibold text-[var(--fg)]"
              style={{
                fontSize: "16px",
                letterSpacing: "-0.03em",
                lineHeight: "1",
              }}
            >
              {sessionStats.stepCount}
            </p>
          </div>
          <div style={{ fontFamily: "var(--font-mono)" }}>
            <p
              className="text-[var(--muted)] mb-0.5"
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Total Size
            </p>
            <p
              className="font-semibold text-[var(--fg)]"
              style={{
                fontSize: "16px",
                letterSpacing: "-0.03em",
                lineHeight: "1",
              }}
            >
              {formatByteSize(sessionStats.totalSize)}
            </p>
          </div>
        </div>
      )}

      {/* Steps Header */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)]"
        style={{
          fontFamily: "var(--font-display)",
        }}
      >
        <p
          className="font-semibold text-[var(--fg)]"
          style={{
            fontSize: "13px",
            letterSpacing: "-0.01em",
          }}
        >
          Captured steps
        </p>
        <p
          className="text-[var(--muted)]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
          }}
        >
          {props.steps.length} total
        </p>
        <div className="flex-1" />
        {!selectionMode && props.canDelete && (
          <Button variant="secondary" size="sm" onClick={toggleSelectionMode}>
            Select steps
          </Button>
        )}
        {selectionMode && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={selectAll}>
              All
            </Button>
            <Button variant="secondary" size="sm" onClick={selectNone}>
              None
            </Button>
          </div>
        )}
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-3 p-5">
        {props.steps.map((step) => (
          <article
            key={step.id}
            className={`rounded-lg border overflow-hidden transition-all cursor-pointer ${
              selectedSteps.has(step.id)
                ? "border-[var(--accent)] shadow-[0_0_0_2px_color-mix(in_oklch,var(--accent)_16%,transparent)]"
                : "border-[var(--border)]"
            } bg-[var(--surface)]`}
            style={{
              borderRadius: "var(--r)",
            }}
            onClick={() => {
              if (selectionMode) {
                toggleStepSelection(step.id);
              }
            }}
          >
            {/* Card Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]"
              style={{
                fontFamily: "var(--font-mono)",
              }}
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedSteps.has(step.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleStepSelection(step.id);
                  }}
                  className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
              )}
              <span
                className="px-2 py-1 rounded text-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_8%,transparent)] border border-[color-mix(in_oklch,var(--accent)_22%,transparent)]"
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Step {step.stepNumber}
              </span>
              <div className="flex gap-1 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded text-[var(--muted)] bg-[var(--bg)] border border-[var(--border)]"
                  style={{
                    fontSize: "10px",
                  }}
                >
                  {formatTriggerLabel(step.triggerType)}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[var(--muted)] bg-[var(--bg)] border border-[var(--border)]"
                  style={{
                    fontSize: "10px",
                  }}
                >
                  {formatResolutionLabel(step.image.width, step.image.height)}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[var(--muted)] bg-[var(--bg)] border border-[var(--border)]"
                  style={{
                    fontSize: "10px",
                  }}
                >
                  {step.cursor.xPx}, {step.cursor.yPx}
                </span>
              </div>
              <div className="flex-1" />
              <div
                className="text-right"
                style={{
                  fontSize: "10px",
                  lineHeight: "1.7",
                }}
              >
                <div className="text-[var(--muted)]">{formatTimestampInfo(step.capturedAt).isoUtc}</div>
                <div className="text-[var(--muted)]">{formatTimestampInfo(step.capturedAt).localTime}</div>
              </div>
              {!selectionMode && props.canDelete && (
                <IconButton
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2.5 4.5h11M4.5 4.5V3h7v1.5M5 7v5M8 7v5M11 7v5" strokeLinecap="round" />
                    </svg>
                  }
                  label="Delete step"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    props.onDeleteStep(step.id);
                  }}
                  className="!text-[var(--danger)] hover:!bg-[oklch(98%_0.015_22)]"
                />
              )}
            </div>

            {/* Screenshot */}
            {previewMap[step.id] && (
              <img
                src={previewMap[step.id]}
                alt={`Capture step ${step.stepNumber}`}
                className="w-full cursor-zoom-in border-b border-[var(--border)]"
                style={{
                  aspectRatio: "16 / 9",
                  objectFit: "cover",
                }}
                onClick={() => openZoom(step.id)}
              />
            )}

            {/* Card Footer */}
            <div className="p-4">
              <label
                className="block font-medium text-[var(--muted)] mb-2"
                htmlFor={`desc-${step.id}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Description
              </label>
              <textarea
                id={`desc-${step.id}`}
                className="w-full rounded p-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklch,var(--accent)_10%,transparent)] resize-none"
                rows={3}
                style={{
                  fontSize: "13px",
                  lineHeight: "1.55",
                }}
                defaultValue={step.annotation.description}
                onBlur={(event) => props.onDescriptionChange(step.id, event.target.value)}
              />
            </div>
          </article>
        ))}
      </div>

      {/* Bulk Selection Bar */}
      {selectionMode && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-[oklch(18%_0.012_250)] text-white px-5 py-3 border-t border-[oklch(25%_0.01_250)] flex items-center gap-3 z-50"
          style={{
            fontFamily: "var(--font-mono)",
          }}
        >
          <div className="flex flex-col gap-0.5">
            <p
              className="text-[var(--muted)] font-variant-numeric: tabular-nums"
              style={{
                fontSize: "12px",
              }}
            >
              {selectedSteps.size} step{selectedSteps.size !== 1 ? "s" : ""} selected
            </p>
            <p
              className="text-[oklch(50%_0.008_250)]"
              style={{
                fontSize: "10px",
              }}
            >
              Selected steps will be permanently removed from this session.
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="secondary" size="md" onClick={cancelSelectionMode}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            disabled={selectedSteps.size === 0}
            onClick={deleteSelected}
          >
            Delete selected
          </Button>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomedStepId && previewMap[zoomedStepId] && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 cursor-zoom-out"
          onClick={closeZoom}
          onWheel={onZoomWheel}
        >
          <img
            src={previewMap[zoomedStepId]}
            alt="Zoomed step screenshot"
            className="max-h-[92vh] max-w-[92vw] select-none rounded shadow-2xl border border-[var(--border)]"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: "center center",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Spacing for fixed bar */}
      {selectionMode && <div style={{ height: "80px" }} />}
    </>
  );
}
