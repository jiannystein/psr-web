export function renderClickIndicator(ctx: CanvasRenderingContext2D, cursor: { xPx: number; yPx: number }): void {
  const radius = 20;
  const lineWidth = 2;
  const color = "rgba(255, 79, 79, 0.8)";

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cursor.xPx, cursor.yPx, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cursor.xPx - 8, cursor.yPx);
  ctx.lineTo(cursor.xPx + 8, cursor.yPx);
    ctx.moveTo(cursor.xPx, cursor.yPx - 8);
    ctx.lineTo(cursor.xPx, cursor.yPx + 8);
  ctx.stroke();
  ctx.restore();
}
