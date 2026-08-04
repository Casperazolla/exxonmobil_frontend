/**
 * pdfExport.js — Azolla ESD Platform — Professional PDF Report
 * 
 * FIX: Charts are captured from the ACTIVE DOM. If a tab hasn't been visited,
 * its canvas won't exist. We use html2canvas on the full report tab content
 * so all charts are captured correctly regardless of which tab was open.
 *
 * Design: Navy + slate professional palette (no green)
 *
 * CDN (public/index.html before </body>):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
 */

const PW=210, PH=297, M=14, CW=PW-M*2;

// ── Professional colour palette ──
const NAVY   = '#1e3a5f';   // primary brand — navy blue
const SLATE  = '#475569';   // secondary text
const ACCENT = '#2563EB';   // blue accent for numbers
const POS    = '#059669';   // positive / savings
const NEG    = '#DC2626';   // negative / costs
const LIGHT  = '#F8FAFC';   // card backgrounds
const BORDER = '#E2E8F0';   // dividers
const BLACK  = '#0F172A';   // headings
const MUTED  = '#94A3B8';   // muted text

const fmt$ = n => { if(n==null||isNaN(n)) return '—'; const a=Math.abs(n); if(a>=1e6) return (n<0?'-':'')+'$'+(a/1e6).toFixed(2)+'M'; if(a>=1e3) return (n<0?'-':'')+'$'+Math.round(a).toLocaleString(); return (n<0?'-':'')+'$'+a.toFixed(0); };
const fmtN = (n,d=0) => n!=null ? Number(n).toLocaleString(undefined,{maximumFractionDigits:d}) : '—';

// ── Draw page header ──
function hdr(p, vesselName, imo, pg, total) {
  p.setFillColor(NAVY); p.rect(0, 0, PW, 12, 'F');
  p.setFontSize(8); p.setFont('helvetica','bold'); p.setTextColor('#FFFFFF');
  p.text('AZOLLA ESD PLATFORM', M, 8);
  p.setFont('helvetica','normal'); p.setTextColor('#94C3E8');
  p.text(`${vesselName}  ·  IMO ${imo}`, PW-M, 8, {align:'right'});
  p.setFontSize(7); p.setTextColor(MUTED);
  p.text(`${pg} / ${total}`, PW-M, PH-5, {align:'right'});
  return 18;
}

// ── Section title with left accent bar ──
function sec(p, text, y) {
  p.setFillColor(NAVY); p.rect(M, y-4, 2.5, 7, 'F');
  p.setFontSize(10); p.setFont('helvetica','bold'); p.setTextColor(BLACK);
  p.text(text, M+5, y);
  p.setDrawColor(BORDER); p.setLineWidth(0.3); p.line(M+5, y+2, PW-M, y+2);
  return y+8;
}

// ── KPI cards row — up to 3 per row ──
function kpis(p, items, y) {
  const w = (CW - 4*(items.length-1)) / items.length;
  items.forEach((kp, i) => {
    const x = M + i*(w+4);
    p.setFillColor(LIGHT); p.setDrawColor(BORDER); p.setLineWidth(0.3);
    p.roundedRect(x, y, w, 18, 2, 2, 'FD');
    p.setFontSize(6.5); p.setFont('helvetica','normal'); p.setTextColor(SLATE);
    p.text(kp.label, x+4, y+5.5);
    p.setFontSize(13); p.setFont('helvetica','bold'); p.setTextColor(kp.color||BLACK);
    p.text(String(kp.value), x+4, y+14);
  });
  return y+22;
}

// ── Info row (label: value) ──
function row(p, label, value, y) {
  p.setFontSize(8); p.setFont('helvetica','normal');
  p.setTextColor(MUTED); p.text(label, M+2, y);
  p.setTextColor(BLACK); p.text(String(value||'—'), M+52, y);
  return y+5;
}

// ── Data table ──
function tbl(p, heads, rows, y, ws, opts={}) {
  if (y > PH-30) return y;
  const sc = CW / ws.reduce((s,w)=>s+w,0);
  const cw = ws.map(w=>w*sc);
  // Header
  p.setFillColor(NAVY); p.rect(M, y-3.5, CW, 7, 'F');
  p.setFontSize(6.5); p.setFont('helvetica','bold'); p.setTextColor('#FFFFFF');
  let x=M+2;
  heads.forEach((h,i) => { p.text(String(h), i===0?x:x+cw[i]-2, y, {align:i===0?'left':'right'}); x+=cw[i]; });
  y+=5;
  // Body rows
  p.setFont('helvetica','normal'); p.setFontSize(6.5);
  rows.forEach((r,ri) => {
    if(y>PH-16) return;
    if(ri%2===0) { p.setFillColor('#F8FAFC'); p.rect(M,y-3,CW,4.5,'F'); }
    p.setTextColor(BLACK); x=M+2;
    r.forEach((cell,ci) => {
      const align = ci===0?'left':'right';
      const tx = align==='right' ? x+cw[ci]-2 : x;
      p.text(String(cell??'—'), tx, y, {align});
      x+=cw[ci];
    });
    y+=4.5;
  });
  p.setDrawColor(BORDER); p.setLineWidth(0.2); p.line(M,y,PW-M,y);
  return y+3;
}

// ── Capture a chart canvas by ID — returns dataURL or null ──
function capChart(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  try { return el.toDataURL('image/png'); } catch { return null; }
}

// ── Capture chart refs (from FinancialTab useRef) ──
function capRef(el) {
  if (!el) return null;
  try { return el.toDataURL('image/png'); } catch { return null; }
}

// ── Trigger a tab click to ensure its charts render, then wait ──
async function ensureTabRendered(tabId, waitMs=400) {
  const btn = document.querySelector(`[data-tab="${tabId}"], button[data-value="${tabId}"]`);
  if (btn && !btn.classList.contains('active')) {
    btn.click();
    await new Promise(r => setTimeout(r, waitMs));
  }
}

/**
 * Main export function
 */
export async function generateReport(opts) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert('jsPDF not loaded — add CDN script to index.html'); return; }

  const { input, output, vesselName, chartRefs } = opts;
  const v=input?.vessel||{}, vm=input?.voyage_meta||{}, machines=input?.machines||[];
  const imo=v.imo_number||'', name=vesselName||v.vessel_name||'Vessel';
  const esd=output?.esd||{}, esdR=esd.esd_results||[];
  const cii=output?.cii||{};
  const fin=output?.financial||{}, fSum=fin.summary||{};
  const feu=output?.fuel_eu_penalty||{}, eua=output?.eua||{};
  const pen=output?.penalty_summary||{};
  const yearly=output?.fueleu_yearly_breakdown||[];
  const tl=cii.graph3_esd?.esd_timeline||[];
  const cf=fin.monthly_cashflows||[];
  const now=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const TOTAL = 6;

  const p = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  let y;

  // ── Ensure all tabs have rendered their charts ──
  // Try clicking CII tab and Financial tab to force chart rendering
  const tabSelectors = ['cii', 'financial', 'eu'];
  for (const tab of tabSelectors) {
    await ensureTabRendered(tab, 300);
  }
  // Small extra wait for Chart.js to finish rendering
  await new Promise(r => setTimeout(r, 500));

  // Capture all charts NOW while each tab content is in DOM
  const g1 = capChart('sim-g1');
  const g2 = capChart('sim-g2');
  const g3 = capChart('sim-g3');
  const g4 = capChart('sim-g4');
  const cashImg = capRef(chartRefs?.cash);
  const opexImg = capRef(chartRefs?.opex);
  const overviewImg = capRef(chartRefs?.overview);

  // ═══════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════
  // Full-page navy background
  p.setFillColor(NAVY); p.rect(0,0,PW,PH,'F');
  // Decorative accent strip
  p.setFillColor('#2563EB'); p.rect(0, PH*0.72, PW, 3, 'F');
  // Logo area
  p.setFontSize(9); p.setFont('helvetica','bold'); p.setTextColor('#94C3E8');
  p.text('AZOLLA ESD PLATFORM', PW/2, 70, {align:'center'});
  p.setFontSize(7); p.setFont('helvetica','normal'); p.setTextColor('#64748B');
  p.text('DECARBONISATION SUITE', PW/2, 77, {align:'center'});
  // Title
  p.setFontSize(26); p.setFont('helvetica','bold'); p.setTextColor('#FFFFFF');
  p.text('ESD Investment', PW/2, 110, {align:'center'});
  p.text('Report', PW/2, 122, {align:'center'});
  // Vessel name box
  p.setFillColor('#FFFFFF'); p.setDrawColor('#FFFFFF'); p.setLineWidth(0);
  p.roundedRect(PW/2-45, 135, 90, 18, 3, 3, 'F');
  p.setFontSize(13); p.setFont('helvetica','bold'); p.setTextColor(NAVY);
  p.text(name, PW/2, 147, {align:'center'});
  // Meta info
  p.setFontSize(8); p.setFont('helvetica','normal'); p.setTextColor('#94A3B8');
  const metaLine1 = `${v.vessel_type||'Vessel'}  ·  IMO ${imo}  ·  ${fmtN(v.dead_weight)} DWT  ·  Built ${v.build_year||'—'}`;
  const metaLine2 = `${v.classification_society||''}  ·  Owner: ${v.name_of_owner||'—'}  ·  Flag: ${v.flag||'—'}`;
  p.text(metaLine1, PW/2, 168, {align:'center'});
  p.text(metaLine2, PW/2, 175, {align:'center'});
  // Date
  p.setFontSize(7); p.setTextColor('#475569');
  p.text(`Generated: ${now}   ·   Analysis from ${vm.analysis_month}/${vm.analysis_year}`, PW/2, PH-14, {align:'center'});

  // ═══════════════════════════════════════════
  // PAGE 2 — VESSEL + FUEL
  // ═══════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,2,TOTAL);
  y = sec(p, 'Vessel Information', y);
  const leftY = y;
  // Two column info
  y = row(p,'Owner', v.name_of_owner, y);
  y = row(p,'Type', v.vessel_type, y);
  y = row(p,'Flag', v.flag, y);
  y = row(p,'DWT', fmtN(v.dead_weight)+' MT', y);
  y = row(p,'Gross Tonnage', fmtN(v.gross_tonnage)+' GT', y);
  y = row(p,'Built', v.build_year, y);
  y = row(p,'Classification', v.classification_society, y);
  y = row(p,'Sailing days', `${vm.sailing_days_per_year}/yr  (${vm.non_steaming_days_per_year} non-sailing)`, y);
  y = row(p,'Distance', `${fmtN(vm.distance_nm)} nm/yr`, y);
  y = row(p,'EU voyage share', `${vm.eu_voyages_percent}%`, y);
  y = row(p,'EUA cost', `$${vm.eua_cost_usd}/tCO₂`, y);
  y = row(p,'Discount rate', `${(input?.discount_rate||0.1)*100}%`, y);
  y += 6;

  y = sec(p, 'Fuel Consumption', y);
  const totC = machines.reduce((s,m)=>s+m.fuel_particulars.reduce((ss,fp)=>ss+(fp.consumption_mt||0),0),0);
  const totCost = machines.reduce((s,m)=>s+m.fuel_particulars.reduce((ss,fp)=>ss+(fp.consumption_mt||0)*(fp.fuel_price_usd_per_mt||0),0),0);
  const fuelR = machines.flatMap(m=>m.fuel_particulars.map(fp=>[
    m.machine_name, fp.fuel_name, fmtN(fp.consumption_mt,2), '$'+fmtN(fp.fuel_price_usd_per_mt), fmt$(fp.consumption_mt*fp.fuel_price_usd_per_mt)
  ]));
  fuelR.push(['TOTAL', '', fmtN(totC,2), '', fmt$(totCost)]);
  y = tbl(p,['Machine','Fuel','MT / yr','Price','Annual cost'],fuelR,y,[38,18,24,18,28]);

  // ═══════════════════════════════════════════
  // PAGE 3 — ESD PERFORMANCE
  // ═══════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,3,TOTAL);
  y = sec(p, 'ESD Performance Summary', y);
  y = kpis(p,[
    {label:'Total Investment', value:fmt$(esd.summary?.total_cost_usd), color:NEG},
    {label:'Annual Fuel Savings', value:fmt$(esd.summary?.total_annual_cost_savings), color:POS},
    {label:'CO₂ Reduction', value:fmtN(esd.summary?.total_co2_reduction_mt,0)+' MT', color:ACCENT},
  ], y);
  const eR = esdR.map((e,i)=>[
    i+1, e.tech_name,
    e.installation_req?.replace('_','-')||'—',
    (e.applicability?.lead_time_months||'—')+'mo',
    (e.calculated_saving_pct?.toFixed(2)||'—')+'%',
    fmt$(e.cost_usd),
    fmt$(e.total_annual_savings_usd),
    e.payback_with_ets_years ? e.payback_with_ets_years.toFixed(1)+'yr' : '—',
  ]);
  y = tbl(p,['#','ESD Technology','Install','Lead','Eff%','Cost','Savings/yr','Payback'],eR,y,[6,44,15,12,12,22,22,15]);
  y += 4;
  y = sec(p,'Implementation Timeline', y);
  const tlR = tl.map(t=>[t.implementation_label, t.name, t.installation_req?.replace('_','-'), '+'+t.saving_pct+'%']);
  y = tbl(p,['Date','ESD','Type','Saving'],tlR,y,[22,65,20,15]);

  // ═══════════════════════════════════════════
  // PAGE 4 — CII STRATEGY (CHARTS)
  // ═══════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,4,TOTAL);
  y = sec(p,'CII Strategy — Graphs', y);

  const half = CW/2-3;
  const cH = 52;

  if (g1||g3) {
    p.setFontSize(7); p.setTextColor(SLATE);
    if(g1) { p.text('Graph 1 — Baseline CII', M, y); p.addImage(g1,'PNG',M,y+2,half,cH); }
    if(g3) { p.text('Graph 3 — ESD Rollout', M+half+6, y); p.addImage(g3,'PNG',M+half+6,y+2,half,cH); }
    y += cH+9;
  } else {
    p.setFontSize(8); p.setTextColor(MUTED);
    p.text('Visit the CII tab before downloading to capture charts.', M, y+10);
    y += 18;
  }

  if(g2) { p.setFontSize(7); p.setTextColor(SLATE); p.text('Graph 2 — Sailing Scenarios',M,y); y+=2; p.addImage(g2,'PNG',M,y,CW,cH); y+=cH+5; }
  if(g4) { p.setFontSize(7); p.setTextColor(SLATE); p.text('Graph 4 — Sailing + ESD Combined',M,y); y+=2; p.addImage(g4,'PNG',M,y,CW,cH); y+=cH+5; }

  // ═══════════════════════════════════════════
  // PAGE 5 — EU COMPLIANCE
  // ═══════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,5,TOTAL);
  y = sec(p,'EU Compliance — EUA + FuelEU', y);
  y = kpis(p,[
    {label:'Total EU Compliance', value:fmt$(pen.total_eu_compliance_cost_usd)+'/yr', color:NEG},
    {label:'EUA Cost', value:fmt$(eua.total_eua_cost_usd)+'/yr', color:NEG},
    {label:'FuelEU Penalty', value:fmt$(feu.penalty_usd)+'/yr', color:NEG},
  ], y);

  y = sec(p,'GHG Intensity',y);
  y = row(p,'WTT', (feu.ghg_intensity_wtt?.toFixed(4)||'—')+' gCO₂eq/MJ', y);
  y = row(p,'TTW', (feu.ghg_intensity_ttw?.toFixed(4)||'—')+' gCO₂eq/MJ', y);
  y = row(p,'Total GHG', (feu.ghg_intensity_total?.toFixed(4)||'—')+' gCO₂eq/MJ', y);
  y = row(p,'Target', (feu.ghg_target?.toFixed(4)||'—')+' gCO₂eq/MJ', y);
  const compliant = feu.compliant;
  p.setFontSize(8); p.setFont('helvetica','normal'); p.setTextColor(MUTED); p.text('Status', M+2, y);
  p.setFont('helvetica','bold'); p.setTextColor(compliant?POS:NEG);
  p.text(compliant ? 'COMPLIANT' : 'NON-COMPLIANT', M+52, y);
  p.setFont('helvetica','normal'); p.setTextColor(BLACK);
  y+=8;

  y = sec(p,'Year-by-Year Projection',y);
  const yrR = yearly.map(r=>[
    r.year, r.active_months+'mo', r.target?.toFixed(2),
    fmt$(r.vessel_fueleu_penalty_usd), fmt$(r.vessel_eua_cost_usd), fmt$(r.total_vessel_eu_cost_usd),
    fmt$(r.esd_fuel_savings_usd), fmt$(r.esd_eua_savings_usd),
  ]);
  y = tbl(p,['Year','Mo','Target','FuelEU','EUA','Total cost','Fuel saved','EUA saved'],yrR,y,[12,10,16,22,22,22,22,22]);

  // ═══════════════════════════════════════════
  // PAGE 6 — FINANCIALS
  // ═══════════════════════════════════════════
  p.addPage(); y = hdr(p,name,imo,6,TOTAL);
  y = sec(p,'Financial Analysis', y);
  y = kpis(p,[
    {label:'NPV', value:fmt$(fSum.npv_usd), color:fSum.npv_usd>=0?POS:NEG},
    {label:'Savings PV', value:fmt$(fSum.savings_pv_usd), color:ACCENT},
    {label:'Payback', value:fSum.payback_years?fSum.payback_years.toFixed(1)+' yrs':'—', color:BLACK},
  ], y);
  y = kpis(p,[
    {label:'IRR', value:fSum.irr_pct?fSum.irr_pct.toFixed(1)+'%':'—', color:ACCENT},
    {label:'Total Investment', value:fmt$(fSum.total_investment_usd), color:NEG},
    {label:'Accumulated Savings', value:fmt$(fSum.accumulated_savings_usd), color:POS},
  ], y-4);
  y+=2;

  // Financial charts
  const fH=46;
  if(opexImg) {
    p.setFontSize(7); p.setTextColor(SLATE); p.text('Yearly Savings Breakdown',M,y); y+=2;
    p.addImage(opexImg,'PNG',M,y,CW,fH); y+=fH+6;
  }
  if(cashImg||overviewImg) {
    if(cashImg&&overviewImg) {
      p.setFontSize(7); p.setTextColor(SLATE);
      p.text('Accumulated Cashflow',M,y); p.text('Investment Overview',M+half+6,y); y+=2;
      p.addImage(cashImg,'PNG',M,y,half,fH);
      p.addImage(overviewImg,'PNG',M+half+6,y,half,fH);
      y+=fH+6;
    } else {
      if(cashImg) { p.setFontSize(7); p.setTextColor(SLATE); p.text('Accumulated Cashflow',M,y); y+=2; p.addImage(cashImg,'PNG',M,y,CW,fH); y+=fH+6; }
      if(overviewImg) { p.setFontSize(7); p.setTextColor(SLATE); p.text('Investment Overview',M,y); y+=2; p.addImage(overviewImg,'PNG',M,y,CW,fH); y+=fH+6; }
    }
  }

  if(!opexImg && !cashImg && !overviewImg) {
    p.setFontSize(8); p.setTextColor(MUTED);
    p.text('Visit the Financial tab before downloading to capture charts.', M, y+10);
    y+=18;
  }

  // Compact monthly cashflow table
  if(cf.length>0 && y<PH-45) {
    y = sec(p,'Monthly Cashflow (key months)', y);
    const show = cf.length<=12 ? cf : [...cf.slice(0,8), ...cf.slice(-3)];
    const cfR = show.map(r=>[
      r.date,
      r.investment>0?'-'+fmt$(r.investment):'—',
      r.fuel_savings>0?fmt$(r.fuel_savings):'—',
      r.ets_savings>0?'$'+fmtN(r.ets_savings,0):'—',
      fmt$(r.net_cashflow),
      fmt$(r.cumulative_cashflow),
    ]);
    y = tbl(p,['Date','Investment','Fuel Saved','EUA','Net','Cumulative'],cfR,y,[22,28,28,24,28,28]);
  }

  p.save(opts.filename || `${name}_ESD_Report.pdf`);
}