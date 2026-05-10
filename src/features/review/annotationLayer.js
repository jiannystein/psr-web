/**
 * AnnotationLayer - Manages annotation drawing, selection, and rendering
 */
export class AnnotationLayer {
    constructor(canvas) {
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "shapes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "history", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "selectedShapeId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "draftShape", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "activeTool", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "select"
        });
        Object.defineProperty(this, "toolColor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "#FF4444"
        });
        Object.defineProperty(this, "toolThickness", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 2
        });
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("Failed to get canvas context");
        this.ctx = ctx;
    }
    setActiveTool(tool) {
        this.activeTool = tool;
        this.draftShape = null;
        this.render();
    }
    setToolColor(color) {
        this.toolColor = color;
    }
    setToolThickness(thickness) {
        this.toolThickness = thickness;
    }
    setToolStrength(_strength) {
        // Used for censor pixelate/blur strength
    }
    onMouseDown(x, y) {
        if (this.activeTool === "select") {
            const hitShape = this.hitShape(x, y);
            this.selectedShapeId = hitShape?.id ?? null;
        }
        else {
            // Start drawing
            this.draftShape = this.createDraftShape(x, y);
        }
        this.render();
    }
    onMouseMove(x, y) {
        if (this.draftShape) {
            this.updateDraftShape(this.draftShape, x, y);
        }
        this.render();
    }
    onMouseUp() {
        if (this.draftShape) {
            const id = Math.random().toString(36).substring(7);
            this.draftShape.id = id;
            this.shapes.set(id, this.draftShape);
            this.saveHistory();
            this.draftShape = null;
        }
        this.render();
    }
    createDraftShape(x, y) {
        switch (this.activeTool) {
            case "rect":
                return {
                    id: "draft",
                    type: "rect",
                    x,
                    y,
                    w: 0,
                    h: 0,
                    color: this.toolColor,
                    thickness: this.toolThickness,
                };
            case "ellipse":
                return {
                    id: "draft",
                    type: "ellipse",
                    cx: x,
                    cy: y,
                    rx: 0,
                    ry: 0,
                    color: this.toolColor,
                    thickness: this.toolThickness,
                };
            case "arrow":
                return {
                    id: "draft",
                    type: "arrow",
                    x1: x,
                    y1: y,
                    x2: x,
                    y2: y,
                    arrowType: "end",
                    color: this.toolColor,
                    thickness: this.toolThickness,
                };
            case "censor":
                return {
                    id: "draft",
                    type: "censor",
                    x,
                    y,
                    w: 0,
                    h: 0,
                    censorShape: "rect",
                    censorType: "pixelate",
                    strength: 5,
                    color: this.toolColor,
                    thickness: this.toolThickness,
                };
            default:
                throw new Error("Unknown tool");
        }
    }
    updateDraftShape(shape, x, y) {
        if (shape.type === "rect" || shape.type === "censor") {
            const rect = shape;
            rect.w = Math.max(0, x - rect.x);
            rect.h = Math.max(0, y - rect.y);
        }
        else if (shape.type === "ellipse") {
            const ellipse = shape;
            ellipse.rx = Math.abs(x - ellipse.cx);
            ellipse.ry = Math.abs(y - ellipse.cy);
        }
        else if (shape.type === "arrow") {
            const arrow = shape;
            arrow.x2 = x;
            arrow.y2 = y;
        }
    }
    hitShape(x, y) {
        for (const shape of this.shapes.values()) {
            if (this.pointInShape(x, y, shape)) {
                return shape;
            }
        }
        return null;
    }
    pointInShape(x, y, shape) {
        if (shape.type === "rect" || shape.type === "censor") {
            const rect = shape;
            return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
        }
        else if (shape.type === "ellipse") {
            const ellipse = shape;
            const dx = (x - ellipse.cx) / ellipse.rx;
            const dy = (y - ellipse.cy) / ellipse.ry;
            return dx * dx + dy * dy <= 1;
        }
        return false;
    }
    addShape(shape) {
        shape.id = Math.random().toString(36).substring(7);
        this.shapes.set(shape.id, shape);
        this.saveHistory();
    }
    deleteShape(id) {
        this.shapes.delete(id);
        if (this.selectedShapeId === id) {
            this.selectedShapeId = null;
        }
        this.saveHistory();
    }
    deleteSelectedShape() {
        if (this.selectedShapeId) {
            this.deleteShape(this.selectedShapeId);
        }
    }
    undo() {
        if (this.history.length > 1) {
            this.history.pop();
            const previous = this.history[this.history.length - 1];
            this.shapes.clear();
            previous.forEach((shape) => this.shapes.set(shape.id, { ...shape }));
        }
        this.render();
    }
    clear() {
        this.shapes.clear();
        this.selectedShapeId = null;
        this.draftShape = null;
        this.saveHistory();
    }
    saveHistory() {
        this.history.push(Array.from(this.shapes.values()));
    }
    getShapes() {
        return Array.from(this.shapes.values());
    }
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw all shapes
        for (const shape of this.shapes.values()) {
            this.drawShape(shape);
        }
        // Draw draft shape
        if (this.draftShape) {
            this.drawShape(this.draftShape);
        }
        // Draw handles for selected shape
        if (this.selectedShapeId) {
            const shape = this.shapes.get(this.selectedShapeId);
            if (shape) {
                this.drawHandles(shape);
            }
        }
    }
    drawShape(shape) {
        this.ctx.save();
        this.ctx.strokeStyle = shape.color;
        this.ctx.lineWidth = shape.thickness;
        if (shape.type === "rect") {
            const rect = shape;
            this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        }
        else if (shape.type === "ellipse") {
            const ellipse = shape;
            this.ctx.beginPath();
            this.ctx.ellipse(ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        else if (shape.type === "arrow") {
            const arrow = shape;
            this.drawArrow(arrow);
        }
        else if (shape.type === "censor") {
            const censor = shape;
            this.ctx.fillStyle = shape.color;
            this.ctx.globalAlpha = 0.7;
            if (censor.censorShape === "rect") {
                this.ctx.fillRect(censor.x, censor.y, censor.w, censor.h);
            }
            else {
                this.ctx.beginPath();
                const cx = censor.x + censor.w / 2;
                const cy = censor.y + censor.h / 2;
                const r = Math.min(censor.w, censor.h) / 2;
                this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }
    drawArrow(arrow) {
        const headlen = 15;
        const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(arrow.x1, arrow.y1);
        this.ctx.lineTo(arrow.x2, arrow.y2);
        this.ctx.stroke();
        // Draw arrowhead
        if (arrow.arrowType === "end" || arrow.arrowType === "both") {
            this.ctx.beginPath();
            this.ctx.moveTo(arrow.x2, arrow.y2);
            this.ctx.lineTo(arrow.x2 - headlen * Math.cos(angle - Math.PI / 6), arrow.y2 - headlen * Math.sin(angle - Math.PI / 6));
            this.ctx.lineTo(arrow.x2 - headlen * Math.cos(angle + Math.PI / 6), arrow.y2 - headlen * Math.sin(angle + Math.PI / 6));
            this.ctx.closePath();
            this.ctx.fill();
        }
        if (arrow.arrowType === "start" || arrow.arrowType === "both") {
            this.ctx.beginPath();
            this.ctx.moveTo(arrow.x1, arrow.y1);
            this.ctx.lineTo(arrow.x1 + headlen * Math.cos(angle - Math.PI / 6), arrow.y1 + headlen * Math.sin(angle - Math.PI / 6));
            this.ctx.lineTo(arrow.x1 + headlen * Math.cos(angle + Math.PI / 6), arrow.y1 + headlen * Math.sin(angle + Math.PI / 6));
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    drawHandles(shape) {
        this.ctx.fillStyle = "#0099FF";
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.lineWidth = 1;
        const handleSize = 6;
        if (shape.type === "rect" || shape.type === "censor") {
            const rect = shape;
            const corners = [
                [rect.x, rect.y],
                [rect.x + rect.w, rect.y],
                [rect.x + rect.w, rect.y + rect.h],
                [rect.x, rect.y + rect.h],
            ];
            for (const [x, y] of corners) {
                this.ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
                this.ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
            }
        }
    }
}
