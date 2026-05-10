/**
 * AnnotationToolbar - Tool selection and actions
 */

import { Button } from "@components/Button";
import { DEFAULT_COLORS, DEFAULT_THICKNESS_OPTIONS } from "@models/annotations";

interface AnnotationToolbarProps {
  activeTool: "rect" | "ellipse" | "arrow" | "censor" | "select";
  onToolChange: (tool: "rect" | "ellipse" | "arrow" | "censor" | "select") => void;
  onUndo: () => void;
  onClear: () => void;
  toolColor: string;
  onColorChange: (color: string) => void;
  toolThickness: number;
  onThicknessChange: (thickness: number) => void;
  arrowType: "start" | "end" | "both";
  onArrowTypeChange: (type: "start" | "end" | "both") => void;
}

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onClear,
  toolColor,
  onColorChange,
  toolThickness,
  onThicknessChange,
  arrowType,
  onArrowTypeChange,
}: AnnotationToolbarProps) {
  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2 bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg z-40">
      {/* Tool buttons */}
      <div className="flex gap-1 border-b pb-2">
        <ToolButton
          icon="⬜"
          title="Rectangle"
          active={activeTool === "rect"}
          onClick={() => onToolChange("rect")}
        />
        <ToolButton
          icon="⭕"
          title="Ellipse"
          active={activeTool === "ellipse"}
          onClick={() => onToolChange("ellipse")}
        />
        <ToolButton
          icon="→"
          title="Arrow"
          active={activeTool === "arrow"}
          onClick={() => onToolChange("arrow")}
        />
        <ToolButton
          icon="🔲"
          title="Censor"
          active={activeTool === "censor"}
          onClick={() => onToolChange("censor")}
        />
        <ToolButton
          icon="✓"
          title="Select"
          active={activeTool === "select"}
          onClick={() => onToolChange("select")}
        />
      </div>

      {/* Colors */}
      <div className="flex gap-2">
        {DEFAULT_COLORS.map((color) => (
          <button
            key={color}
            className={`w-6 h-6 rounded border-2 transition-all ${
              toolColor === color ? "border-black scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: color }}
            title={`Color ${color}`}
            onClick={() => onColorChange(color)}
          />
        ))}
      </div>

      {/* Thickness */}
      <div className="flex gap-2 border-t pt-2">
        {DEFAULT_THICKNESS_OPTIONS.map((thickness) => (
          <button
            key={thickness}
            className={`px-2 py-1 rounded text-xs font-mono ${
              toolThickness === thickness
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg)] border border-[var(--border)]"
            }`}
            onClick={() => onThicknessChange(thickness)}
          >
            {thickness}px
          </button>
        ))}
      </div>

      {/* Arrow type (shown when arrow tool active) */}
      {activeTool === "arrow" && (
        <div className="flex gap-2 border-t pt-2">
          {(["start", "end", "both"] as const).map((type) => (
            <button
              key={type}
              className={`px-2 py-1 rounded text-xs ${
                arrowType === type
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg)] border border-[var(--border)]"
              }`}
              onClick={() => onArrowTypeChange(type)}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t pt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onUndo}
          className="flex-1"
        >
          Undo
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onClear}
          className="flex-1"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  title,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-8 h-8 rounded flex items-center justify-center transition-all text-lg ${
        active
          ? "bg-[var(--accent)] text-white shadow-md"
          : "bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--muted)]"
      }`}
      title={title}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
