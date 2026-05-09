import{f as d,a as b,b as f}from"./main-Db6yAf8M.js";import"./tailwind-C59vVb2m.js";function h(e){return new Promise((r,i)=>{const t=new FileReader;t.onload=()=>r(String(t.result)),t.onerror=()=>i(t.error),t.readAsDataURL(e)})}function o(e){return e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}async function g(e,r){if(!r||r==="medium")return e;const i=await createImageBitmap(e),t=document.createElement("canvas");t.width=i.width,t.height=i.height;const n=t.getContext("2d");if(!n)return e;n.drawImage(i,0,0),i.close();const l=r==="lossless"?"image/png":"image/jpeg",s=r==="low"?.55:void 0;return await new Promise(a=>t.toBlob(a,l,s))??e}function x(e,r){const i=`data:${r};base64,`,t=Math.ceil(e/3)*4;return i.length+t}async function w(e,r,i){let t=0;for(const l of e){const s=r.get(l.image.blobKey);if(!s)continue;const m=await g(s,i.qualityPreset),a=m.type||"image/jpeg";t+=x(m.size,a)}const n=18e3+e.length*900;return t+n}async function $(e,r,i,t){const n=[];for(const a of r){const c=i.get(a.image.blobKey);if(!c)continue;const v=await g(c,t.qualityPreset),u=await h(v),p=d(a.capturedAt);n.push(`
      <section class="step-card">
        <div class="step-header">
          <h2>Step ${a.stepNumber}</h2>
          <div class="timestamp-block">
            <div>${o(p.isoUtc)}</div>
            <div>${o(p.localTime)}</div>
          </div>
        </div>
        <div class="meta-grid">
          <div class="meta-card">
            <div class="meta-label">Action</div>
            <div>${o(b(a.triggerType))}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Resolution</div>
            <div>${o(f(a.image.width,a.image.height))}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Cursor</div>
            <div>${a.cursor.xPx}, ${a.cursor.yPx}</div>
          </div>
        </div>
        <p><strong>Description:</strong> ${o(a.annotation.description||"")}</p>
        <img class="zoomable" alt="Step ${a.stepNumber}" src="${u}" />
      </section>
    `)}const l=d(e.startedAt),s=e.endedAt?d(e.endedAt):null,m=`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PSRWeb Report ${o(e.id)}</title>
    <style>
      body { font-family: Segoe UI, Arial, sans-serif; margin: 24px; color: #111; background: #fafafa; }
      h1, h2 { margin: 0 0 8px; }
      .metadata { margin-bottom: 24px; }
      .step-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 20px; break-inside: avoid; background: #fff; }
      .step-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .timestamp-block { text-align: right; font-size: 12px; color: #5a6472; }
      .meta-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin: 12px 0; }
      .meta-card { border: 1px solid #e6e8eb; border-radius: 8px; padding: 10px; background: #f8f9fb; }
      .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #667085; margin-bottom: 4px; }
      img { width: 100%; max-width: 1100px; border-radius: 6px; border: 1px solid #eee; cursor: zoom-in; }
      .zoom-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(10, 14, 23, 0.86); z-index: 9999; }
      .zoom-overlay.open { display: flex; }
      .zoom-overlay img { max-width: 92vw; max-height: 92vh; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 12px 42px rgba(0,0,0,0.4); cursor: zoom-out; }
      .hint { font-size: 12px; color: #5a6472; margin-top: 8px; }
      @media print {
        body { margin: 10mm; background: #fff; }
        .step-card { page-break-inside: avoid; }
        .zoom-overlay { display: none !important; }
      }
    </style>
  </head>
  <body>
    <h1>PSRWeb Capture Report</h1>
    <div class="metadata">
      <p><strong>Session:</strong> ${o(e.id)}</p>
      <p><strong>Started:</strong> ${o(l.isoUtc)} | ${o(l.localTime)}</p>
      <p><strong>Ended:</strong> ${s?`${o(s.isoUtc)} | ${o(s.localTime)}`:"-"}</p>
      <p><strong>Source:</strong> ${o(e.sourceType)}</p>
      <p><strong>Total steps:</strong> ${e.totalSteps}</p>
      <p><strong>Export quality:</strong> ${o(t.qualityPreset??"medium")}</p>
      <p class="hint">Click any image to zoom. Use the mouse wheel to zoom in or out. Click again to close.</p>
    </div>
    ${n.join(`
`)}
    <div class="zoom-overlay" id="zoomOverlay">
      <img alt="Zoomed export screenshot" id="zoomImage" />
    </div>
    <script>
      (() => {
        const overlay = document.getElementById('zoomOverlay');
        const zoomImage = document.getElementById('zoomImage');
        let scale = 1;
        document.querySelectorAll('img.zoomable').forEach((img) => {
          img.addEventListener('click', () => {
            if (overlay.classList.contains('open')) {
              overlay.classList.remove('open');
              scale = 1;
              zoomImage.style.transform = 'scale(1)';
              return;
            }
            zoomImage.src = img.src;
            overlay.classList.add('open');
            scale = 1;
            zoomImage.style.transform = 'scale(1)';
          });
        });
        overlay.addEventListener('click', () => {
          overlay.classList.remove('open');
          scale = 1;
          zoomImage.style.transform = 'scale(1)';
        });
        overlay.addEventListener('wheel', (event) => {
          event.preventDefault();
          scale += (-event.deltaY * 0.0015);
          scale = Math.max(1, Math.min(6, Number(scale.toFixed(2))));
          zoomImage.style.transform = 'scale(' + scale + ')';
        }, { passive: false });
      })();
    <\/script>
  </body>
</html>`;return new Blob([m],{type:"text/html;charset=utf-8"})}export{w as estimateHtmlExportSizePrecise,$ as generateHtmlExport};
