import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AnnotationToolbar - Tool selection and actions
 */
import { Button } from "@components/Button";
import { DEFAULT_COLORS, DEFAULT_THICKNESS_OPTIONS } from "@models/annotations";
export function AnnotationToolbar({ activeTool, onToolChange, onUndo, onClear, toolColor, onColorChange, toolThickness, onThicknessChange, arrowType, onArrowTypeChange, }) {
    return (_jsxs("div", { className: "absolute top-3 right-3 flex flex-col gap-2 bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg z-40", children: [_jsxs("div", { className: "flex gap-1 border-b pb-2", children: [_jsx(ToolButton, { icon: "\u2B1C", title: "Rectangle", active: activeTool === "rect", onClick: () => onToolChange("rect") }), _jsx(ToolButton, { icon: "\u2B55", title: "Ellipse", active: activeTool === "ellipse", onClick: () => onToolChange("ellipse") }), _jsx(ToolButton, { icon: "\u2192", title: "Arrow", active: activeTool === "arrow", onClick: () => onToolChange("arrow") }), _jsx(ToolButton, { icon: "\uD83D\uDD32", title: "Censor", active: activeTool === "censor", onClick: () => onToolChange("censor") }), _jsx(ToolButton, { icon: "\u2713", title: "Select", active: activeTool === "select", onClick: () => onToolChange("select") })] }), _jsx("div", { className: "flex gap-2", children: DEFAULT_COLORS.map((color) => (_jsx("button", { className: `w-6 h-6 rounded border-2 transition-all ${toolColor === color ? "border-black scale-110" : "border-transparent"}`, style: { backgroundColor: color }, title: `Color ${color}`, onClick: () => onColorChange(color) }, color))) }), _jsx("div", { className: "flex gap-2 border-t pt-2", children: DEFAULT_THICKNESS_OPTIONS.map((thickness) => (_jsxs("button", { className: `px-2 py-1 rounded text-xs font-mono ${toolThickness === thickness
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg)] border border-[var(--border)]"}`, onClick: () => onThicknessChange(thickness), children: [thickness, "px"] }, thickness))) }), activeTool === "arrow" && (_jsx("div", { className: "flex gap-2 border-t pt-2", children: ["start", "end", "both"].map((type) => (_jsx("button", { className: `px-2 py-1 rounded text-xs ${arrowType === type
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg)] border border-[var(--border)]"}`, onClick: () => onArrowTypeChange(type), children: type }, type))) })), _jsxs("div", { className: "flex gap-2 border-t pt-2", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: onUndo, className: "flex-1", children: "Undo" }), _jsx(Button, { variant: "danger", size: "sm", onClick: onClear, className: "flex-1", children: "Clear" })] })] }));
}
function ToolButton({ icon, title, active, onClick, }) {
    return (_jsx("button", { className: `w-8 h-8 rounded flex items-center justify-center transition-all text-lg ${active
            ? "bg-[var(--accent)] text-white shadow-md"
            : "bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--muted)]"}`, title: title, onClick: onClick, children: icon }));
}
