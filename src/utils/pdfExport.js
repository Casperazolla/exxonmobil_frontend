/**
 * pdfExport.js — Azolla ESD Platform — Professional PDF Report v3
 * Hybrid approach:
 *   - Cover, tables, KPIs: jsPDF native with professional styling
 *   - Charts: direct canvas capture (sim-g1..g4, data-chart-id attrs)
 *
 * CDN (public/index.html before </body>):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 */

// ── Page dimensions ──────────────────────────────────────────────────────
const PW = 210, PH = 297, M = 14, CW = PW - M * 2;
// Reserved whitespace at the bottom of every page, above the footer/page
// number. Nothing — table rows, charts, sections — should ever be drawn
// below (PH - BM). Change this one value to retune spacing everywhere.
const BM = 20;
const CONTENT_BOTTOM = PH - BM;

// ── Colour palette ───────────────────────────────────────────────────────
const C = {
  navy: '#1E3A5F',
  navyD: '#142841',
  blue: '#2563EB',
  slate: '#475569',
  muted: '#94A3B8',
  border: '#CBD5E1',
  light: '#F8FAFC',
  white: '#FFFFFF',
  black: '#0F172A',
  green: '#059669',
  red: '#DC2626',
  amber: '#D97706',
};

// ── Helpers ──────────────────────────────────────────────────────────────
const fmt$ = n => {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return s + '$' + Math.round(a).toLocaleString();
  return s + '$' + a.toFixed(0);
};
const fmtN = (n, d = 0) => n != null ? Number(n).toLocaleString(undefined, { maximumFractionDigits: d }) : '—';

// ── ESD technology display-name overrides ──────────────────────────────
// Add an entry here for any tech_name coming back from the API that
// should be shown under a different label in the PDF. Left side = the
// exact string currently in the data, right side = what to print instead.
// TODO: fill in the exact source names to replace with these two —
// left them as placeholders since the current values weren't specified.
const TECH_NAME_OVERRIDES = {
  'REPLACE_WITH_CURRENT_NAME_1': 'Post-Swirl Device (PBCF)',
  'REPLACE_WITH_CURRENT_NAME_2': 'Organic Rankine Cycle (E power pack)',
};
const displayTechName = (name) => TECH_NAME_OVERRIDES[name] || name;

function capChart(id) {
  try {
    const el = document.getElementById(id);
    if (!el || el.width === 0 || el.height === 0) return null;

    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = el.width;
    tempCanvas.height = el.height;
    const ctx = tempCanvas.getContext('2d');

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw original chart on top
    ctx.drawImage(el, 0, 0);

    return tempCanvas.toDataURL('image/png', 1.0);
  } catch (e) {
    console.warn('capChart failed for', id, e.message);
    return null;
  }
}
function capRef(el) {
  try {
    if (!el || el.width === 0 || el.height === 0) return null;

    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = el.width;
    tempCanvas.height = el.height;
    const ctx = tempCanvas.getContext('2d');

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw original chart on top
    ctx.drawImage(el, 0, 0);

    return tempCanvas.toDataURL('image/png', 1.0);
  } catch (e) {
    console.warn('capRef failed:', e.message);
    return null;
  }
}

// Click a tab button and wait for charts to render
// SimulationWorkspace uses className="rtab on" for active tabs
async function ensureTab(tabKey, waitMs = 800) {
  // Find the tab button — buttons have className 'rtab' and onClick sets activeTab
  const tabs = document.querySelectorAll('.rtab');
  const btn = Array.from(tabs).find(t => {
    // Match by tab key in className or text content
    const text = t.textContent.trim().toLowerCase();
    return text.includes(tabKey) ||
      (tabKey === 'cii' && (text.includes('cii') || text.includes('carbon'))) ||
      (tabKey === 'fin' && (text.includes('financial') || text.includes('finance')));
  });
  if (!btn) { console.warn('Tab not found:', tabKey); return; }
  const isActive = btn.classList.contains('on');
  if (!isActive) {
    btn.click();
    await new Promise(r => setTimeout(r, waitMs));
  } else {
    await new Promise(r => setTimeout(r, 200));
  }
}

// ── Page header ──────────────────────────────────────────────────────────
function pageHeader(p, name, imo, pg, total) {
  // Navy top bar
  p.setFillColor(C.navy);
  p.rect(0, 0, PW, 11, 'F');
  // Logo text
  p.setFontSize(7.5); p.setFont('helvetica', 'bold'); p.setTextColor(C.white);
  p.text('AZOLLA ESD PLATFORM', M, 7.5);
  // Vessel name right
  p.setFont('helvetica', 'normal'); p.setTextColor('#93C5FD');
  p.text(`${name}  -  IMO ${imo}`, PW - M, 7.5, { align: 'right' });
  // Page number bottom right
  p.setFontSize(7); p.setTextColor(C.muted);
  p.text(`${pg} / ${total}`, PW - M, PH - 5, { align: 'right' });
  // Blue accent line below header
  p.setDrawColor(C.blue); p.setLineWidth(0.4);
  p.line(M, 13, PW - M, 13);
  return 18;
}

// ── Section title ────────────────────────────────────────────────────────
function secTitle(p, text, y, color = C.navy, x = M) {
  // Left accent bar
  p.setFillColor(color);
  p.rect(x, y - 4.5, 2.5, 8, 'F');
  // Title text
  p.setFontSize(10.5); p.setFont('helvetica', 'bold'); p.setTextColor(color);
  p.text(text.toUpperCase(), x + 5, y);
  return y + 11;
}

// ── KPI card row ─────────────────────────────────────────────────────────
function kpiRow(p, items, y, x0 = M, width = CW) {
  const gap = 5;
  const cardH = 21;
  const w = (width - gap * (items.length - 1)) / items.length;
  items.forEach((k, i) => {
    const x = x0 + i * (w + gap);
    // Card background
    p.setFillColor(C.light); p.setDrawColor(C.border); p.setLineWidth(0.3);
    p.roundedRect(x, y, w, cardH, 2, 2, 'FD');
    // Left accent
    p.setFillColor(k.accent || C.navy);
    p.roundedRect(x, y, 1, cardH, 0.5, 0.5, 'F');
    // Label
    p.setFontSize(7); p.setFont('helvetica', 'normal'); p.setTextColor(C.slate);
    p.text(k.label, x + 6, y + 6.5);
    // Value
    p.setFontSize(13); p.setFont('helvetica', 'bold'); p.setTextColor(k.color || C.black);
    p.text(String(k.value || '—'), x + 6, y + 15.5);
    // Sub-label
    if (k.sub) {
      p.setFontSize(6.5); p.setFont('helvetica', 'normal'); p.setTextColor(C.muted);
      p.text(k.sub, x + w - 4, y + 15.5, { align: 'right' });
    }
  });
  return y + cardH + 7;
}

// ── Professional table ───────────────────────────────────────────────────
function table(p, heads, rows, y, ws, opts = {}) {
  const {
    rowH = 7, fontSize = 7, zebra = true, headerBg = C.navy,
    x: X = M, width: W = CW,
  } = opts;
  // Need room for the header (9mm) plus at least one data row before it's
  // worth starting the table at all — otherwise skip it entirely so it
  // doesn't get stranded as a lone header at the bottom of the page.
  if (y > CONTENT_BOTTOM - (9 + rowH)) return y;

  // Scale column widths to fit the table's own width (defaults to full CW)
  const totalW = ws.reduce((s, w) => s + w, 0);
  const cw = ws.map(w => (w / totalW) * W);

  // Header row
  p.setFillColor(headerBg);
  p.rect(X, y, W, 9, 'F');
  p.setFontSize(fontSize - 0.5); p.setFont('helvetica', 'bold');
  p.setTextColor(C.white);
  let x = X + 0.5;
  heads.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'right';
    const tx = align === 'right' ? x + cw[i] - 2 : x;
    p.text(String(h), tx, y + 6, { align });
    x += cw[i];
  });
  y += 9;

  // Body rows
  p.setFont('helvetica', 'normal'); p.setFontSize(fontSize);
  rows.forEach((row, ri) => {
    if (y + rowH > CONTENT_BOTTOM) return;
    // Zebra stripe
    if (zebra && ri % 2 === 1) {
      p.setFillColor('#F1F5F9');
      p.rect(X, y, W, rowH, 'F');
    }
    p.setTextColor(C.black);
    x = X + 0.5;
    row.forEach((cell, ci) => {
      const align = ci === 0 ? 'left' : 'right';
      const tx = align === 'right' ? x + cw[ci] - 2 : x;
      const val = String(cell ?? '—');
      p.setTextColor(C.black);
      p.text(val, tx, y + rowH - 1.7, { align });
      x += cw[ci];
    });
    y += rowH;
    // Row divider
    p.setDrawColor('#E2E8F0'); p.setLineWidth(0.1);
    p.line(X, y, X + W, y);
  });
  // Bottom border
  p.setDrawColor(C.border); p.setLineWidth(0.3);
  p.line(X, y, X + W, y);
  return y + 6;
}

// ── Info row (label · value) ─────────────────────────────────────────────
function infoRow(p, label, value, y, col2 = 52) {
  p.setFontSize(8); p.setFont('helvetica', 'normal');
  p.setTextColor(C.muted); p.text(label, M + 2, y);
  p.setTextColor(C.black); p.text(String(value || '—'), M + col2, y);
  return y + 5.5;
}

// ── Chart image ──────────────────────────────────────────────────────────
function addChart(p, img, x, y, w, h) {
  // White background to prevent transparent canvas showing as black
  p.setFillColor('#FFFFFF');
  p.rect(x, y, w, h, 'F');
  if (!img) {
    p.setFillColor(C.light); p.setDrawColor(C.border); p.setLineWidth(0.3);
    p.roundedRect(x, y, w, h, 2, 2, 'FD');
    p.setFontSize(7); p.setTextColor(C.muted); p.setFont('helvetica', 'italic');
    p.text('Visit CII / Financial tab before downloading', x + w / 2, y + h / 2 + 2, { align: 'center' });
  } else {
    p.addImage(img, 'PNG', x, y, w, h);
    p.setDrawColor(C.border); p.setLineWidth(0.2);
    p.rect(x, y, w, h);
  }
  return y + h + 3;
}

// ════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ════════════════════════════════════════════════════════════════════════


const VESSEL_IMAGE_URLS = {
  "Bochem London":
    "https://azolla-asset.s3.ap-south-1.amazonaws.com/news_charts/bochem_london_clean.png",

  "Prachi":
    "https://azolla-asset.s3.ap-south-1.amazonaws.com/news_charts/prachi_clean.png",

  "Tenjun":
    "https://azolla-asset.s3.ap-south-1.amazonaws.com/news_charts/tenjun_clean.png",
};

async function fetchImageAsDataURL(url) {
  if (!url) return null;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status}`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to load vessel image:", error);
    return null;
  }
}

export async function generateReport(opts) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert('jsPDF not loaded — add CDN to index.html'); return; }

  const { input, output, vesselName, chartRefs = {} } = opts;
  const v = input?.vessel || {};
  const vm = input?.voyage_meta || {};
  const mch = input?.machines || [];
  const esds = input?.esd_measures || [];
  const imo = v.imo_number || '';
 const name = vesselName || v.vessel_name || 'Vessel';

const vesselKey = String(name).trim().toLowerCase();

const vesselImageUrl =
  VESSEL_IMAGE_URLS[
    Object.keys(VESSEL_IMAGE_URLS).find(
      key => key.toLowerCase() === vesselKey
    )
  ];

console.log("PDF vessel name:", name);
console.log("PDF vessel image URL:", vesselImageUrl);

const vesselImageB64 = await fetchImageAsDataURL(vesselImageUrl);

console.log("PDF vessel image loaded:", !!vesselImageB64);
  const esd = output?.esd || {};
  const esdR = esd.esd_results || [];
  const cii = output?.cii || {};
  const fin = output?.financial || {};
  const fSum = fin.summary || {};
  const feu = output?.fuel_eu_penalty || {};
  const eua = output?.eua || {};
  const pen = output?.penalty_summary || {};
  const yearly = output?.fueleu_yearly_breakdown || [];
  const tl = cii.graph3_esd?.esd_timeline || [];
  const cf = fin.monthly_cashflows || [];
  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const TOTAL = 6;

  const totC = mch.reduce((s, m) => s + m.fuel_particulars.reduce((ss, f) => ss + (f.consumption_mt || 0), 0), 0);
  const totCost = mch.reduce((s, m) => s + m.fuel_particulars.reduce((ss, f) => ss + (f.consumption_mt || 0) * (f.fuel_price_usd_per_mt || 0), 0), 0);

  // Navigate to each tab, wait for Chart.js animation to complete, then capture
  const activeTab = document.querySelector('[data-tab].active, [role=tab][aria-selected=true]');
  const activeTabName = activeTab?.getAttribute('data-tab') || activeTab?.textContent?.trim();

  // CII charts — wait 800ms for Chart.js animation (default 300ms + buffer)
  await ensureTab('cii', 800);
  // Extra frame wait to ensure paint is complete
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const g1 = capChart('sim-g1');
  const g2 = capChart('sim-g2');
  const g3 = capChart('sim-g3');
  const g4 = capChart('sim-g4');

  // Financial charts
  await ensureTab('fin', 800);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const cashImg = capRef(chartRefs.cash);
  const opexImg = capRef(chartRefs.opex);
  const overviewImg = capRef(chartRefs.overview);

  // Restore original tab
  if (activeTabName) await ensureTab(activeTabName, 100);

  const p = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y;

  // ═══ PAGE 1 — COVER ═══════════════════════════════════════════════════
  // Embed logo as base64
  const LOGO_B64 = 'data:image/jpeg;base64,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';

  // ── Background: clean white with subtle left navy band ──
  p.setFillColor('#FFFFFF'); p.rect(0, 0, PW, PH, 'F');
  // Left navy accent strip (full height)
  p.setFillColor('#1B2A4A'); p.rect(0, 0, 6, PH, 'F');

  // ── Top-right: date + doc ref ──
  p.setFontSize(7); p.setFont('helvetica', 'normal'); p.setTextColor('#64748B');
  p.text('JUNE / ' + new Date().getFullYear() + '  /  REV. 00', PW - M, 14, { align: 'right' });
  p.text('DOC: AZL / ' + imo.slice(-3), PW - M, 20, { align: 'right' });

  // ── Main title block — top left ──
  const tX = 14;
  p.setFontSize(26); p.setFont('helvetica', 'bold'); p.setTextColor('#1B2A4A');
  // Spaced-caps effect via letter by letter is hard in jsPDF; use tight tracking approach
  p.text('EVALUATION OF', tX, 42);
  p.text('CARBON ABATEMENT', tX, 56);
  p.text('POTENTIAL', tX, 70);

  // ── Thin navy rule under title ──
  p.setDrawColor('#1B2A4A'); p.setLineWidth(1.5);
  p.line(tX, 76, tX + 42, 76);

const imgX = tX;
const imgY = 82;
const imgW = CW;
const imgH = 78;

// Background placeholder
p.setFillColor('#E2E8F0');
p.roundedRect(imgX, imgY, imgW, imgH, 2, 2, 'F');

// Add vessel-specific image
if (vesselImageB64) {
  try {
    p.addImage(
      vesselImageB64,
      'PNG',
      imgX,
      imgY,
      imgW,
      imgH,
      '',
      'FAST'
    );
  } catch (e) {
    console.warn('Could not add vessel image to PDF:', e);
  }
} else {
  p.setFillColor('#CBD5E1');
  p.roundedRect(imgX, imgY, imgW, imgH, 2, 2, 'D');

  p.setFontSize(8);
  p.setFont('helvetica', 'italic');
  p.setTextColor('#94A3B8');

  p.text(
    'Vessel image unavailable',
    imgX + imgW / 2,
    imgY + imgH / 2,
    { align: 'center' }
  );
}

  // ── Bottom section: vessel name left, TOC right ──
  const botY = imgY + imgH + 10;

  // Vessel name + IMO — bold, left
  p.setFontSize(17); p.setFont('helvetica', 'bold'); p.setTextColor('#1B2A4A');
  p.text('M/V ' + name, tX, botY + 4);
  p.setFontSize(11); p.setFont('helvetica', 'normal'); p.setTextColor('#334155');
  p.text('IMO No.: ' + imo, tX, botY + 13);
  p.setFontSize(8); p.setTextColor('#64748B');
  p.text((v.vessel_type || '') + '  |  ' + fmtN(v.dead_weight) + ' DWT  |  Built ' + (v.build_year || ''), tX, botY + 21);

  // Thin vertical divider between vessel name and TOC
  const divX = PW / 2 + 4;
  p.setDrawColor('#CBD5E1'); p.setLineWidth(0.3);
  p.line(divX, botY - 2, divX, PH - 22);

  // TOC — right side
  const tocX = divX + 8;
  p.setFontSize(7.5); p.setFont('helvetica', 'bold'); p.setTextColor('#1B2A4A');
  p.text('DETAILED STUDY', tocX, botY + 4);
  // Thin rule under TOC header
  p.setDrawColor('#1B2A4A'); p.setLineWidth(0.4);
  p.line(tocX, botY + 7, PW - M, botY + 7);

  const tocItems = [
    'VESSEL INFO & CONSUMPTIONS',
    'ESD PERFORMANCE SUMMARY',
    'CII STRATEGY & PROJECTIONS',
    'EU COMPLIANCE — EUA + FUELEU',
    'FINANCIAL ANALYSIS',
  ];
  p.setFontSize(7); p.setFont('helvetica', 'normal'); p.setTextColor('#475569');
  tocItems.forEach((item, i) => {
    p.text(item, tocX, botY + 14 + i * 8);
    // subtle dot-leader line
    p.setDrawColor('#E2E8F0'); p.setLineWidth(0.15);
    p.line(tocX, botY + 15 + i * 8, PW - M, botY + 15 + i * 8);
  });

  // ── Logo bottom left ──
  const logoY = PH - 24;
  try {
    p.addImage(LOGO_B64, 'JPEG', tX, logoY, 30, 15);
  } catch (e) {
    p.setFontSize(10); p.setFont('helvetica', 'bold'); p.setTextColor('#1B2A4A');
    p.text('azolla', tX, logoY + 10);
  }
  p.setFontSize(6.5); p.setFont('helvetica', 'normal'); p.setTextColor('#94A3B8');
  p.text('This report is prepared by Azolla, ' + now.split(' ').slice(-2).join(' '), tX, PH - 6);
  // Page number for the cover is stamped later by the unified footer loop,
  // so every page (including this one) shares the same "X / Y" style.

  // ═══ PAGE 2 — VESSEL + FUEL ═══════════════════════════════════════════
  p.addPage();
  y = 10;

  y = secTitle(p, 'Vessel Information', y);

  // Full vessel info as a clean 2-column table
  const vesselInfo = [
    ['Owner', v.name_of_owner || '—', 'IMO Number', imo],
    ['Vessel type', v.vessel_type || '—', 'Flag', v.flag || '—'],
    ['Built', String(v.build_year || '—'), 'Classification', v.classification_society || '—'],
    ['DWT', fmtN(v.dead_weight) + ' MT', 'Gross tonnage', fmtN(v.gross_tonnage) + ' GT'],
    ['Sailing days', vm.sailing_days_per_year + ' /YR', 'Non-sailing days', vm.non_steaming_days_per_year + ' /YR'],
    ['Distance', fmtN(vm.distance_nm) + ' NM/YR', 'EU voyage share', vm.eu_voyages_percent + '%'],
    ['EUA cost', String(vm.eua_cost_usd) + ' USD/TCO2', 'Discount rate', ((input?.discount_rate || 0.1) * 100) + '%'],
    ['Analysis start', vm.analysis_month + '/' + vm.analysis_year, 'Docking month', String(vm.docking_month || '—')],
  ];
  const hw = CW / 2;
  vesselInfo.forEach((row, ri) => {
    const bg = ri % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
    p.setFillColor(bg); p.rect(M, y, CW, 7.2, 'F');
    p.setFontSize(7.5); p.setFont('helvetica', 'normal');
    p.setTextColor(C.slate); p.text(row[0], M + 2, y + 4.8);
    p.setTextColor(C.black); p.text(String(row[1]), M + 36, y + 4.8);
    p.setTextColor(C.slate); p.text(row[2], M + hw + 2, y + 4.8);
    p.setTextColor(C.black); p.text(String(row[3]), M + hw + 36, y + 4.8);
    y += 11.2;
  });
  // Divider
  p.setDrawColor(C.border); p.setLineWidth(0.2); p.line(M, y, PW - M, y);
  y += 12;

 

  y = secTitle(p, 'Fuel Consumption', y += 10);

   y = kpiRow(p, [
    { label: 'Total fuel consumption', value: fmtN(totC, 0) + ' MT /YR', color: C.black, accent: C.navy },
    { label: 'Total fuel cost', value: fmt$(totCost) + ' /YR', color: C.amber, accent: C.amber },
    { label: 'EU compliance cost', value: fmt$(pen.total_eu_compliance_cost_usd) + ' /YR', color: C.red, accent: C.red },
    { label: 'Machines', value: String(mch.length), color: C.black, accent: C.slate },
  ], y);

  const fuelRows = mch.flatMap(m => m.fuel_particulars.map(fp => [
    m.machine_name, fp.fuel_name,
    fmtN(fp.consumption_mt, 2),
    '$' + fmtN(fp.fuel_price_usd_per_mt),
    fmt$(fp.consumption_mt * fp.fuel_price_usd_per_mt)
  ]));
  fuelRows.push(['TOTAL', '', fmtN(totC, 2), '', fmt$(totCost)]);
  y = table(p, ['Machine', 'Fuel', 'MT / YR', 'Price (USD/MT)', 'Annual cost'], fuelRows, y, [40, 20, 22, 24, 26]);
  y += 10;

  

  // Quick-read KPI cards — placed BELOW fuel consumption, at the end of the page


  // ═══ PAGE 3 — ESD PERFORMANCE ═════════════════════════════════════════
  // This page only: content starts from the extreme left (small margin)
  // instead of the standard M — every other page keeps the normal margin.
  p.addPage();
  y = 10;
  const P3X = 2;                  // extreme-left margin, page 3 only (near page edge)
  const P3W = PW - P3X - M;      // keep the normal right margin

  y = secTitle(p, 'ESD Performance Summary', y, C.navy, P3X);

  y = kpiRow(p, [
    { label: 'Total investment', value: fmt$(esd.summary?.total_cost_usd), color: C.red, accent: C.red },
    { label: 'Annual fuel savings', value: fmt$(esd.summary?.total_annual_cost_savings), color: C.green, accent: C.green },
    { label: 'CO2 reduction', value: fmtN(esd.summary?.total_co2_reduction_mt, 0) + ' MT', color: C.blue, accent: C.blue },
  ], y, P3X, P3W);

  const eRows = esdR.map((e, i) => [
    i + 1, displayTechName(e.tech_name),
    e.installation_req?.replace('_', '-') || '—',
    (e.lead_time_months || '—') + ' MO',
    (e.calculated_saving_pct?.toFixed(2) || '—') + '%',
    fmt$(e.cost_usd),
    fmt$(e.total_annual_savings_usd),
    e.payback_with_ets_years ? e.payback_with_ets_years.toFixed(1) + ' YR' : '—',
  ]);
  y = table(p, ['#', 'ESD Technology', 'Install', 'Lead', 'Eff%', 'Cost', 'Savings /YR', 'Payback'],
    eRows, y += 18, [6, 46, 15, 12, 12, 22, 22, 15], { x: P3X, width: P3W });

  if (tl.length && y < CONTENT_BOTTOM - 30) {
    y += 10; y = secTitle(p, 'Implementation Timeline', y += 8, C.navy, P3X);
    const tlRows = tl.map(t => [t.implementation_label, displayTechName(t.name), t.installation_req?.replace('_', '-'), '+' + t.saving_pct + '%']);
    y = table(p, ['Date', 'ESD', 'Type', 'Saving%'], tlRows, y += 6, [22, 68, 20, 14], { x: P3X, width: P3W });
  }

  // Payback sensitivity table — exact shape confirmed from backend
  // Structure: payback_sensitivity.fuel_type_ranges[fuelType] = prices[]
  //            payback_sensitivity.esd_sensitivity[].tech_name / payback_by_case / current_payback_with_eu
  //            payback_sensitivity.overall_payback_by_case[]
  const pbSens = esd.payback_sensitivity || null;

  if (pbSens) {
    // Extract prices from first active fuel type
    const activeFuel = (pbSens.active_fuel_types || [])[0]
      || Object.keys(pbSens.fuel_type_ranges || {})[0]
      || null;
    const pbPrices = activeFuel ? (pbSens.fuel_type_ranges[activeFuel] || []) : [];
    const esdSens = pbSens.esd_sensitivity || [];
    const pbOverall = pbSens.overall_payback_by_case || [];
    const pbCurrent = pbSens.overall_current_payback;

    if (pbPrices.length && esdSens.length && y < CONTENT_BOTTOM - 30) {
      y += 10;
      y = secTitle(p, 'Payback Period - Fuel Price Sensitivity (yrs)', y += 10, C.navy, P3X);

      // Find the index of current price in the price list to mark it
      const currPrice = activeFuel ? (pbSens.current_fuel_prices?.[activeFuel] || null) : null;
      const currIdx = currPrice != null ? pbPrices.indexOf(currPrice) : -1;

      // Build headers: #, ESD, price1, price2..., Current
      const sensHeaders = ['#', 'ESD Technology',
        ...pbPrices.map((pr, i) => (i === currIdx ? '*$' + pr : '$' + pr)),
        'Current'];

      // Build ESD rows
      const sensRows = esdSens.map((e, i) => [
        i + 1,
        displayTechName(e.tech_name) || '?',
        ...(e.payback_by_case || []).map(pb => pb != null ? Number(pb).toFixed(1) : '-'),
        e.current_payback_with_eu != null ? Number(e.current_payback_with_eu).toFixed(1) : '-',
      ]);

      // Overall row at bottom
      if (pbOverall.length) {
        sensRows.push([
          '', 'Overall (Investment / Savings)',
          ...pbOverall.map(pb => pb != null ? Number(pb).toFixed(1) : '-'),
          pbCurrent != null ? Number(pbCurrent).toFixed(1) : '-',
        ]);
      }

      // Column widths: 13 price cols + Current = 14 numeric cols
      // P3W is the widened (extreme-left) content width for this page
      const nameW = 40;
      const numCols = pbPrices.length + 1;  // +1 for Current column
      const colW = Math.max(7, Math.floor((P3W - 6 - nameW) / numCols));
      const sensWidths = [6, nameW, ...Array(numCols).fill(colW)];

      y = table(p, sensHeaders, sensRows, y += 10, sensWidths, { fontSize: 5.5, rowH: 5, x: P3X, width: P3W });
    }
  }


  // ═══ PAGE 4 — CII STRATEGY (GRAPHS ONLY — NO HEADER) ══════════════════
  p.addPage();
  y = 10;

  // Section heading
  y = secTitle(p, 'CII Strategy', y);
  y += 2;

  // Layout:
  //   Row 1 (top):    G1 Baseline  ||  G3 ESD Rollout   — side by side, narrower height
  //   Row 2 (middle): G2 Sailing Scenarios               — full width, taller
  //   Row 3 (bottom): G4 Sailing + ESD Combined          — full width, taller
  //
  // Available height after heading: 297 - 26 = 271mm
  // Row1: label(5) + chart(65) = 70mm
  // Row2: label(5) + chart(80) = 85mm
  // Row3: label(5) + chart(80) = 85mm
  // Gaps: 3+3 = 6mm   Total: 70+85+85+6 = 246mm ✓

  const colGap = 5;
  const halfW = (CW - colGap) / 2;
  const colR = M + halfW + colGap;

  // ── Row 1: G1 (left) || G3 (right) ──────────────────────────────────
  p.setFontSize(6.5); p.setFont('helvetica', 'bold'); p.setTextColor(C.slate);
  p.text('Graph 1 — Baseline CII', M, y + 4);
  p.text('Graph 3 — ESD Rollout (monthly)', colR, y + 4);
  y += 7;
  addChart(p, g1, M, y, halfW, 65);
  addChart(p, g3, colR, y, halfW, 65);
  y += 65 + 8;

  // ── Row 2: G2 full width ─────────────────────────────────────────────
  p.setFontSize(6.5); p.setFont('helvetica', 'bold'); p.setTextColor(C.slate);
  p.text('Graph 2 — Sailing Scenarios', M, y + 4);
  y += 7;
  addChart(p, g2, M, y, CW, 80);
  y += 80 + 8;

  // ── Row 3: G4 full width ─────────────────────────────────────────────
  p.setFontSize(6.5); p.setFont('helvetica', 'bold'); p.setTextColor(C.slate);
  p.text('Graph 4 — Sailing + ESD Combined', M, y + 4);
  y += 7;
  addChart(p, g4, M, y, CW, 80);



  // ═══ PAGE 5 — EU COMPLIANCE ═══════════════════════════════════════════
  p.addPage();
  y = 10;
  y = secTitle(p, 'EU Compliance — EUA + FuelEU', y);

  y = kpiRow(p, [
    { label: 'Total EU compliance', value: fmt$(pen.total_eu_compliance_cost_usd) + ' /YR', color: C.red, accent: C.red },
    { label: 'EUA cost', value: fmt$(eua.total_eua_cost_usd) + ' /YR', color: C.amber, accent: C.amber },
    { label: 'FuelEU penalty', value: fmt$(feu.penalty_usd) + ' /YR', color: feu.compliant ? C.green : C.red, accent: C.navy },
  ], y += 10);

  // GHG intensity as clean table
  y = table(p,
    ['GHG Metric', 'Value (gCO2eq/MJ)', 'FuelEU Target', 'Status'],
    [
      ['WTT (Well-to-Tank)', feu.ghg_intensity_wtt?.toFixed(4) || '—', '', ''],
      ['TTW (Tank-to-Wake)', feu.ghg_intensity_ttw?.toFixed(4) || '—', '', ''],
      ['Total GHG intensity', feu.ghg_intensity_total?.toFixed(4) || '—', feu.ghg_target?.toFixed(4) || '—', feu.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'],
    ],
    y += 10, [55, 40, 40, 37]
  );
  y += 11;

  y = secTitle(p, 'Year-by-Year Projection', y += 10);
  const yrRows = yearly.map(r => [
    r.year, r.active_months + ' MO',
    r.target?.toFixed(2), r.vessel_ghg?.toFixed(4),
    r.vessel_excess > 0 ? '+' + r.vessel_excess?.toFixed(4) : '0',
    fmt$(r.vessel_fueleu_penalty_usd), fmt$(r.vessel_eua_cost_usd),
    fmt$(r.esd_fuel_savings_usd), fmt$(r.esd_eua_savings_usd), fmt$(r.esd_fueleu_savings_usd),
  ]);
  y = table(p, ['Year', 'MO', 'Target', 'GHG', 'Excess', 'FuelEU', 'EUA', 'ESD Fuel', 'ESD EUA', 'ESD FEU'],
    yrRows, y += 10, [12, 10, 16, 18, 16, 20, 20, 20, 18, 18], { fontSize: 6.5, rowH: 5.5 });

  // ═══ PAGE 6 — FINANCIALS ══════════════════════════════════════════════
  p.addPage();
  y = 10;
  y = secTitle(p, 'Financial Analysis', y += 6);

  y = kpiRow(p, [
    { label: 'NPV', value: fmt$(fSum.npv_usd), color: fSum.npv_usd >= 0 ? C.green : C.red, accent: fSum.npv_usd >= 0 ? C.green : C.red },
    { label: 'Savings PV', value: fmt$(fSum.savings_pv_usd), color: C.blue, accent: C.blue },
    { label: 'Payback', value: fSum.payback_years ? fSum.payback_years.toFixed(1) + ' YRS' : '—', color: C.black, accent: C.navy },
  ], y += 10);
  y = kpiRow(p, [
    { label: 'IRR', value: fSum.irr_pct ? fSum.irr_pct.toFixed(1) + '%' : '—', color: C.blue, accent: C.blue },
    { label: 'Investment', value: fmt$(fSum.total_investment_usd), color: C.red, accent: C.red },
    { label: 'Accum. savings', value: fmt$(fSum.accumulated_savings_usd), color: C.green, accent: C.green },
  ], y - 3);
  y += 8;

  // Financial charts — larger now that header is removed, more breathing room
  const fH = 58;
  if (opexImg && y + 4 + fH <= CONTENT_BOTTOM) {
    p.setFontSize(7); p.setFont('helvetica', 'bold'); p.setTextColor(C.slate);
    p.text('Yearly savings breakdown', M, y); y += 4;
    y = addChart(p, opexImg, M, y, CW, fH, '');
    y += 6;
  }
  if ((cashImg || overviewImg) && y + 4 + fH <= CONTENT_BOTTOM) {
    p.setFontSize(7); p.setFont('helvetica', 'bold'); p.setTextColor(C.slate);
    if (cashImg) p.text('Accumulated cashflow', M, y);
    if (overviewImg) p.text('Investment overview', M + halfW + 6, y);
    y += 4;
    if (cashImg) addChart(p, cashImg, M, y, halfW, fH, '');
    if (overviewImg) addChart(p, overviewImg, M + halfW + 6, y, halfW, fH, '');
    y += fH + 10;
  }

  // ── Page numbers ─────────────────────────────────────────────────────
  // Stamped last, over every physical page (including the cover), so the
  // count and style are always correct and consistent across all pages.
  const totalPages = p.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    p.setPage(i);
    p.setFontSize(7); p.setFont('helvetica', 'normal'); p.setTextColor(C.muted);
    p.text(`${i} / ${totalPages}`, PW - M, PH - 5, { align: 'right' });
  }

  p.save(opts.filename || `${name}_ESD_Report.pdf`);
}