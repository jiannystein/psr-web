import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * GuardModal - New Recording confirmation dialog
 */
import { Button } from "@components/Button";
export function GuardModal({ stepCount, onExportAndRecord, onDiscardAndRecord, onCancel, isOpen }) {
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-lg max-w-md w-full mx-4", children: [_jsxs("div", { className: "p-6 border-b border-[var(--border)]", children: [_jsx("h2", { className: "text-lg font-semibold text-[var(--fg)]", children: "Start New Recording?" }), _jsxs("p", { className: "text-sm text-[var(--muted)] mt-2", children: ["You have ", stepCount, " ", stepCount === 1 ? "step" : "steps", " in the current session."] })] }), _jsxs("div", { className: "p-6 space-y-3", children: [_jsx(Button, { variant: "primary", onClick: onExportAndRecord, className: "w-full", children: "Export & Record" }), _jsx(Button, { variant: "secondary", onClick: onDiscardAndRecord, className: "w-full", children: "Discard & Record" }), _jsx(Button, { variant: "secondary", onClick: onCancel, className: "w-full", children: "Cancel" })] }), _jsx("div", { className: "px-6 py-4 bg-[var(--bg)] border-t border-[var(--border)] text-xs text-[var(--muted)]", children: _jsxs("p", { children: [_jsx("strong", { children: "Tip:" }), " Export saves your current steps with any annotations. You can download the HTML report and start a fresh recording."] }) })] }) }));
}
