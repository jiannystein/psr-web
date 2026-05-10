import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToolbarContent } from "./ToolbarContent";
const STORAGE_KEY = "psr-toolbar-y";
function clampTop(value) {
    return Math.max(72, Math.min(window.innerHeight - 120, value));
}
export function RecordingToolbar(props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [topPx, setTopPx] = useState(() => clampTop(Math.round(window.innerHeight / 2)));
    const dragOffsetRef = useRef(null);
    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            setTopPx(clampTop(Math.round(window.innerHeight / 2)));
            return;
        }
        const next = Number(stored);
        if (!Number.isNaN(next)) {
            setTopPx(clampTop(next));
        }
    }, []);
    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, String(topPx));
    }, [topPx]);
    useEffect(() => {
        const onMouseMove = (event) => {
            if (dragOffsetRef.current === null) {
                return;
            }
            const nextTop = clampTop(event.clientY - dragOffsetRef.current);
            setTopPx(nextTop);
        };
        const onMouseUp = () => {
            dragOffsetRef.current = null;
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        const onResize = () => {
            setTopPx((current) => clampTop(current));
        };
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("resize", onResize);
        };
    }, []);
    useEffect(() => {
        if (props.context.state === "paused" || props.context.state === "stopped") {
            setIsExpanded(true);
        }
    }, [props.context.state]);
    const collapsed = props.context.state === "recording" && !isExpanded;
    const shellClass = useMemo(() => {
        if (collapsed) {
            return "h-32 w-12";
        }
        return "min-h-[136px] w-[248px] md:w-[268px]";
    }, [collapsed]);
    return (_jsxs("aside", { className: `fixed right-4 z-50 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-300/80 bg-white/95 shadow-[0_10px_32px_-10px_rgba(15,23,42,0.28)] backdrop-blur transition-[width,height] duration-200 ease-out dark:border-slate-700/90 dark:bg-[#1a2130]/95 dark:shadow-[0_10px_32px_-10px_rgba(2,6,23,0.7)] max-md:right-3 ${shellClass}`, style: { top: `${topPx}px` }, onMouseEnter: () => setIsExpanded(true), onMouseLeave: () => {
            if (props.context.state === "recording") {
                setIsExpanded(false);
            }
        }, children: [_jsxs("div", { className: "flex cursor-grab items-center gap-2 border-b border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700/80 dark:text-slate-400", onMouseDown: (event) => {
                    const currentTop = topPx;
                    dragOffsetRef.current = event.clientY - currentTop;
                }, children: [_jsx("span", { "aria-hidden": "true", children: "\u283F" }), !collapsed && _jsx("span", { children: "Toolbar" })] }), collapsed ? (_jsx("div", { className: "flex h-[88px] items-center justify-center px-2", children: _jsxs("div", { className: "flex rotate-90 items-center gap-2 whitespace-nowrap text-xs text-slate-700 dark:text-slate-200", children: [_jsx("span", { className: "inline-flex h-3 w-3 animate-pulse rounded-full bg-[oklch(55%_0.2_22)]" }), _jsxs("span", { children: [props.stepCount, " steps"] })] }) })) : (_jsx("div", { className: "p-3", children: _jsx(ToolbarContent, { state: props.context.state, elapsedMs: props.context.elapsedMs, stepCount: props.stepCount, quotaWarning: props.quotaWarning, toolbarVisibleWarning: props.toolbarVisibleWarning, onStart: props.onStart, onStop: props.onStop, onExport: props.onExport }) }))] }));
}
