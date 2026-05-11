/**
 * HTML Export - Generates self-contained HTML reports with embedded images
 */

import type { CaptureSession, CaptureStep, ExportOptions } from "@models/models";

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (c) => map[c]);
}

function estimateDataUriLength(byteSize: number): number {
  const base64Length = Math.ceil((byteSize / 3) * 4);
  const dataUriPrefix = "data:image/jpeg;base64,".length;
  return dataUriPrefix + base64Length;
}

/** Re-encode a data URL (or blob-created URL) to the target quality preset. */
async function reencodeDataUrl(
  sourceUrl: string,
  preset: import("@models/models").ExportQualityPreset
): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) { resolve(sourceUrl); return; }
      ctx.drawImage(img, 0, 0);
      if (preset === "lossless") {
        resolve(c.toDataURL("image/png"));
      } else if (preset === "medium") {
        resolve(c.toDataURL("image/jpeg", 0.85));
      } else {
        resolve(c.toDataURL("image/jpeg", 0.65));
      }
    };
    img.onerror = () => resolve(sourceUrl);
    img.src = sourceUrl;
  });
}

export async function estimateHtmlExportSizePrecise(
  steps: CaptureStep[],
  blobMap: Map<string, Blob>,
  options: ExportOptions
): Promise<number> {
  let totalDataUriChars = 0;
  // Rough multiplier: lossless PNG ~3× JPEG size; low JPEG ~0.55× captured JPEG
  const qualityMult = options.qualityPreset === "lossless" ? 3.0
    : options.qualityPreset === "low" ? 0.55
    : 0.85;

  for (const step of steps) {
    const blob = blobMap.get(step.image.blobKey);
    if (!blob) {
      continue;
    }
    totalDataUriChars += estimateDataUriLength(blob.size * qualityMult);
  }

  const htmlFixedOverhead = 18_000 + steps.length * 900;
  return totalDataUriChars + htmlFixedOverhead;
}

export async function generateHtmlExport(
  session: CaptureSession,
  steps: CaptureStep[],
  blobMap: Map<string, Blob>,
  options: ExportOptions,
  compositeUrlMap?: Record<string, string>
): Promise<Blob> {
  const startTime = session.startTime ? new Date(session.startTime).toLocaleString() : "Unknown";
  const preset = options.qualityPreset ?? "medium";

  let stepsHtml = "";

  for (const step of steps) {
    // Use composite (annotated) data URL if available; otherwise use raw blob
    let rawUrl: string;
    const composite = compositeUrlMap?.[step.id];
    if (composite && composite.length > 0) {
      rawUrl = composite;
    } else {
      const blob = blobMap.get(step.image.blobKey);
      if (!blob) continue;
      const blobUrl = URL.createObjectURL(blob);
      rawUrl = blobUrl;
    }

    const dataUrl = await reencodeDataUrl(rawUrl, preset);
    // Revoke blob URLs created above (composite URLs are data: URIs, not blob: URLs)
    if (rawUrl.startsWith("blob:")) URL.revokeObjectURL(rawUrl);

    stepsHtml += `
      <div class="step-card">
        <div class="step-header">
          <h3>Step ${step.stepNumber}</h3>
          <p class="step-meta">${step.trigger} • ${step.image.width}×${step.image.height}</p>
        </div>
        <img src="${dataUrl}" alt="Step ${step.stepNumber}" class="step-image" onclick="openLightbox(this.src)" />
        ${step.annotation.description ? `<p class="step-description">${escapeHtml(step.annotation.description)}</p>` : ""}
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSRWeb Capture Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { margin-bottom: 20px; color: #0066cc; }
    .metadata {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 30px;
      border-left: 4px solid #0066cc;
    }
    .metadata p { margin: 8px 0; font-size: 14px; }
    .step-card { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; page-break-inside: avoid; }
    .step-header { background: #f9f9f9; padding: 15px; border-bottom: 1px solid #eee; }
    .step-header h3 { margin: 0 0 8px 0; font-size: 16px; }
    .step-meta { margin: 0; font-size: 13px; color: #666; }
    .step-image { width: 100%; max-width: 1100px; border-radius: 6px; display: block; margin: 15px auto; cursor: zoom-in; user-select: none; -webkit-user-select: none; -webkit-user-drag: none; }
    .step-description { padding: 15px; font-size: 14px; color: #555; border-top: 1px solid #eee; }
    /* Lightbox */
    #lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999; align-items: center; justify-content: center; cursor: zoom-out; user-select: none; -webkit-user-select: none; }
    #lightbox.open { display: flex; }
    #lightbox img { max-width: 95vw; max-height: 95vh; object-fit: contain; border-radius: 4px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); pointer-events: none; user-select: none; -webkit-user-select: none; -webkit-user-drag: none; draggable: false; }
    #lightbox-close { position: fixed; top: 16px; right: 20px; color: rgba(255,255,255,0.7); font-size: 32px; cursor: pointer; line-height: 1; background: none; border: none; padding: 4px 8px; user-select: none; }
    @media print {
      body { margin: 10mm; background: #fff; }
      .step-card { page-break-inside: avoid; }
      #lightbox { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PSRWeb Capture Report</h1>
    <div class="metadata">
      <p><strong>Session:</strong> ${escapeHtml(session.id)}</p>
      <p><strong>Started:</strong> ${startTime}</p>
      <p><strong>Steps:</strong> ${steps.length}</p>
    </div>
    ${stepsHtml}
  </div>
  <!-- Lightbox -->
  <div id="lightbox" role="dialog" aria-modal="true" onclick="closeLightbox()">
    <button id="lightbox-close" onclick="closeLightbox()" aria-label="Close">&#x2715;</button>
    <img id="lightbox-img" src="" alt="Full-size screenshot" draggable="false" />
  </div>
  <script>
    function openLightbox(src) {
      document.getElementById('lightbox-img').src = src;
      document.getElementById('lightbox').classList.add('open');
      document.body.style.overflow = 'hidden';
      window.getSelection && window.getSelection().removeAllRanges();
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('open');
      document.getElementById('lightbox-img').src = '';
      document.body.style.overflow = '';
    }
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });
  </script>
</body>
</html>`;

  return new Blob([html], { type: "text/html;charset=utf-8" });
}
