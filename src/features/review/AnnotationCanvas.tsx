import { useCallback, useEffect, useRef, useState } from "react";

type DrawTool = "rect" | "ellipse" | "arrow" | "censor";

interface Shape {
  type: DrawTool;
  /** Normalized [0,1] coordinates */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness: number;
}

const COLORS = ["#4B8BF5", "#EF4444", "#F59E0B", "#10B981", "#ffffff"];
const THICKNESSES = [1, 2, 4];

interface AnnotationCanvasProps {
  imgUrl: string;
}

function drawShapeOnCtx(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  shape: Shape,
  imgEl: HTMLImageElement | null
): void {
  const x1 = shape.x1 * cw;
  const y1 = shape.y1 * ch;
  const x2 = shape.x2 * cw;
  const y2 = shape.y2 * ch;

  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.thickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (shape.type === "rect") {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (shape.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      Math.abs(x2 - x1) / 2,
      Math.abs(y2 - y1) / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  } else if (shape.type === "arrow") {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const hLen = Math.min(22, Math.max(10, Math.hypot(dx, dy) * 0.28)) + shape.thickness;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hLen * Math.cos(angle - 0.45), y2 - hLen * Math.sin(angle - 0.45));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hLen * Math.cos(angle + 0.45), y2 - hLen * Math.sin(angle + 0.45));
    ctx.stroke();
  } else if (shape.type === "censor") {
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);
    if (rw > 4 && rh > 4) {
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        const PIXEL = 10;
        const pw = Math.max(1, Math.round(rw / PIXEL));
        const ph = Math.max(1, Math.round(rh / PIXEL));
        const tmp = document.createElement("canvas");
        tmp.width = pw;
        tmp.height = ph;
        const tctx = tmp.getContext("2d");
        if (tctx) {
          const sx = imgEl.naturalWidth / cw;
          const sy = imgEl.naturalHeight / ch;
          tctx.drawImage(imgEl, rx * sx, ry * sy, rw * sx, rh * sy, 0, 0, pw, ph);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tmp, 0, 0, pw, ph, rx, ry, rw, rh);
          ctx.imageSmoothingEnabled = true;
        }
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(rx, ry, rw, rh);
      }
    }
  }
  ctx.restore();
}

export function AnnotationCanvas({ imgUrl }: AnnotationCanvasProps): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [activeTool, setActiveTool] = useState<DrawTool | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [thickness, setThickness] = useState(2);
  const [shapeCount, setShapeCount] = useState(0);
  const [historyLen, setHistoryLen] = useState(0);

  const shapesRef = useRef<Shape[]>([]);
  const historyRef = useRef<Shape[][]>([]);
  const isDown = useRef(false);
  const startNorm = useRef({ x: 0, y: 0 });
  const endNorm = useRef({ x: 0, y: 0 });

  const activeToolRef = useRef<DrawTool | null>(null);
  const colorRef = useRef(color);
  const thicknessRef = useRef(thickness);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);

  const redraw = useCallback((): void => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const shape of shapesRef.current) {
      drawShapeOnCtx(ctx, canvas.width, canvas.height, shape, imgRef.current);
    }
    if (isDown.current && activeToolRef.current) {
      drawShapeOnCtx(ctx, canvas.width, canvas.height, {
        type: activeToolRef.current,
        x1: startNorm.current.x,
        y1: startNorm.current.y,
        x2: endNorm.current.x,
        y2: endNorm.current.y,
        color: colorRef.current,
        thickness: thicknessRef.current,
      }, imgRef.current);
    }
  }, []);

  useEffect((): (() => void) => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return () => undefined;
    const sync = (): void => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      redraw();
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  const normPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent): void => {
    if (!activeToolRef.current) return;
    e.preventDefault();
    const pos = normPos(e);
    isDown.current = true;
    startNorm.current = pos;
    endNorm.current = pos;
  }, [normPos]);

  const onMouseMove = useCallback((e: React.MouseEvent): void => {
    if (!isDown.current) return;
    endNorm.current = normPos(e);
    redraw();
  }, [normPos, redraw]);

  const onMouseUp = useCallback((e: React.MouseEvent): void => {
    if (!isDown.current || !activeToolRef.current) return;
    isDown.current = false;
    const end = normPos(e);
    const dx = end.x - startNorm.current.x;
    const dy = end.y - startNorm.current.y;
    if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) {
      historyRef.current.push([...shapesRef.current]);
      shapesRef.current = [
        ...shapesRef.current,
        {
          type: activeToolRef.current,
          x1: startNorm.current.x,
          y1: startNorm.current.y,
          x2: end.x,
          y2: end.y,
          color: colorRef.current,
          thickness: thicknessRef.current,
        },
      ];
      setShapeCount(shapesRef.current.length);
      setHistoryLen(historyRef.current.length);
    }
    redraw();
  }, [normPos, redraw]);

  const undo = useCallback((): void => {
    const prev = historyRef.current.pop();
    if (prev !== undefined) {
      shapesRef.current = prev;
      setShapeCount(shapesRef.current.length);
      setHistoryLen(historyRef.current.length);
      redraw();
    }
  }, [redraw]);

  const clearAll = useCallback((): void => {
    if (shapesRef.current.length === 0) return;
    historyRef.current.push([...shapesRef.current]);
    shapesRef.current = [];
    setShapeCount(0);
    setHistoryLen(historyRef.current.length);
    redraw();
  }, [redraw]);

  const toggleTool = (tool: DrawTool): void => {
    setActiveTool((prev) => (prev === tool ? null : tool));
  };

  const showColorThick =
    activeTool === "rect" || activeTool === "ellipse" || activeTool === "arrow";

  return (
    <div
      ref={wrapRef}
      className="relative w-full border-b border-[var(--border)] group/anno"
      style={{ aspectRatio: "16/9", background: "var(--bg)", overflow: "hidden" }}
    >
      <img
        ref={imgRef}
        src={imgUrl}
        alt="Screenshot"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: activeTool ? "crosshair" : "default" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={(): void => {
          if (isDown.current) { isDown.current = false; redraw(); }
        }}
      />

      {/* Annotation toolbar — appears on hover or when a tool is active */}
      <div
        className={[
          "absolute top-2.5 left-1/2 -translate-x-1/2 z-20",
          "flex items-center gap-px px-1.5 py-1 rounded-lg border border-[var(--border)]",
          "backdrop-blur-xl transition-opacity duration-150 select-none",
          activeTool !== null
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 group-hover/anno:opacity-100 pointer-events-none group-hover/anno:pointer-events-auto",
        ].join(" ")}
        style={{ background: "color-mix(in oklch, var(--surface) 92%, transparent)", whiteSpace: "nowrap" }}
      >
        {(["rect", "ellipse", "arrow", "censor"] as DrawTool[]).map((tool) => (
          <button
            key={tool}
            type="button"
            title={{ rect: "Rectangle", ellipse: "Ellipse", arrow: "Arrow", censor: "Censor / Pixelate" }[tool]}
            onClick={() => toggleTool(tool)}
            className={[
              "flex items-center justify-center w-7 h-7 rounded border-none transition-colors duration-100 cursor-pointer",
              activeTool === tool
                ? "bg-[color-mix(in_oklch,var(--accent)_12%,transparent)] text-[var(--accent)]"
                : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]",
            ].join(" ")}
          >
            {tool === "rect" && <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3.5" width="12" height="9" rx="1" /></svg>}
            {tool === "ellipse" && <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="8" rx="6" ry="4.5" /></svg>}
            {tool === "arrow" && <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8h10" /><path d="M10 5l3 3-3 3" /></svg>}
            {tool === "censor" && <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="8" rx="1" fill="currentColor" opacity=".2" /><path d="M2 4h12M2 7h12M2 10h12M5 4v8M8 4v8M11 4v8" stroke="currentColor" strokeWidth="1" /></svg>}
          </button>
        ))}

        {showColorThick && (
          <>
            <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: "var(--border)" }} />
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setColor(c)}
                className="w-3.5 h-3.5 rounded-full border-0 cursor-pointer transition-transform hover:scale-125 mx-0.5 flex-shrink-0"
                style={{
                  background: c,
                  outline: color === c ? "2px solid var(--fg)" : "2px solid transparent",
                  outlineOffset: "1.5px",
                  boxShadow: c === "#ffffff" ? "inset 0 0 0 1px #ccc" : undefined,
                }}
              />
            ))}
            <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: "var(--border)" }} />
            {THICKNESSES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThickness(t)}
                className={[
                  "flex items-center justify-center w-6 h-6 rounded border cursor-pointer transition-all duration-100 text-[10px] font-mono",
                  thickness === t
                    ? "border-[color-mix(in_oklch,var(--accent)_50%,transparent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-transparent text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </>
        )}

        <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: "var(--border)" }} />

        <button
          type="button"
          title="Undo"
          disabled={historyLen === 0}
          onClick={undo}
          className="flex items-center justify-center w-7 h-7 rounded border-none bg-transparent text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4.5 6H10a3 3 0 010 6H7" /><path d="M4.5 6L2 3.5M4.5 6L2 8.5" />
          </svg>
        </button>

        <button
          type="button"
          title="Clear all annotations"
          disabled={shapeCount === 0}
          onClick={clearAll}
          className="flex items-center justify-center w-7 h-7 rounded border-none bg-transparent text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[oklch(52%_0.18_22)] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2.5 4.5h11" /><rect x="4.5" y="4.5" width="7" height="9" rx="1" /><path d="M6.5 4.5V3h3v1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
