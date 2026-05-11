import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type DrawTool = "pointer" | "rect" | "ellipse" | "arrow" | "censor" | "text";
type HandleId = "TL" | "TC" | "TR" | "ML" | "MR" | "BL" | "BC" | "BR" | "MOVE";

export interface Shape {
  id: string;
  type: "rect" | "ellipse" | "arrow" | "censor" | "text";
  /** Normalized [0,1] coordinates */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness: number;
  censorStrength: number;
  /** Arrow endpoint style (only used when type === "arrow") */
  arrowStyle?: "line-arrow" | "arrow-arrow" | "line-line" | "arrow-line";
  /** Text content (only used when type === "text") */
  text?: string;
  /** Font size in px at 1080p reference height (only used when type === "text") */
  fontSize?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const COLORS = ["#4B8BF5", "#EF4444", "#F59E0B", "#10B981", "#ffffff"];
const HANDLE_R = 6; // hit-test radius in canvas px
const DEFAULT_FONT_SIZE = 24; // px at 1080p reference height

const HANDLE_CURSORS: Record<HandleId, string> = {
  TL: "nwse-resize", TC: "ns-resize", TR: "nesw-resize",
  ML: "ew-resize",   MR: "ew-resize",
  BL: "nesw-resize", BC: "ns-resize", BR: "nwse-resize",
  MOVE: "move",
};

interface AnnotationCanvasProps {
  imgUrl: string;
  /** Pre-populated shapes (persisted from previous opens) */
  shapes?: Shape[];
  /** Called when modal closes with updated shapes + composite data URL */
  onShapesChange?: (shapes: Shape[], compositeUrl: string) => void;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
function normBounds(shape: Shape) {
  return {
    x1: Math.min(shape.x1, shape.x2),
    y1: Math.min(shape.y1, shape.y2),
    x2: Math.max(shape.x1, shape.x2),
    y2: Math.max(shape.y1, shape.y2),
  };
}

function getHandles(shape: Shape, cw: number, ch: number): Array<{ id: HandleId; cx: number; cy: number }> {
  if (shape.type === "arrow") {
    return [
      { id: "TL", cx: shape.x1 * cw, cy: shape.y1 * ch },   // start
      { id: "BR", cx: shape.x2 * cw, cy: shape.y2 * ch },   // end
      { id: "MOVE", cx: ((shape.x1 + shape.x2) / 2) * cw, cy: ((shape.y1 + shape.y2) / 2) * ch },
    ];
  }
  if (shape.type === "text") {
    const n = normBounds(shape);
    const x1 = n.x1 * cw, y1 = n.y1 * ch;
    const x2 = n.x2 * cw, y2 = n.y2 * ch;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return [
      { id: "TL", cx: x1, cy: y1 }, { id: "TC", cx: mx, cy: y1 }, { id: "TR", cx: x2, cy: y1 },
      { id: "ML", cx: x1, cy: my },                                  { id: "MR", cx: x2, cy: my },
      { id: "BL", cx: x1, cy: y2 }, { id: "BC", cx: mx, cy: y2 }, { id: "BR", cx: x2, cy: y2 },
      { id: "MOVE", cx: mx, cy: my },
    ];
  }
  const n = normBounds(shape);
  const x1 = n.x1 * cw, y1 = n.y1 * ch;
  const x2 = n.x2 * cw, y2 = n.y2 * ch;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return [
    { id: "TL", cx: x1, cy: y1 }, { id: "TC", cx: mx, cy: y1 }, { id: "TR", cx: x2, cy: y1 },
    { id: "ML", cx: x1, cy: my },                                 { id: "MR", cx: x2, cy: my },
    { id: "BL", cx: x1, cy: y2 }, { id: "BC", cx: mx, cy: y2 }, { id: "BR", cx: x2, cy: y2 },
    { id: "MOVE", cx: mx, cy: my },
  ];
}

function hitHandle(mx: number, my: number, handles: Array<{ id: HandleId; cx: number; cy: number }>): HandleId | null {
  for (const h of handles) {
    if (Math.hypot(mx - h.cx, my - h.cy) <= HANDLE_R + 4) return h.id;
  }
  return null;
}

/** Full bounding-box test used for move-detection on draw tools (rect/ellipse interior is grabbable). */
function hitShapeForDrag(mx: number, my: number, shape: Shape, cw: number, ch: number): boolean {
  if (shape.type === "arrow") return hitShape(mx, my, shape, cw, ch);
  const px1 = shape.x1 * cw, py1 = shape.y1 * ch;
  const px2 = shape.x2 * cw, py2 = shape.y2 * ch;
  return mx >= Math.min(px1, px2) && mx <= Math.max(px1, px2) &&
         my >= Math.min(py1, py2) && my <= Math.max(py1, py2);
}

function hitShape(mx: number, my: number, shape: Shape, cw: number, ch: number): boolean {
  const px1 = shape.x1 * cw, py1 = shape.y1 * ch;
  const px2 = shape.x2 * cw, py2 = shape.y2 * ch;
  const minX = Math.min(px1, px2), maxX = Math.max(px1, px2);
  const minY = Math.min(py1, py2), maxY = Math.max(py1, py2);
  const t = Math.max(shape.thickness + 4, 8);

  if (shape.type === "censor") {
    return mx >= minX && mx <= maxX && my >= minY && my <= maxY;
  }
  if (shape.type === "text") {
    return mx >= minX && mx <= maxX && my >= minY && my <= maxY;
  }
  if (shape.type === "rect") {
    const inside = mx > minX + t && mx < maxX - t && my > minY + t && my < maxY - t;
    return mx >= minX - t && mx <= maxX + t && my >= minY - t && my <= maxY + t && !inside;
  }
  if (shape.type === "ellipse") {
    const cx = (px1 + px2) / 2, cy = (py1 + py2) / 2;
    const rx = Math.abs(px2 - px1) / 2, ry = Math.abs(py2 - py1) / 2;
    if (rx < 1 || ry < 1) return false;
    const dx = (mx - cx) / rx, dy = (my - cy) / ry;
    return Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) < (t / Math.max(rx, ry));
  }
  if (shape.type === "arrow") {
    const dx = px2 - px1, dy = py2 - py1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(mx - px1, my - py1) < t;
    const tt = Math.max(0, Math.min(1, ((mx - px1) * dx + (my - py1) * dy) / lenSq));
    return Math.hypot(mx - (px1 + tt * dx), my - (py1 + tt * dy)) <= t;
  }
  return false;
}

function applyHandle(shape: Shape, handle: HandleId, dnx: number, dny: number): Shape {
  const s = { ...shape };
  switch (handle) {
    case "TL":   s.x1 += dnx; s.y1 += dny; break;
    case "TC":                 s.y1 += dny; break;
    case "TR":   s.x2 += dnx; s.y1 += dny; break;
    case "ML":   s.x1 += dnx;               break;
    case "MR":   s.x2 += dnx;               break;
    case "BL":   s.x1 += dnx; s.y2 += dny; break;
    case "BC":                 s.y2 += dny; break;
    case "BR":   s.x2 += dnx; s.y2 += dny; break;
    case "MOVE": s.x1 += dnx; s.y1 += dny; s.x2 += dnx; s.y2 += dny; break;
  }
  return s;
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawShapeOnCtx(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  shape: Shape,
  imgEl: HTMLImageElement | null
): void {
  const x1 = shape.x1 * cw, y1 = shape.y1 * ch;
  const x2 = shape.x2 * cw, y2 = shape.y2 * ch;

  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.thickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (shape.type === "rect") {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (shape.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shape.type === "arrow") {
    const dx = x2 - x1, dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const hLen = Math.min(14, Math.max(6, Math.hypot(dx, dy) * 0.14)) + shape.thickness * 0.5;
    const style = shape.arrowStyle ?? "line-arrow";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // Arrowhead at end (x2, y2)
    if (style === "line-arrow" || style === "arrow-arrow") {
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hLen * Math.cos(angle - 0.45), y2 - hLen * Math.sin(angle - 0.45));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hLen * Math.cos(angle + 0.45), y2 - hLen * Math.sin(angle + 0.45));
      ctx.stroke();
    }
    // Arrowhead at start (x1, y1) — points backward
    if (style === "arrow-line" || style === "arrow-arrow") {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + hLen * Math.cos(angle - 0.45), y1 + hLen * Math.sin(angle - 0.45));
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + hLen * Math.cos(angle + 0.45), y1 + hLen * Math.sin(angle + 0.45));
      ctx.stroke();
    }
  } else if (shape.type === "censor") {
    const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
    if (rw > 4 && rh > 4) {
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        const blockSize = Math.max(2, shape.censorStrength);
        const pw = Math.max(1, Math.round(rw / blockSize));
        const ph = Math.max(1, Math.round(rh / blockSize));
        const tmp = document.createElement("canvas");
        tmp.width = pw; tmp.height = ph;
        const tctx = tmp.getContext("2d");
        if (tctx) {
          const sx = imgEl.naturalWidth / cw, sy = imgEl.naturalHeight / ch;
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
  } else if (shape.type === "text" && shape.text) {
    const fsPx = (shape.fontSize ?? DEFAULT_FONT_SIZE) * (ch / 1080);
    ctx.font = `bold ${fsPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = shape.color;
    ctx.textBaseline = "top";
    const lineH = fsPx * 1.35;
    const boxW = Math.abs(x2 - x1);
    // Word-wrap each explicit paragraph to fit the bounding box width
    const renderedLines: string[] = [];
    for (const para of shape.text.split("\n")) {
      if (para === "") { renderedLines.push(""); continue; }
      const words = para.split(" ");
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (!cur || ctx.measureText(test).width <= boxW) {
          cur = test;
        } else {
          renderedLines.push(cur);
          cur = word;
        }
      }
      if (cur) renderedLines.push(cur);
    }
    const startX = Math.min(x1, x2);
    const startY = Math.min(y1, y2);
    renderedLines.forEach((line, i) => {
      ctx.fillText(line, startX, startY + i * lineH);
    });
  }
  ctx.restore();
}

function drawHandles(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  cw: number,
  ch: number,
  selectedId: string | null
): void {
  if (shape.id !== selectedId) return;
  const handles = getHandles(shape, cw, ch);
  // Draw bounding box selection indicator
  ctx.save();
  if (shape.type !== "arrow") {
    const n = normBounds(shape);
    ctx.strokeStyle = "rgba(75,139,245,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(n.x1 * cw, n.y1 * ch, (n.x2 - n.x1) * cw, (n.y2 - n.y1) * ch);
    ctx.setLineDash([]);
  }
  for (const h of handles) {
    if (h.id === "MOVE") continue;
    ctx.beginPath();
    ctx.arc(h.cx, h.cy, HANDLE_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#4B8BF5";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// ── Toolbar button helper ──────────────────────────────────────────────────────
function ToolBtn({
  active, title, onClick, children,
}: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer transition-all duration-100",
        active
          ? "text-blue-300"
          : "text-white/50 hover:text-white/85",
      ].join(" ")}
      style={{ background: active ? "rgba(75,139,245,0.22)" : "transparent" }}
    >
      {children}
    </button>
  );
}

// ── Annotation Modal ───────────────────────────────────────────────────────────
function AnnotationModal({
  imgUrl,
  shapesRef,
  onClose,
}: {
  imgUrl: string;
  shapesRef: React.MutableRefObject<Shape[]>;
  onClose: () => void;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<DrawTool>("pointer");
  const [color, setColor] = useState(COLORS[0]);
  const [thickness, setThickness] = useState(2);
  const [censorStrength, setCensorStrength] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyLen, setHistoryLen] = useState(0);
  const [shapeCount, setShapeCount] = useState(shapesRef.current.length);
  const [arrowStyle, setArrowStyle] = useState<Shape["arrowStyle"]>("line-arrow");
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 540 });
  // Inline text editor: shown when text tool is active and user clicks canvas
  const [textEditor, setTextEditor] = useState<{ normX: number; normY: number; value: string } | null>(null);

  // Mutable interaction refs
  const activeToolRef = useRef<DrawTool>("pointer");
  const colorRef = useRef(color);
  const thicknessRef = useRef(thickness);
  const censorStrengthRef = useRef(censorStrength);
  const selectedIdRef = useRef<string | null>(null);
  const arrowStyleRef = useRef<Shape["arrowStyle"]>("line-arrow");
  const fontSizeRef = useRef(DEFAULT_FONT_SIZE);
  const textEditorRef = useRef<{ normX: number; normY: number; value: string } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const isDown = useRef(false);
  const dragLastNorm = useRef({ x: 0, y: 0 });
  const drawStartNorm = useRef({ x: 0, y: 0 });
  const drawCurrentNorm = useRef({ x: 0, y: 0 });
  const activeHandle = useRef<HandleId | null>(null);
  const dragShapeId = useRef<string | null>(null);
  const historyRef = useRef<Shape[][]>([]);

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
  useEffect(() => { censorStrengthRef.current = censorStrength; }, [censorStrength]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { arrowStyleRef.current = arrowStyle; }, [arrowStyle]);
  useEffect(() => { fontSizeRef.current = fontSize; }, [fontSize]);
  useEffect(() => { textEditorRef.current = textEditor; }, [textEditor]);

  // Sync slider values to selected shape when selection changes in pointer mode
  useEffect(() => {
    if (!selectedId || activeTool !== "pointer") return;
    const shape = shapesRef.current.find((s) => s.id === selectedId);
    if (!shape) return;
    setColor(shape.color); colorRef.current = shape.color;
    setThickness(shape.thickness); thicknessRef.current = shape.thickness;
    setCensorStrength(shape.censorStrength); censorStrengthRef.current = shape.censorStrength;
    if (shape.type === "arrow" && shape.arrowStyle) {
      setArrowStyle(shape.arrowStyle); arrowStyleRef.current = shape.arrowStyle;
    }
    if (shape.type === "text" && shape.fontSize !== undefined) {
      setFontSize(shape.fontSize); fontSizeRef.current = shape.fontSize;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const redraw = useCallback((): void => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const shape of shapesRef.current) {
      drawShapeOnCtx(ctx, canvas.width, canvas.height, shape, imgRef.current);
    }
    // Draw selection handles
    const selId = selectedIdRef.current;
    if (selId) {
      const sel = shapesRef.current.find((s) => s.id === selId);
      if (sel) drawHandles(ctx, sel, canvas.width, canvas.height, selId);
    }
    // Draw in-progress shape (only when actively drawing a NEW shape, not during move/resize)
    if (isDown.current && activeToolRef.current !== "pointer" && dragShapeId.current === null) {
      drawShapeOnCtx(ctx, canvas.width, canvas.height, {
        id: "__preview",
        type: activeToolRef.current as Exclude<DrawTool, "pointer">,
        x1: drawStartNorm.current.x, y1: drawStartNorm.current.y,
        x2: drawCurrentNorm.current.x, y2: drawCurrentNorm.current.y,
        color: colorRef.current,
        thickness: thicknessRef.current,
        censorStrength: censorStrengthRef.current,
        arrowStyle: arrowStyleRef.current,
      }, imgRef.current);
    }
  }, [shapesRef]);

  // Sync canvas size to wrapper
  useEffect((): (() => void) => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return () => undefined;
    const sync = (): void => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      setCanvasSize({ w: wrap.clientWidth, h: wrap.clientHeight });
      redraw();
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  // Preload image into ref
  useEffect((): void => {
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => { imgRef.current = img; redraw(); };
    if (img.complete) { imgRef.current = img; }
  }, [imgUrl, redraw]);

  // Escape closes modal (but not if text editor is open — textarea handles it)
  useEffect((): (() => void) => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !textEditorRef.current) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /** Commit the inline text editor as a permanent text shape. */
  const commitText = useCallback((editor: { normX: number; normY: number; value: string }): void => {
    const text = editor.value.trim();
    if (!text) { setTextEditor(null); return; }
    const canvas = canvasRef.current;
    const cw = canvas?.width ?? 1920, ch = canvas?.height ?? 1080;
    const fsPx = fontSizeRef.current * (ch / 1080);
    const lineH = fsPx * 1.35;
    const lines = text.split("\n");
    // Measure width using canvas context for accuracy
    let maxWidthPx = lines.reduce((m, l) => Math.max(m, l.length), 0) * fsPx * 0.6;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `bold ${fsPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        maxWidthPx = Math.max(...lines.map((l) => ctx.measureText(l).width));
      }
    }
    const totalHeightPx = lines.length * lineH;
    historyRef.current.push(shapesRef.current.map((s) => ({ ...s })));
    const newShape: Shape = {
      id: `s${Date.now()}${Math.random().toString(36).slice(2)}`,
      type: "text",
      x1: editor.normX,
      y1: editor.normY,
      x2: editor.normX + maxWidthPx / cw,
      y2: editor.normY + totalHeightPx / ch,
      color: colorRef.current,
      thickness: thicknessRef.current,
      censorStrength: 2,
      text,
      fontSize: fontSizeRef.current,
    };
    shapesRef.current = [...shapesRef.current, newShape];
    setSelectedId(newShape.id);
    selectedIdRef.current = newShape.id;
    setShapeCount(shapesRef.current.length);
    setHistoryLen(historyRef.current.length);
    setTextEditor(null);
    redraw();
  }, [shapesRef, redraw]);

  const getNormPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const getCanvasPx = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const updateSelectedShape = (patch: Partial<Shape>): void => {
    const id = selectedIdRef.current;
    if (!id) return;
    shapesRef.current = shapesRef.current.map((s) => (s.id === id ? { ...s, ...patch } : s));
    redraw();
  };

  const onMouseDown = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    const tool = activeToolRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width, ch = canvas.height;
    const normPos = getNormPos(e);
    const cpx = getCanvasPx(e);

    if (tool === "pointer") {
      const selId = selectedIdRef.current;
      // 1. Check handles of currently selected shape first
      if (selId) {
        const selShape = shapesRef.current.find((s) => s.id === selId);
        if (selShape) {
          const handles = getHandles(selShape, cw, ch);
          const hit = hitHandle(cpx.x, cpx.y, handles);
          if (hit) {
            // Push to history before modify
            historyRef.current.push(shapesRef.current.map((s) => ({ ...s })));
            setHistoryLen(historyRef.current.length);
            isDown.current = true;
            activeHandle.current = hit;
            dragShapeId.current = selId;
            dragLastNorm.current = normPos;
            return;
          }
        }
      }
      // 2. Hit-test all shapes (topmost first)
      const hit = [...shapesRef.current].reverse().find((s) => hitShape(cpx.x, cpx.y, s, cw, ch));
      if (hit) {
        setSelectedId(hit.id);
        selectedIdRef.current = hit.id;
        historyRef.current.push(shapesRef.current.map((s) => ({ ...s })));
        setHistoryLen(historyRef.current.length);
        isDown.current = true;
        activeHandle.current = "MOVE";
        dragShapeId.current = hit.id;
        dragLastNorm.current = normPos;
        // Sync slider values
        setColor(hit.color); colorRef.current = hit.color;
        setThickness(hit.thickness); thicknessRef.current = hit.thickness;
        setCensorStrength(hit.censorStrength); censorStrengthRef.current = hit.censorStrength;
      } else {
        // Deselect
        setSelectedId(null);
        selectedIdRef.current = null;
      }
      redraw();
    } else {
      // Drawing mode — but first check if user is clicking on selected shape (move/resize)
      const selId = selectedIdRef.current;
      if (selId) {
        const selShape = shapesRef.current.find((s) => s.id === selId);
        if (selShape) {
          const handles = getHandles(selShape, cw, ch);
          const handleHit = hitHandle(cpx.x, cpx.y, handles);
          if (handleHit) {
            historyRef.current.push(shapesRef.current.map((s) => ({ ...s })));
            setHistoryLen(historyRef.current.length);
            isDown.current = true;
            activeHandle.current = handleHit;
            dragShapeId.current = selId;
            dragLastNorm.current = normPos;
            return;
          }
          if (hitShapeForDrag(cpx.x, cpx.y, selShape, cw, ch)) {
            historyRef.current.push(shapesRef.current.map((s) => ({ ...s })));
            setHistoryLen(historyRef.current.length);
            isDown.current = true;
            activeHandle.current = "MOVE";
            dragShapeId.current = selId;
            dragLastNorm.current = normPos;
            return;
          }
        }
      }
      // Start a new shape (or open text editor)
      if (tool === "text") {
        setTextEditor({ normX: normPos.x, normY: normPos.y, value: "" });
        setSelectedId(null);
        selectedIdRef.current = null;
        return;
      }
      isDown.current = true;
      drawStartNorm.current = normPos;
      drawCurrentNorm.current = normPos;
      setSelectedId(null);
      selectedIdRef.current = null;
    }
  }, [getNormPos, getCanvasPx, shapesRef, redraw]);

  const onMouseMove = useCallback((e: React.MouseEvent): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width, ch = canvas.height;
    const normPos = getNormPos(e);
    const cpx = getCanvasPx(e);

    // Update cursor based on hover state — works for all tools
    if (!isDown.current) {
      const isPointerTool = activeToolRef.current === "pointer";
      const selId = selectedIdRef.current;
      let cur = isPointerTool ? "default" : "crosshair";
      if (selId) {
        const selShape = shapesRef.current.find((s) => s.id === selId);
        if (selShape) {
          const handles = getHandles(selShape, cw, ch);
          const hh = hitHandle(cpx.x, cpx.y, handles);
          if (hh) {
            cur = selShape.type === "arrow" && (hh === "TL" || hh === "BR")
              ? (isPointerTool ? "crosshair" : "crosshair")
              : HANDLE_CURSORS[hh];
          } else if (hitShapeForDrag(cpx.x, cpx.y, selShape, cw, ch)) {
            cur = "move";
          }
        }
      }
      if ((isPointerTool ? cur === "default" : cur === "crosshair") && shapesRef.current.some((s) => hitShape(cpx.x, cpx.y, s, cw, ch))) {
        cur = isPointerTool ? "pointer" : "move";
      }
      canvas.style.cursor = cur;
    }

    if (!isDown.current) return;

    if (dragShapeId.current && activeHandle.current) {
      const dnx = normPos.x - dragLastNorm.current.x;
      const dny = normPos.y - dragLastNorm.current.y;
      dragLastNorm.current = normPos;
      const handle = activeHandle.current;
      shapesRef.current = shapesRef.current.map((s) => {
        if (s.id !== dragShapeId.current) return s;
        return applyHandle(s, handle, dnx, dny);
      });
      redraw();
    } else {
      // Apply shift-constrain during drawing
      let constrainedPos = normPos;
      if (e.shiftKey) {
        const sx = drawStartNorm.current.x, sy = drawStartNorm.current.y;
        const dx = normPos.x - sx, dy = normPos.y - sy;
        if (activeToolRef.current === "arrow") {
          // Snap to nearest 45° angle (in pixel space so diagonals are true 45°)
          const dxPx = dx * cw, dyPx = dy * ch;
          const angle = Math.atan2(dyPx, dxPx);
          const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.hypot(dxPx, dyPx);
          constrainedPos = {
            x: sx + (dist * Math.cos(snapAngle)) / cw,
            y: sy + (dist * Math.sin(snapAngle)) / ch,
          };
        } else {
          // Square/circle constraint: equalize pixel extents so the shape is visually square
          const dxPx = dx * cw, dyPx = dy * ch;
          const dimPx = Math.min(Math.abs(dxPx), Math.abs(dyPx));
          constrainedPos = {
            x: sx + Math.sign(dx) * (dimPx / cw),
            y: sy + Math.sign(dy) * (dimPx / ch),
          };
        }
      }
      drawCurrentNorm.current = constrainedPos;
      redraw();
    }
  }, [getNormPos, getCanvasPx, shapesRef, redraw]);

  const onMouseUp = useCallback((_e: React.MouseEvent): void => {
    if (!isDown.current) return;
    const tool = activeToolRef.current;

    if (tool === "pointer" || dragShapeId.current !== null) {
      // Move/resize committed; clean up (also handles move/resize initiated from draw tools)
      dragShapeId.current = null;
      activeHandle.current = null;
    } else {
      // Commit new drawn shape — drawCurrentNorm already has shift-constraint applied from onMouseMove
      const endPos = drawCurrentNorm.current;
      const dx = endPos.x - drawStartNorm.current.x;
      const dy = endPos.y - drawStartNorm.current.y;
      if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) {
        historyRef.current.push(shapesRef.current.map((s) => ({ ...s })));
        const newShape: Shape = {
          id: `s${Date.now()}${Math.random().toString(36).slice(2)}`,
          type: tool as Exclude<DrawTool, "pointer">,
          x1: drawStartNorm.current.x, y1: drawStartNorm.current.y,
          x2: endPos.x, y2: endPos.y,
          color: colorRef.current,
          thickness: thicknessRef.current,
          censorStrength: censorStrengthRef.current,
          arrowStyle: tool === "arrow" ? arrowStyleRef.current : undefined,
        };
        shapesRef.current = [...shapesRef.current, newShape];
        setSelectedId(newShape.id);
        selectedIdRef.current = newShape.id;
        setShapeCount(shapesRef.current.length);
        setHistoryLen(historyRef.current.length);
      }
    }
    isDown.current = false;
    redraw();
  }, [shapesRef, redraw]);

  const undo = (): void => {
    const prev = historyRef.current.pop();
    if (prev !== undefined) {
      shapesRef.current = prev;
      setShapeCount(prev.length);
      setHistoryLen(historyRef.current.length);
      setSelectedId(null);
      selectedIdRef.current = null;
      redraw();
    }
  };

  const clearAll = (): void => {
    if (shapesRef.current.length === 0) return;
    historyRef.current.push(shapesRef.current.map((s) => ({ ...s })));
    shapesRef.current = [];
    setShapeCount(0);
    setHistoryLen(historyRef.current.length);
    setSelectedId(null);
    selectedIdRef.current = null;
    redraw();
  };

  // What tool type determines the option panel (selected shape type in pointer mode)
  const selectedShape = selectedId ? shapesRef.current.find((s) => s.id === selectedId) : undefined;
  const effectiveTool = activeTool === "pointer" ? (selectedShape?.type ?? null) : activeTool;
  const showColorThick = effectiveTool === "rect" || effectiveTool === "ellipse" || effectiveTool === "arrow";
  const showCensor = effectiveTool === "censor";
  const showArrowStyle = effectiveTool === "arrow";
  const showTextOpts = effectiveTool === "text";

  const SEP = (
    <div className="w-px h-5 flex-shrink-0 mx-1" style={{ background: "rgba(255,255,255,0.15)" }} />
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col select-none"
      style={{ background: "oklch(10% 0.01 250 / 0.96)", backdropFilter: "blur(4px)" }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-white/40 text-xs font-mono">Annotate screenshot</span>
        <div className="flex-1" />
        {shapeCount > 0 && (
          <span className="text-white/30 text-xs font-mono">
            {shapeCount} annotation{shapeCount !== 1 ? "s" : ""}
          </span>
        )}
        {shapeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-mono px-2 py-1 rounded border-none cursor-pointer transition-colors"
            style={{ color: "rgba(248,113,113,0.7)", background: "transparent" }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "rgb(248,113,113)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "rgba(248,113,113,0.7)"; }}
          >
            Clear all
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="h-7 px-4 rounded text-sm font-medium text-white transition-colors border-none cursor-pointer"
          style={{ background: "rgba(255,255,255,0.1)" }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.16)"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
        >
          Done
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0">
        <div
          ref={wrapRef}
          className="relative rounded-lg overflow-hidden shadow-2xl"
          style={{
            aspectRatio: "16/9",
            maxWidth: "min(90vw, calc((100vh - 130px) * 16 / 9))",
            width: "100%",
          }}
        >
          <img
            src={imgUrl}
            alt="Screenshot"
            className="absolute inset-0 w-full h-full select-none pointer-events-none"
            style={{ objectFit: "fill", display: "block" }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full select-none"
            style={{ cursor: activeTool === "text" ? "text" : activeTool !== "pointer" ? "crosshair" : "default" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            onMouseLeave={(): void => {
              if (isDown.current && activeToolRef.current !== "pointer") {
                isDown.current = false;
                redraw();
              }
            }}
          />

          {/* Inline text editor overlay */}
          {textEditor !== null && (
            <textarea
              ref={textAreaRef}
              autoFocus
              rows={1}
              value={textEditor.value}
              onChange={(e) => {
                const val = e.target.value;
                setTextEditor((prev) => prev ? { ...prev, value: val } : null);
                // Auto-grow height
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={() => {
                const ed = textEditorRef.current;
                if (ed) commitText(ed);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setTextEditor(null);
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const ed = textEditorRef.current;
                  if (ed) commitText(ed);
                }
              }}
              style={{
                position: "absolute",
                left: `${textEditor.normX * 100}%`,
                top: `${textEditor.normY * 100}%`,
                minWidth: "80px",
                width: "auto",
                background: "transparent",
                border: "1px dashed rgba(75,139,245,0.75)",
                borderRadius: "2px",
                outline: "none",
                color: color,
                fontSize: `${fontSize * (canvasSize.h / 1080)}px`,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: "bold",
                lineHeight: "1.35",
                resize: "none",
                padding: "1px 3px",
                overflow: "hidden",
                zIndex: 10,
                caretColor: color,
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-1 px-4 py-3 flex-wrap"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Tool group */}
        <div
          className="flex items-center gap-0.5 rounded-lg p-1"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ToolBtn active={activeTool === "pointer"} title="Select / Move / Resize (pointer)" onClick={() => { setActiveTool("pointer"); activeToolRef.current = "pointer"; }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 1.5l9.5 9.5-3.8 1-1.8 4.2L3.5 1.5z" />
            </svg>
          </ToolBtn>
          <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.12)" }} />
          <ToolBtn active={activeTool === "rect"} title="Rectangle" onClick={() => { setActiveTool("rect"); activeToolRef.current = "rect"; }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3.5" width="12" height="9" rx="1" /></svg>
          </ToolBtn>
          <ToolBtn active={activeTool === "ellipse"} title="Ellipse" onClick={() => { setActiveTool("ellipse"); activeToolRef.current = "ellipse"; }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="8" rx="6" ry="4.5" /></svg>
          </ToolBtn>
          <ToolBtn active={activeTool === "arrow"} title="Arrow" onClick={() => { setActiveTool("arrow"); activeToolRef.current = "arrow"; }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8h10" /><path d="M10 5l3 3-3 3" /></svg>
          </ToolBtn>
          <ToolBtn active={activeTool === "censor"} title="Mosaic / Censor" onClick={() => { setActiveTool("censor"); activeToolRef.current = "censor"; }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="8" rx="1" fill="currentColor" opacity=".25" /><path d="M2 4h12M2 7h12M2 10h12M5 4v8M8 4v8M11 4v8" stroke="currentColor" strokeWidth="1" /></svg>
          </ToolBtn>
          <ToolBtn active={activeTool === "text"} title="Text" onClick={() => { setActiveTool("text"); activeToolRef.current = "text"; }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2.5H9.5V13h-3V5.5H2V3z" /></svg>
          </ToolBtn>
        </div>

        {/* Text options: color + font size */}
        {showTextOpts && (
          <>
            {SEP}
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => { setColor(c); colorRef.current = c; updateSelectedShape({ color: c }); }}
                  className="w-4 h-4 rounded-full cursor-pointer border-0 transition-transform hover:scale-125 flex-shrink-0"
                  style={{
                    background: c,
                    outline: color === c ? "2px solid rgba(255,255,255,0.9)" : "2px solid transparent",
                    outlineOffset: "1.5px",
                    boxShadow: c === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.3)" : undefined,
                  }}
                />
              ))}
            </div>
            {SEP}
            <div className="flex items-center gap-2">
              <span className="text-white/35 font-mono whitespace-nowrap" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Size</span>
              <input
                type="range" min={12} max={72} step={1} value={fontSize}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setFontSize(v); fontSizeRef.current = v;
                  updateSelectedShape({ fontSize: v });
                }}
                className="w-24 cursor-pointer"
                style={{ accentColor: "#4B8BF5" }}
              />
              <span className="text-white/35 font-mono w-8 text-right" style={{ fontSize: "10px" }}>{fontSize}px</span>
            </div>
          </>
        )}

        {/* Color swatches + line width — for rect / ellipse / arrow (or selected shape of those types) */}
        {showColorThick && (
          <>
            {SEP}
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    setColor(c);
                    colorRef.current = c;
                    updateSelectedShape({ color: c });
                  }}
                  className="w-4 h-4 rounded-full cursor-pointer border-0 transition-transform hover:scale-125 flex-shrink-0"
                  style={{
                    background: c,
                    outline: color === c ? "2px solid rgba(255,255,255,0.9)" : "2px solid transparent",
                    outlineOffset: "1.5px",
                    boxShadow: c === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.3)" : undefined,
                  }}
                />
              ))}
            </div>
            {SEP}
            <div className="flex items-center gap-2">
              <span className="text-white/35 font-mono whitespace-nowrap" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Width</span>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={thickness}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setThickness(v);
                  thicknessRef.current = v;
                  updateSelectedShape({ thickness: v });
                }}
                className="w-24 cursor-pointer"
                style={{ accentColor: "#4B8BF5" }}
              />
              <span className="text-white/35 font-mono w-6 text-right" style={{ fontSize: "10px" }}>{thickness}</span>
            </div>
          </>
        )}

        {/* Censor strength slider */}
        {showCensor && (
          <>
            {SEP}
            <div className="flex items-center gap-2">
              <span className="text-white/35 font-mono whitespace-nowrap" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Mosaic</span>
              <input
                type="range"
                min={2}
                max={32}
                step={1}
                value={censorStrength}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setCensorStrength(v);
                  censorStrengthRef.current = v;
                  updateSelectedShape({ censorStrength: v });
                }}
                className="w-24 cursor-pointer"
                style={{ accentColor: "#4B8BF5" }}
              />
              <span className="text-white/35 font-mono w-8 text-right" style={{ fontSize: "10px" }}>{censorStrength}px</span>
            </div>
          </>
        )}

        {/* Arrow style picker — visible when arrow tool is active or an arrow shape is selected */}
        {showArrowStyle && (
          <>
            {SEP}
            <div className="flex items-center gap-1" style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "4px" }}>
              {(
                [
                  { value: "line-arrow", title: "Line → Arrow", svg: <svg width="28" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="7" x2="22" y2="7" /><polyline points="16,3 22,7 16,11" /></svg> },
                  { value: "arrow-arrow", title: "Arrow ↔ Arrow", svg: <svg width="28" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="7" x2="25" y2="7" /><polyline points="9,3 3,7 9,11" /><polyline points="19,3 25,7 19,11" /></svg> },
                  { value: "line-line", title: "Line — Line (no arrows)", svg: <svg width="28" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="7" x2="25" y2="7" /></svg> },
                  { value: "arrow-line", title: "Arrow → Line", svg: <svg width="28" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="6" y1="7" x2="25" y2="7" /><polyline points="12,3 6,7 12,11" /></svg> },
                ] as { value: Shape["arrowStyle"]; title: string; svg: React.ReactNode }[]
              ).map(({ value, title, svg }) => (
                <button
                  key={value}
                  type="button"
                  title={title}
                  onClick={() => {
                    setArrowStyle(value);
                    arrowStyleRef.current = value;
                    updateSelectedShape({ arrowStyle: value });
                    redraw();
                  }}
                  className="flex items-center justify-center h-7 px-1 rounded border-none cursor-pointer transition-all duration-100"
                  style={{
                    background: arrowStyle === value ? "rgba(75,139,245,0.22)" : "transparent",
                    color: arrowStyle === value ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {svg}
                </button>
              ))}
            </div>
          </>
        )}

        {SEP}

        {/* Undo */}
        <button
          type="button"
          title="Undo (Ctrl+Z)"
          disabled={historyLen === 0}
          onClick={undo}
          className="flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4.5 6H10a3 3 0 010 6H7" /><path d="M4.5 6L2 3.5M4.5 6L2 8.5" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Card thumbnail + entry point ───────────────────────────────────────────────
export function AnnotationCanvas({ imgUrl, shapes: initialShapes, onShapesChange }: AnnotationCanvasProps): JSX.Element {
  const shapesRef = useRef<Shape[]>(initialShapes ?? []);
  const [shapeCount, setShapeCount] = useState(initialShapes?.length ?? 0);
  const [isOpen, setIsOpen] = useState(false);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  // Pre-loaded image to avoid race condition when building composite
  const cachedImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { cachedImgRef.current = img; };
    img.src = imgUrl;
    if (img.complete && img.naturalWidth > 0) { cachedImgRef.current = img; }
  }, [imgUrl]);

  // Generate composite thumbnail (image + annotations)
  const buildComposite = useCallback((shapes: Shape[]): void => {
    if (shapes.length === 0) {
      setCompositeUrl(null);
      onShapesChange?.(shapes, "");
      return;
    }
    const doRender = (img: HTMLImageElement): void => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 1920;
      c.height = img.naturalHeight || 1080;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      for (const shape of shapes) {
        drawShapeOnCtx(ctx, c.width, c.height, shape, img);
      }
      const url = c.toDataURL("image/jpeg", 0.92);
      setCompositeUrl(url);
      onShapesChange?.(shapes, url);
    };
    // Use pre-loaded cached image if available; fallback handles already-cached blob URLs
    if (cachedImgRef.current) {
      doRender(cachedImgRef.current);
    } else {
      const img = new Image();
      img.src = imgUrl;
      const onReady = (): void => { cachedImgRef.current = img; doRender(img); };
      if (img.complete && img.naturalWidth > 0) { onReady(); }
      else { img.onload = onReady; }
    }
  }, [imgUrl, onShapesChange]);

  return (
    <>
      {/* Screenshot thumbnail with hover overlay */}
      <div
        className="relative w-full border-b border-[var(--border)] group/screenshot"
        style={{ aspectRatio: "16/9", background: "var(--bg)", overflow: "hidden" }}
      >
        <img
          src={compositeUrl ?? imgUrl}
          alt="Screenshot"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />

        {/* Hover overlay — centered "Annotate" button */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/screenshot:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-lg border-none cursor-pointer text-white font-medium transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(10,14,25,0.62)",
              backdropFilter: "blur(10px)",
              padding: "8px 16px",
              fontSize: "13px",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M11 2l3 3-8.5 8.5H2v-3.5L11 2z" />
            </svg>
            {shapeCount > 0 ? `Edit annotations (${shapeCount})` : "Annotate"}
          </button>
        </div>

        {/* Always-visible annotation count badge */}
        {shapeCount > 0 && (
          <div
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-white text-[10px] font-mono pointer-events-none"
            style={{ background: "rgba(75,139,245,0.82)", backdropFilter: "blur(4px)" }}
          >
            {shapeCount}✎
          </div>
        )}
      </div>

      {/* Annotation zoom modal */}
      {isOpen && (
        <AnnotationModal
          imgUrl={imgUrl}
          shapesRef={shapesRef}
          onClose={() => {
            const count = shapesRef.current.length;
            setShapeCount(count);
            setIsOpen(false);
            buildComposite(shapesRef.current);
          }}
        />
      )}
    </>
  );
}
