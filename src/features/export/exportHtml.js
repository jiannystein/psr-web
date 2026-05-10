/**
 * HTML Export - Generates self-contained HTML reports with embedded images
 */
function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, (c) => map[c]);
}
function estimateDataUriLength(byteSize) {
    const base64Length = Math.ceil((byteSize / 3) * 4);
    const dataUriPrefix = "data:image/jpeg;base64,".length;
    return dataUriPrefix + base64Length;
}
export async function estimateHtmlExportSizePrecise(steps, blobMap, _options) {
    let totalDataUriChars = 0;
    for (const step of steps) {
        const blob = blobMap.get(step.image.blobKey);
        if (!blob) {
            continue;
        }
        totalDataUriChars += estimateDataUriLength(blob.size);
    }
    const htmlFixedOverhead = 18_000 + steps.length * 900;
    return totalDataUriChars + htmlFixedOverhead;
}
export async function generateHtmlExport(session, steps, blobMap, _options) {
    const startTime = session.startTime ? new Date(session.startTime).toLocaleString() : "Unknown";
    let stepsHtml = "";
    for (const step of steps) {
        const blob = blobMap.get(step.image.blobKey);
        if (!blob) {
            continue;
        }
        const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
        stepsHtml += `
      <div class="step-card">
        <div class="step-header">
          <h3>Step ${step.stepNumber}</h3>
          <p class="step-meta">${step.trigger} • ${step.image.width}×${step.image.height}</p>
        </div>
        <img src="${dataUrl}" alt="Step ${step.stepNumber}" class="step-image" />
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
    .step-image { width: 100%; max-width: 1100px; border-radius: 6px; display: block; margin: 15px auto; }
    .step-description { padding: 15px; font-size: 14px; color: #555; border-top: 1px solid #eee; }
    @media print {
      body { margin: 10mm; background: #fff; }
      .step-card { page-break-inside: avoid; }
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
</body>
</html>`;
    return new Blob([html], { type: "text/html;charset=utf-8" });
}
