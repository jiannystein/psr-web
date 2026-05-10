/**
 * Annotation Renderer - Renders annotations onto images
 */
export async function renderAnnotationsOntoImage(imageBlob, shapes) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }
                // Draw image
                ctx.drawImage(img, 0, 0);
                // Draw annotations
                for (const shape of shapes) {
                    drawShapeOnCanvas(ctx, shape, img.width, img.height);
                }
                // Convert to blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    }
                    else {
                        reject(new Error("Failed to create blob"));
                    }
                }, "image/png");
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = e.target?.result;
        };
        reader.onerror = () => reject(new Error("Failed to read blob"));
        reader.readAsDataURL(imageBlob);
    });
}
function drawShapeOnCanvas(ctx, shape, _w, _h) {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.thickness;
    if (shape.type === "rect") {
        const rect = shape;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    else if (shape.type === "ellipse") {
        const ellipse = shape;
        ctx.beginPath();
        ctx.ellipse(ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    else if (shape.type === "arrow") {
        const arrow = shape;
        drawArrowOnCanvas(ctx, arrow);
    }
    else if (shape.type === "censor") {
        const censor = shape;
        ctx.fillStyle = shape.color;
        ctx.globalAlpha = 0.7;
        if (censor.censorShape === "rect") {
            ctx.fillRect(censor.x, censor.y, censor.w, censor.h);
        }
        else {
            ctx.beginPath();
            const cx = censor.x + censor.w / 2;
            const cy = censor.y + censor.h / 2;
            const r = Math.min(censor.w, censor.h) / 2;
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}
function drawArrowOnCanvas(ctx, arrow) {
    const headlen = 15;
    const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
    // Draw line
    ctx.beginPath();
    ctx.moveTo(arrow.x1, arrow.y1);
    ctx.lineTo(arrow.x2, arrow.y2);
    ctx.stroke();
    // Draw arrowhead
    if (arrow.arrowType === "end" || arrow.arrowType === "both") {
        ctx.beginPath();
        ctx.moveTo(arrow.x2, arrow.y2);
        ctx.lineTo(arrow.x2 - headlen * Math.cos(angle - Math.PI / 6), arrow.y2 - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(arrow.x2 - headlen * Math.cos(angle + Math.PI / 6), arrow.y2 - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }
    if (arrow.arrowType === "start" || arrow.arrowType === "both") {
        ctx.beginPath();
        ctx.moveTo(arrow.x1, arrow.y1);
        ctx.lineTo(arrow.x1 + headlen * Math.cos(angle - Math.PI / 6), arrow.y1 + headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(arrow.x1 + headlen * Math.cos(angle + Math.PI / 6), arrow.y1 + headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }
}
