/**
 * pdfExport.js — Azolla ESD Report PDF Generator
 * Captures LIVE chart canvases + builds data tables using jsPDF native drawing.
 * No html2canvas dependency for data pages — only for chart capture.
 *
 * CDN (public/index.html):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 */
 
const PW=210, PH=297, M=14, CW=PW-M*2, CH=PH-M*2;
const GREEN='#1D9E75', DARK='#0f3d2e', RED='#DC2626', GRAY='#888888', BLACK='#1a1a1a', LIGHT='#f8f9fa';
 
// ── helpers ──
const fmt$ = n => { if(n==null||isNaN(n)) return '—'; const a=Math.abs(n); if(a>=1e6) return (n<0?'-':'')+'$'+(a/1e6).toFixed(1)+'M'; if(a>=1e3) return (n<0?'-':'')+'$'+Math.round(a).toLocaleString(); return (n<0?'-':'')+'$'+a.toFixed(0); };
const fmtN = (n,d=0) => n!=null ? Number(n).toLocaleString(undefined,{maximumFractionDigits:d}) : '—';

// ── SAFE image capture ──────────────────────────────────────────────
// Chart.js canvases that live inside a currently-hidden tab pane
// (display:none) can end up with 0 width/height, or with stale/unpainted
// pixel data. Calling canvas.toDataURL() on those produces malformed PNG
// bytes that crash jsPDF's addImage(). To guard against that we:
//   1. Prefer the Chart.js instance's own toBase64Image() when available
//      (it reads the chart's internal render state, which is more
//      reliable than grabbing the raw <canvas> element).
//   2. Verify the canvas actually has non-zero pixel dimensions first.
//   3. Wrap everything in try/catch and return null on any failure so a
//      single bad chart can't take down the whole report.
function safeImageFromCanvas(canvas) {
  if (!canvas) return null;
  try {
    if (!canvas.width || !canvas.height) return null; // 0×0 → guaranteed corrupt/empty

    // Prefer Chart.js's own export — more reliable than raw canvas.toDataURL()
    if (window.Chart && typeof window.Chart.getChart === 'function') {
      const inst = window.Chart.getChart(canvas);
      if (inst && typeof inst.toBase64Image === 'function') {
        const img = inst.toBase64Image('image/png', 1);
        if (img && img.length > 100) return img; // sanity check — not an empty/near-empty data URI
      }
    }

    const raw = canvas.toDataURL('image/png');
    if (raw && raw.length > 100) return raw;
    return null;
  } catch (e) {
    console.warn('[pdfExport] Skipping unreadable chart canvas:', e);
    return null;
  }
}

function capCanvas(id) { return safeImageFromCanvas(document.getElementById(id)); }
function capRef(el) { return safeImageFromCanvas(el); }

// Safe wrapper around jsPDF addImage — never throws, just skips on failure
function safeAddImage(p, img, x, y, w, h) {
  if (!img) return false;
  try {
    p.addImage(img, 'PNG', x, y, w, h);
    return true;
  } catch (e) {
    console.warn('[pdfExport] Skipping image that failed to embed:', e);
    return false;
  }
}
 
function hdr(p, name, imo, pg) {
  p.setFontSize(8); p.setFont('helvetica','bold'); p.setTextColor(GREEN);
  p.text('Azolla ESD Platform', M, 8);
  p.setFont('helvetica','normal'); p.setTextColor(GRAY);
  p.text(`${name} · IMO ${imo}`, PW-M, 8, {align:'right'});
  p.setDrawColor(GREEN); p.setLineWidth(0.6); p.line(M,10.5,PW-M,10.5);
  p.setFontSize(7); p.setTextColor('#ccc'); p.text(`Page ${pg}`, PW-M, PH-5, {align:'right'});
  return 16;
}
 
function secTitle(p, text, y) {
  p.setFontSize(11); p.setFont('helvetica','bold'); p.setTextColor(BLACK); p.text(text, M, y);
  p.setDrawColor('#e0e0e0'); p.setLineWidth(0.3); p.line(M, y+2, PW-M, y+2);
  return y+7;
}
 
function kpiBox(p, label, value, color, x, y, w=58) {
  p.setFillColor(LIGHT); p.roundedRect(x, y, w, 15, 2, 2, 'F');
  p.setFontSize(7); p.setFont('helvetica','normal'); p.setTextColor(GRAY); p.text(label, x+3, y+5);
  p.setFontSize(12); p.setFont('helvetica','bold'); p.setTextColor(color||BLACK); p.text(String(value), x+3, y+12);
  p.setFont('helvetica','normal');
}
 
function infoRow(p, label, value, y, labelX=M+2, valX=M+50) {
  p.setFontSize(8); p.setFont('helvetica','normal'); p.setTextColor(GRAY); p.text(label, labelX, y);
  p.setTextColor(BLACK); p.text(String(value||'—'), valX, y);
  return y+5;
}
 
function tbl(p, heads, rows, y, ws) {
  const sc = CW / ws.reduce((s,w)=>s+w,0);
  const cw = ws.map(w=>w*sc);
  // header bg
  p.setFillColor('#f0f0f0'); p.rect(M, y-3.5, CW, 6, 'F');
  p.setFontSize(6.5); p.setFont('helvetica','bold'); p.setTextColor('#666');
  let x=M+1.5;
  heads.forEach((h,i) => { p.text(String(h), i===0?x:x+cw[i]-2, y, {align:i===0?'left':'right'}); x+=cw[i]; });
  y+=4.5;
  // rows
  p.setFont('helvetica','normal'); p.setFontSize(6.5);
  for(const row of rows) {
    if(y>PH-16) break;
    p.setTextColor('#333'); x=M+1.5;
    row.forEach((c,i) => { p.text(String(c??'—'), i===0?x:x+cw[i]-2, y, {align:i===0?'left':'right'}); x+=cw[i]; });
    y+=3.8;
    p.setDrawColor('#eee'); p.setLineWidth(0.1); p.line(M,y-1.2,PW-M,y-1.2);
  }
  return y+2;
}
 
function addChart(p, img, x, y, w, h) {
  if(!img) return y;
  const ok = safeAddImage(p, img, x, y, w, h);
  return ok ? y+h+3 : y;
}
 
/**
 * Generate the full 6-page PDF report
 * @param {Object} opts
 * @param {Object} opts.input   — simulation input (vessel, voyage_meta, machines, esd_measures)
 * @param {Object} opts.output  — simulation output (esd, cii, financial, fuel_eu, eua, etc)
 * @param {string} opts.vesselName
 * @param {Object} opts.chartRefs — { cash: canvasEl, opex: canvasEl, overview: canvasEl }
 */
export async function generateReport(opts) {
  const { jsPDF } = window.jspdf;
  if(!jsPDF) { alert('jsPDF not loaded. Add CDN script to index.html'); return; }
 
  const { input, output, vesselName } = opts;
  const chartRefs = opts.chartRefs || {};
  const v=input?.vessel||{}, vm=input?.voyage_meta||{}, machines=input?.machines||[];
  const imo=v.imo_number||'', name=vesselName||v.vessel_name||'Vessel';
  const esd=output?.esd||{}, esdR=esd.esd_results||[];
  const cii=output?.cii||{}, fin=output?.financial||{}, fSum=fin.summary||{};
  const feu=output?.fuel_eu_penalty||{}, eua=output?.eua||{};
  const pen=output?.penalty_summary||{};
  const yearly=output?.fueleu_yearly_breakdown||[];
  const tl=cii.graph3_esd?.esd_timeline||[];
  const cf=fin.monthly_cashflows||[];
  const now=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
 
  const p = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  let y;
 
  // ═══════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════
  p.setFillColor(DARK); p.rect(0,0,PW,PH*0.65,'F');
  p.setFillColor(GREEN); p.rect(0,PH*0.65,PW,PH*0.35,'F');
  p.setTextColor('#fff');
  p.setFontSize(28); p.setFont('helvetica','bold'); p.text('ESD Investment Report', PW/2, 85, {align:'center'});
  p.setFontSize(11); p.setFont('helvetica','normal'); p.text('Decarbonisation Suite — Energy Saving Device Analysis', PW/2, 96, {align:'center'});
  p.setDrawColor('#ffffff44'); p.setLineWidth(0.5); p.roundedRect(PW/2-42, 110, 84, 16, 3, 3, 'S');
  p.setFontSize(16); p.setFont('helvetica','bold'); p.text(name, PW/2, 121, {align:'center'});
  p.setFontSize(9); p.setFont('helvetica','normal'); p.setTextColor('#ffffffbb');
  const meta = `${v.vessel_type||''} · IMO ${imo} · ${fmtN(v.dead_weight)} DWT · Built ${v.build_year} · ${v.classification_society||''}`;
  p.text(meta, PW/2, 140, {align:'center'});
  p.text(`Owner: ${v.name_of_owner||'—'} · Flag: ${v.flag||'—'}`, PW/2, 148, {align:'center'});
  p.text(`Report: ${now} · Analysis: ${vm.analysis_month}/${vm.analysis_year}`, PW/2, 156, {align:'center'});
 
  // ═══════════════════════════════════════════════════════════════
  // PAGE 2 — VESSEL + FUEL
  // ═══════════════════════════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,2);
  y = secTitle(p, 'Vessel Information', y);
  y = infoRow(p,'Owner',v.name_of_owner,y);
  y = infoRow(p,'Type / Flag',`${v.vessel_type} · ${v.flag}`,y);
  y = infoRow(p,'DWT / GT',`${fmtN(v.dead_weight)} / ${fmtN(v.gross_tonnage)}`,y);
  y = infoRow(p,'Sailing days',`${vm.sailing_days_per_year}/yr (${vm.non_steaming_days_per_year} non-sailing)`,y);
  y = infoRow(p,'Distance',`${fmtN(vm.distance_nm)} nm/yr`,y);
  y = infoRow(p,'EU voyage share',`${vm.eu_voyages_percent}%`,y);
  y = infoRow(p,'EUA cost',`$${vm.eua_cost_usd}/t`,y);
  y = infoRow(p,'Discount rate',`${(input?.discount_rate||0.1)*100}%`,y);
  y += 6;
  y = secTitle(p, 'Fuel Consumption', y);
  const fuelR = machines.flatMap(m=>m.fuel_particulars.map(fp=>[m.machine_name,fp.fuel_name,fmtN(fp.consumption_mt,2),'$'+fmtN(fp.fuel_price_usd_per_mt),fmt$(fp.consumption_mt*fp.fuel_price_usd_per_mt)]));
  const totC = machines.reduce((s,m)=>s+m.fuel_particulars.reduce((ss,fp)=>ss+(fp.consumption_mt||0),0),0);
  const totCost = machines.reduce((s,m)=>s+m.fuel_particulars.reduce((ss,fp)=>ss+(fp.consumption_mt||0)*(fp.fuel_price_usd_per_mt||0),0),0);
  fuelR.push(['Total','',fmtN(totC,2),'',fmt$(totCost)]);
  y = tbl(p,['Machine','Fuel','MT/yr','Price','Annual cost'],fuelR,y,[38,20,25,18,30]);
 
  // ═══════════════════════════════════════════════════════════════
  // PAGE 3 — ESD PROFILING
  // ═══════════════════════════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,3);
  y = secTitle(p, 'ESD Performance', y);
  kpiBox(p,'Total investment',fmt$(esd.summary?.total_cost_usd),RED,M,y);
  kpiBox(p,'Annual savings',fmt$(esd.summary?.total_annual_cost_savings),'#059669',M+62,y);
  kpiBox(p,'CO₂ reduction',fmtN(esd.summary?.total_co2_reduction_mt,0)+' MT',BLACK,M+124,y);
  y += 22;
  const eR = esdR.map((e,i)=>[i+1,e.tech_name,e.installation_req?.replace('_','-')||'—',(e.calculated_saving_pct?.toFixed(2)||'—')+'%',fmtN(e.total_fuel_savings_mt,1),fmt$(e.cost_usd),fmt$(e.total_annual_savings_usd),e.payback_with_ets_years?e.payback_with_ets_years.toFixed(1)+'yr':'—']);
  y = tbl(p,['#','ESD','Install','Eff%','Fuel MT','Cost','Total$/yr','Payback'],eR,y,[7,44,16,13,17,22,22,15]);
  y += 4;
  y = secTitle(p, 'ESD Implementation Timeline', y);
  const tlR = tl.map(t=>[t.implementation_label,t.name,t.installation_req?.replace('_','-'),'+'+t.saving_pct+'%']);
  y = tbl(p,['Date','ESD','Type','Saving'],tlR,y,[22,60,20,18]);
 
  // ═══════════════════════════════════════════════════════════════
  // PAGE 4 — CII CHARTS
  // ═══════════════════════════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,4);
  y = secTitle(p, 'CII Strategy', y);
  const g1=capCanvas('sim-g1'), g3=capCanvas('sim-g3'), g2=capCanvas('sim-g2'), g4=capCanvas('sim-g4');
  const cH=55, halfW=CW/2-3;
  // Row 1: G1 + G3 side by side
  if(g1||g3) {
    if(g1) { p.setFontSize(7); p.setTextColor(GRAY); p.text('Graph 1 — Baseline CII',M,y); safeAddImage(p,g1,M,y+2,halfW,cH); }
    if(g3) { p.setFontSize(7); p.setTextColor(GRAY); p.text('Graph 3 — ESD Rollout',M+halfW+6,y); safeAddImage(p,g3,M+halfW+6,y+2,halfW,cH); }
    y += cH+8;
  }
  // Row 2: G2 full width
  if(g2) { p.setFontSize(7); p.setTextColor(GRAY); p.text('Graph 2 — Sailing Scenarios',M,y); y+=2; safeAddImage(p,g2,M,y,CW,cH+5); y+=cH+10; }
  // Row 3: G4 full width
  if(g4) { p.setFontSize(7); p.setTextColor(GRAY); p.text('Graph 4 — Combined (Sailing + ESD)',M,y); y+=2; safeAddImage(p,g4,M,y,CW,cH+5); y+=cH+10; }
  if(!g1 && !g2 && !g3 && !g4) {
    p.setFontSize(8); p.setTextColor(GRAY);
    p.text('CII charts were unavailable at export time — open the CII Strategy tab and try again.', M, y);
    y += 8;
  }
 
  // ═══════════════════════════════════════════════════════════════
  // PAGE 5 — EU COMPLIANCE
  // ═══════════════════════════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,5);
  y = secTitle(p, 'EU Compliance — EUA + FuelEU', y);
  kpiBox(p,'EU compliance cost',fmt$(pen.total_eu_compliance_cost_usd)+'/yr',RED,M,y);
  kpiBox(p,'EUA cost',fmt$(eua.total_eua_cost_usd)+'/yr',BLACK,M+62,y);
  kpiBox(p,'FuelEU penalty',fmt$(feu.penalty_usd)+'/yr',BLACK,M+124,y);
  y += 22;
  // GHG info
  y = infoRow(p,'GHG WTT',(feu.ghg_intensity_wtt?.toFixed(4)||'—')+' gCO₂/MJ',y);
  y = infoRow(p,'GHG TTW',(feu.ghg_intensity_ttw?.toFixed(4)||'—')+' gCO₂/MJ',y);
  y = infoRow(p,'GHG Total',(feu.ghg_intensity_total?.toFixed(4)||'—')+' gCO₂/MJ',y);
  y = infoRow(p,'Target '+(vm.analysis_year||''),(feu.ghg_target?.toFixed(4)||'—')+' gCO₂/MJ',y);
  y = infoRow(p,'Status',feu.compliant?'Compliant':'NON-COMPLIANT',y);
  y += 6;
  y = secTitle(p, 'Year-by-Year Projection', y);
  const yrR = yearly.map(r=>[r.year,r.active_months+'mo',r.target?.toFixed(2),fmt$(r.vessel_fueleu_penalty_usd),fmt$(r.vessel_eua_cost_usd),fmt$(r.esd_fuel_savings_usd),fmt$(r.esd_eua_savings_usd),fmt$(r.esd_fueleu_savings_usd)]);
  y = tbl(p,['Year','Mo','Target','FuelEU','EUA cost','Fuel saved','EUA saved','FuelEU saved'],yrR,y,[13,10,16,22,22,22,22,22]);
 
  // ═══════════════════════════════════════════════════════════════
  // PAGE 6 — FINANCIALS + CHARTS
  // ═══════════════════════════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,6);
  y = secTitle(p, 'Financial Analysis', y);
  kpiBox(p,'NPV',fmt$(fSum.npv_usd),fSum.npv_usd>=0?'#059669':RED,M,y);
  kpiBox(p,'Savings PV',fmt$(fSum.savings_pv_usd),BLACK,M+62,y);
  kpiBox(p,'Payback',fSum.payback_years?fSum.payback_years.toFixed(1)+' yrs':'—',BLACK,M+124,y);
  y += 18;
  kpiBox(p,'IRR',fSum.irr_pct?fSum.irr_pct.toFixed(1)+'%':'—',BLACK,M,y);
  kpiBox(p,'Investment',fmt$(fSum.total_investment_usd),RED,M+62,y);
  kpiBox(p,'Accum. savings',fmt$(fSum.accumulated_savings_usd),'#059669',M+124,y);
  y += 22;
 
  // Financial charts
  const cashImg=capRef(chartRefs.cash), opexImg=capRef(chartRefs.opex), overviewImg=capRef(chartRefs.overview);
  const fH=48;
  if(opexImg) { p.setFontSize(7); p.setTextColor(GRAY); p.text('Yearly Savings',M,y); y+=2; safeAddImage(p,opexImg,M,y,CW,fH); y+=fH+5; }
  if(cashImg||overviewImg) {
    if(cashImg) { p.setFontSize(7); p.setTextColor(GRAY); p.text('Accumulated Cashflow',M,y); safeAddImage(p,cashImg,M,y+2,halfW,fH); }
    if(overviewImg) { p.setFontSize(7); p.setTextColor(GRAY); p.text('Investment Overview',M+halfW+6,y); safeAddImage(p,overviewImg,M+halfW+6,y+2,halfW,fH); }
    y+=fH+8;
  }
  if(!opexImg && !cashImg && !overviewImg) {
    p.setFontSize(8); p.setTextColor(GRAY);
    p.text('Financial charts were unavailable at export time — open the Financial tab and try again.', M, y);
    y += 8;
  }
 
  // Compact cashflow table
  if(cf.length>0 && y<PH-40) {
    y = secTitle(p, 'Monthly Cashflow', y);
    const show = cf.length<=15 ? cf : [...cf.slice(0,10),...cf.slice(-3)];
    const cfR = show.map(r=>[r.date,r.investment>0?'-'+fmt$(r.investment):'—',r.fuel_savings>0?fmt$(r.fuel_savings):'—',fmt$(r.net_cashflow),fmt$(r.cumulative_cashflow)]);
    y = tbl(p,['Date','Invest','Fuel $','Net','Cumulative'],cfR,y,[22,30,30,30,30]);
  }
 
  p.save(opts.filename || `${name}_ESD_Report.pdf`);
}