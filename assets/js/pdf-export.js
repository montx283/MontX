/*
 * MontX PDF export: use the browser's native print engine instead of html2pdf/html2canvas.
 * The user selects "Save as PDF" in the print dialog. This avoids canvas rendering,
 * cross-origin CDN dependencies and blank-canvas failures.
 */
(()=>{'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeName=value=>String(value||'MontX_Report').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim()||'MontX_Report';

  function buildDocument({filename,title,subtitle='',content='',footer='MontX Construction Management',showHeader=true}={}){
    const docTitle=safeName(filename||title||'MontX_Report');
    const header=showHeader?`
      <header class="report-header">
        <div class="brand-kicker">MONTX · CONSTRUCTION MANAGEMENT</div>
        <h1>${esc(title||'Report')}</h1>
        ${subtitle?`<p class="report-subtitle">${esc(subtitle)}</p>`:''}
      </header>`:'';
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(docTitle)}</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#1f2937;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-size:11px;line-height:1.45}
  .screen-note{max-width:190mm;margin:14px auto;padding:10px 13px;border:1px solid #c7d2fe;border-radius:8px;background:#eef2ff;color:#3730a3;font-size:12px}
  /* A4-safe content width: never allow report blocks to run to the physical page edge. */
  .paper{width:100%;max-width:188mm;margin:0 auto;padding:0 1mm;background:#fff;min-width:0}
  .report-content{width:100%;max-width:100%;min-width:0;overflow-wrap:anywhere}
  .report-header{padding-bottom:14px;margin-bottom:18px;border-bottom:1px solid #e5e7eb;max-width:100%}
  .brand-kicker{font-size:9px;letter-spacing:1.8px;font-weight:700;color:#64748b;margin-bottom:6px}
  h1{font-size:23px;line-height:1.2;margin:0;color:#172033;font-weight:800}
  .report-subtitle{font-size:10px;color:#64748b;margin:7px 0 0}
  .report-content table{width:100%!important;max-width:100%!important;table-layout:fixed;border-collapse:collapse;page-break-inside:auto}
  .report-content th,.report-content td{max-width:100%;overflow-wrap:anywhere;word-break:normal;hyphens:auto;padding:6px 5px!important;font-size:9px!important;}
  .report-content th{vertical-align:bottom}
  .report-content td{vertical-align:top}
  .report-content .statement-head{display:flex!important;gap:10px!important;align-items:flex-start}.report-content .statement-meta{flex:1 1 0;min-width:0!important}.report-content .statement-net{flex:0 0 32%;max-width:32%}
  .report-content .statement-net{min-width:0!important;text-align:right;overflow-wrap:anywhere}
  .report-content .statement-net-amount{font-size:clamp(16px,2.6vw,24px)!important;white-space:normal!important;overflow-wrap:anywhere}
  .report-content .summary-cards{display:flex!important;gap:7px!important}
  .report-content .summary-card{flex:1 1 0!important;min-width:0!important;padding:10px 6px!important}
  .report-content .summary-card-amount{font-size:clamp(13px,2vw,18px)!important;white-space:normal!important;overflow-wrap:anywhere}
  .report-content .expense-register-table th:nth-child(1),.report-content .expense-register-table td:nth-child(1){width:9%}
  .report-content .expense-register-table th:nth-child(2),.report-content .expense-register-table td:nth-child(2){width:8%}
  .report-content .expense-register-table th:nth-child(3),.report-content .expense-register-table td:nth-child(3){width:12%}
  .report-content .expense-register-table th:nth-child(4),.report-content .expense-register-table td:nth-child(4){width:12%}
  .report-content .expense-register-table th:nth-child(5),.report-content .expense-register-table td:nth-child(5){width:21%}
  .report-content .expense-register-table th:nth-child(6),.report-content .expense-register-table td:nth-child(6){width:14%}
  .report-content .expense-register-table th:nth-child(7),.report-content .expense-register-table td:nth-child(7){width:10%}
  .report-content .expense-register-table th:nth-child(8),.report-content .expense-register-table td:nth-child(8){width:14%}
  .report-content .project-site-table th:nth-child(1),.report-content .project-site-table td:nth-child(1){width:30%}
  .report-content .project-site-table th:not(:first-child),.report-content .project-site-table td:not(:first-child){width:17.5%}
  .report-content .project-detail-table th:nth-child(1),.report-content .project-detail-table td:nth-child(1){width:10%}
  .report-content .project-detail-table th:nth-child(2),.report-content .project-detail-table td:nth-child(2){width:12%}
  .report-content .project-detail-table th:nth-child(3),.report-content .project-detail-table td:nth-child(3){width:14%}
  .report-content .project-detail-table th:nth-child(4),.report-content .project-detail-table td:nth-child(4){width:17%}
  .report-content .project-detail-table th:nth-child(5),.report-content .project-detail-table td:nth-child(5){width:29%}
  .report-content .project-detail-table th:nth-child(6),.report-content .project-detail-table td:nth-child(6){width:18%}
  thead{display:table-header-group}
  tfoot{display:table-footer-group}
  tr,th,td{break-inside:avoid;page-break-inside:avoid}
  h2,h3,h4{break-after:avoid-page;page-break-after:avoid}
  .report-footer{border-top:1px solid #e5e7eb;margin-top:22px;padding-top:9px;display:flex;justify-content:space-between;gap:12px;color:#94a3b8;font-size:9px;max-width:100%}
  .screen-note strong{font-weight:700}
  .print-now{margin-left:10px;padding:7px 12px;border:0;border-radius:6px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer}
  @page{size:A4 portrait;margin:6mm}
  @media print{
    html,body{width:100%!important;min-width:0!important;margin:0!important;padding:0!important;background:#fff!important}
    .screen-note{display:none!important}
    /* Keep the 188mm cap even when the browser print dialog is set to zero margins. */
    .paper{width:100%!important;max-width:188mm!important;margin:0 auto!important;padding:0 1mm!important;min-width:0!important}
    .report-content{width:100%!important;max-width:100%!important;min-width:0!important}
    a{color:inherit;text-decoration:none}
  }
  @media screen{
    body{background:#eef2f7;padding:18px}
    .paper{min-height:260mm;padding:16mm;background:#fff;box-shadow:0 4px 24px rgba(15,23,42,.12)}
  }
</style></head><body>
  <div class="screen-note"><strong>PDF ready.</strong> In the print dialog choose <strong>Save as PDF</strong> as the destination, then click Save. Paper size: A4. If the print dialog did not open, use this button or press Ctrl+P. <button class="print-now" id="printNow" type="button">Print / Save PDF</button></div>
  <main class="paper">${header}<section class="report-content">${content||'<p>No report details were supplied.</p>'}</section>
    <footer class="report-footer"><span>${esc(footer)}</span><span>Generated on ${esc(new Date().toLocaleDateString('en-IN'))}</span></footer>
  </main>
  <script>document.getElementById("printNow").addEventListener("click",()=>window.print());<\/script>
</body></html>`;
  }

  function download(options={}){
    // Open synchronously during the original button click to avoid popup blockers.
    const printWindow=window.open('about:blank','_blank');
    if(!printWindow){
      alert('MontX could not open the PDF print window. Please allow pop-ups for this site (127.0.0.1) and click the PDF button again.');
      return false;
    }
    try{
      const html=buildDocument(options);
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      let started=false;
      const beginPrint=()=>{
        if(started||printWindow.closed)return;
        started=true;
        printWindow.focus();
        // Give the browser one layout frame before opening its native print dialog.
        printWindow.requestAnimationFrame(()=>printWindow.requestAnimationFrame(()=>{
          try{printWindow.print();}
          catch(error){console.error('MontX native print failed:',error);alert('The print dialog could not be opened. Use Ctrl+P in the new report tab.');}
        }));
      };
      if(printWindow.document.readyState==='complete')setTimeout(beginPrint,150);
      else printWindow.addEventListener('load',()=>setTimeout(beginPrint,150),{once:true});
      // Safety fallback for browsers that do not fire the about:blank load event after document.write.
      setTimeout(()=>{if(!started&&!printWindow.closed)beginPrint();},700);
      return true;
    }catch(error){
      console.error('MontX print export failed:',error);
      try{printWindow.close()}catch{}
      alert(`MontX could not prepare the PDF report: ${error?.message||'Unknown error'}. Please try again.`);
      return false;
    }
  }

  window.MontXPdf={download,escapeHtml:esc,buildDocument};
})();
