/**
 * PdfReport.js — Hidden PDF-ready report layout
 * Renders all 6 pages of the ESD Investment Report.
 * Captured by html2canvas + jsPDF via pdfExport.js utility.
 *
 * Props:
 *   out        — full simulation output (output from API)
 *   input      — simulation input (vessel, voyage_meta, machines, esd_measures)
 *   vesselName — string
 *   vesselImage— URL string (optional, from S3 or local)
 *
 * This component renders off-screen (display:none) until PDF export triggers.
 * All styles are inline to ensure html2canvas captures them.
 */

import React from 'react';

const fmt$ = (n) => {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n < 0 ? '-' : '') + '$' + Math.round(abs).toLocaleString();
  return (n < 0 ? '-' : '') + '$' + abs.toFixed(2);
};

const fmtN = (n, d = 0) => n != null ? Number(n).toLocaleString(undefined, { maximumFractionDigits: d }) : '—';

const S = {
  page: { width: 760, minHeight: 1040, padding: '40px 44px', background: '#fff', fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", fontSize: 11, color: '#1a1a1a', boxSizing: 'border-box', pageBreakAfter: 'always', position: 'relative' },
  cover: { width: 760, minHeight: 1040, background: 'linear-gradient(135deg, #0f3d2e 0%, #1D9E75 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff', padding: 60, boxSizing: 'border-box' },
  hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1.5px solid #1D9E75', marginBottom: 20, fontSize: 10, color: '#666' },
  secTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: '18px 0 10px', paddingBottom: 6, borderBottom: '1px solid #e5e5e5' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  kpi: { background: '#f8f9fa', borderRadius: 6, padding: '8px 10px' },
  kpiL: { fontSize: 9, color: '#888', marginBottom: 3 },
  kpiV: { fontSize: 17, fontWeight: 600 },
  tbl: { width: '100%', borderCollapse: 'collapse', fontSize: 10 },
  th: { textAlign: 'left', padding: '5px 6px', color: '#888', fontWeight: 500, borderBottom: '1px solid #ddd', fontSize: 9 },
  thR: { textAlign: 'right', padding: '5px 6px', color: '#888', fontWeight: 500, borderBottom: '1px solid #ddd', fontSize: 9 },
  td: { padding: '4px 6px', borderBottom: '0.5px solid #eee' },
  tdR: { padding: '4px 6px', borderBottom: '0.5px solid #eee', textAlign: 'right' },
  badge: (color) => ({ display: 'inline-block', fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 500, background: color === 'green' ? '#dcfce7' : color === 'red' ? '#fee2e2' : '#dbeafe', color: color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : '#1e40af' }),
  footer: { position: 'absolute', bottom: 16, right: 20, fontSize: 9, color: '#bbb' },
};

const Header = ({ vesselName, imo }) => (
  <div style={S.hdr}>
    <div><span style={{ color: '#1D9E75', fontWeight: 600 }}>🚢 Azolla ESD Platform</span> <span style={{ color: '#bbb' }}>· Decarbonisation Suite</span></div>
    <div>{vesselName} · IMO {imo}</div>
  </div>
);

const Footer = ({ page }) => <div style={S.footer}>Page {page}</div>;

export default function PdfReport({ out, input, vesselName, vesselImage }) {
  if (!out || !input) return null;

  const v = input.vessel || {};
  const vm = input.voyage_meta || {};
  const machines = input.machines || [];
  const esds = input.esd_measures || [];
  const imo = v.imo_number || '';

  const fuel = out.fuel_summary || {};
  const esd = out.esd || {};
  const esdResults = esd.esd_results || [];
  const sensitivity = out.payback_sensitivity || {};
  const cii = out.cii || {};
  const fin = out.financial || {};
  const finSum = fin.summary || {};
  const feu = out.fuel_eu_penalty || {};
  const eua = out.eua || {};
  const penalty = out.penalty_summary || {};
  const yearly = out.fueleu_yearly_breakdown || [];
  const timeline = cii.graph3_esd?.esd_timeline || [];
  const cashflows = fin.monthly_cashflows || [];

  const totalConsumption = machines.reduce((s, m) => s + m.fuel_particulars.reduce((ss, fp) => ss + (fp.consumption_mt || 0), 0), 0);
  const totalFuelCost = machines.reduce((s, m) => s + m.fuel_particulars.reduce((ss, fp) => ss + (fp.consumption_mt || 0) * (fp.fuel_price_usd_per_mt || 0), 0), 0);
  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div id="pdf-report-container" style={{ display: 'none', position: 'absolute', left: '-9999px', top: 0 }}>

      {/* ═══════ PAGE 1: COVER ═══════ */}
      <div className="pdf-page" style={S.cover}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.9 }}>🚢</div>
        <div style={{ fontSize: 32, fontWeight: 600 }}>ESD investment report</div>
        <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>Decarbonisation suite — Energy saving device analysis</div>
        <div style={{ fontSize: 20, fontWeight: 500, marginTop: 32, padding: '10px 28px', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8 }}>
          {vesselName || v.vessel_name}
        </div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 28, lineHeight: 1.8 }}>
          {v.vessel_type?.charAt(0).toUpperCase() + v.vessel_type?.slice(1)} · IMO {imo} · {fmtN(v.dead_weight)} DWT · Built {v.build_year} · {v.classification_society}
          <br />Owner: {v.name_of_owner} · Flag: {v.flag}
          <br />Report generated: {now}
          <br />Analysis period: {vm.analysis_month}/{vm.analysis_year} – {input.vessel_end_month || 12}/{input.vessel_end_year || (vm.analysis_year + (input.vessel_life_years || 25))}
        </div>
      </div>

      {/* ═══════ PAGE 2: VESSEL INFO + FUEL ═══════ */}
      <div className="pdf-page" style={S.page}>
        <Header vesselName={vesselName || v.vessel_name} imo={imo} />
        <div style={S.secTitle}>Vessel information</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {vesselImage ? (
            <img src={vesselImage} alt="Vessel" style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 6, border: '0.5px solid #ddd' }} />
          ) : (
            <div style={{ width: 140, height: 100, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 32 }}>🚢</div>
          )}
          <table style={{ ...S.tbl, flex: 1 }}>
            <tbody>
              <tr><td style={{ ...S.td, color: '#888', width: 130 }}>Owner</td><td style={S.td}>{v.name_of_owner}</td></tr>
              <tr><td style={{ ...S.td, color: '#888' }}>Type / Flag</td><td style={S.td}>{v.vessel_type} · {v.flag}</td></tr>
              <tr><td style={{ ...S.td, color: '#888' }}>DWT / GT</td><td style={S.td}>{fmtN(v.dead_weight)} / {fmtN(v.gross_tonnage)}</td></tr>
              <tr><td style={{ ...S.td, color: '#888' }}>Sailing days</td><td style={S.td}>{vm.sailing_days_per_year}/yr ({vm.non_steaming_days_per_year} non-sailing)</td></tr>
              <tr><td style={{ ...S.td, color: '#888' }}>Distance</td><td style={S.td}>{fmtN(vm.distance_nm)} nm/yr</td></tr>
              <tr><td style={{ ...S.td, color: '#888' }}>EU voyage share</td><td style={S.td}>{vm.eu_voyages_percent}%</td></tr>
              <tr><td style={{ ...S.td, color: '#888' }}>EUA cost</td><td style={S.td}>${vm.eua_cost_usd}/t</td></tr>
            </tbody>
          </table>
        </div>

        <div style={S.secTitle}>Fuel consumption</div>
        <table style={S.tbl}>
          <thead>
            <tr><th style={S.th}>Machine</th><th style={S.th}>Fuel</th><th style={S.thR}>Consumption (MT/yr)</th><th style={S.thR}>Price (USD/MT)</th><th style={S.thR}>Annual cost</th></tr>
          </thead>
          <tbody>
            {machines.map((m, i) => m.fuel_particulars.map((fp, j) => (
              <tr key={`${i}-${j}`}>
                <td style={S.td}>{m.machine_name}</td>
                <td style={S.td}><span style={S.badge('green')}>{fp.fuel_name}</span></td>
                <td style={S.tdR}>{fmtN(fp.consumption_mt, 2)}</td>
                <td style={S.tdR}>${fmtN(fp.fuel_price_usd_per_mt)}</td>
                <td style={S.tdR}>{fmt$(fp.consumption_mt * fp.fuel_price_usd_per_mt)}</td>
              </tr>
            )))}
            <tr style={{ fontWeight: 600, borderTop: '1.5px solid #333' }}>
              <td style={S.td} colSpan={2}>Total</td>
              <td style={S.tdR}>{fmtN(totalConsumption, 2)}</td>
              <td style={S.tdR}></td>
              <td style={S.tdR}>{fmt$(totalFuelCost)}</td>
            </tr>
          </tbody>
        </table>
        <Footer page={2} />
      </div>

      {/* ═══════ PAGE 3: ESD PROFILING ═══════ */}
      <div className="pdf-page" style={S.page}>
        <Header vesselName={vesselName || v.vessel_name} imo={imo} />
        <div style={S.secTitle}>ESD performance summary</div>
        <div style={{ ...S.grid3, marginBottom: 14 }}>
          <div style={S.kpi}><div style={S.kpiL}>Total investment</div><div style={{ ...S.kpiV, color: '#DC2626' }}>{fmt$(esd.summary?.total_cost_usd)}</div></div>
          <div style={S.kpi}><div style={S.kpiL}>Annual fuel savings</div><div style={{ ...S.kpiV, color: '#059669' }}>{fmt$(esd.summary?.total_annual_cost_savings)}</div></div>
          <div style={S.kpi}><div style={S.kpiL}>CO₂ reduction</div><div style={S.kpiV}>{fmtN(esd.summary?.total_co2_reduction_mt, 1)} MT</div></div>
        </div>
        <table style={S.tbl}>
          <thead>
            <tr><th style={S.th}>#</th><th style={S.th}>ESD technology</th><th style={S.th}>Install</th><th style={S.thR}>Lead</th><th style={S.thR}>Eff%</th><th style={S.thR}>Fuel saved MT</th><th style={S.thR}>Cost</th><th style={S.thR}>Total $/yr</th><th style={S.thR}>Payback</th></tr>
          </thead>
          <tbody>
            {esdResults.map((e, i) => (
              <tr key={i}>
                <td style={S.td}>{i + 1}</td>
                <td style={S.td}>{e.tech_name}</td>
                <td style={S.td}><span style={S.badge(e.installation_req === 'docking' ? 'blue' : 'green')}>{e.installation_req?.replace('_', '-')}</span></td>
                <td style={S.tdR}>{e.applicability?.lead_time_months || '—'}mo</td>
                <td style={S.tdR}>{e.calculated_saving_pct?.toFixed(2)}%</td>
                <td style={S.tdR}>{fmtN(e.total_fuel_savings_mt, 1)}</td>
                <td style={S.tdR}>{fmt$(e.cost_usd)}</td>
                <td style={S.tdR}>{fmt$(e.total_annual_savings_usd)}</td>
                <td style={S.tdR}>{e.payback_with_ets_years ? e.payback_with_ets_years.toFixed(1) + 'yr' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Footer page={3} />
      </div>

      {/* ═══════ PAGE 4: CII STRATEGY ═══════ */}
      <div className="pdf-page" style={S.page}>
        <Header vesselName={vesselName || v.vessel_name} imo={imo} />
        <div style={S.secTitle}>CII strategy — ESD implementation timeline</div>
        <table style={S.tbl}>
          <thead>
            <tr><th style={S.th}>Date</th><th style={S.th}>ESD</th><th style={S.th}>Install type</th><th style={S.thR}>Saving %</th></tr>
          </thead>
          <tbody>
            {timeline.map((t, i) => (
              <tr key={i}>
                <td style={S.td}>{t.implementation_label}</td>
                <td style={S.td}>{t.name}</td>
                <td style={S.td}><span style={S.badge(t.installation_req === 'docking' ? 'blue' : 'green')}>{t.installation_req?.replace('_', '-')}</span></td>
                <td style={S.tdR}>+{t.saving_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ ...S.secTitle, marginTop: 20 }}>Monthly CII breakdown (with ESDs)</div>
        <table style={{ ...S.tbl, fontSize: 9 }}>
          <thead>
            <tr><th style={S.th}>Date</th><th style={S.thR}>Required</th><th style={S.th}>Grade</th><th style={S.thR}>Attained (ESD)</th><th style={S.thR}>Saving %</th><th style={S.thR}>Active ESDs</th></tr>
          </thead>
          <tbody>
            {(cii.graph3_esd?.monthly_data || []).map((r, i) => (
              <tr key={i} style={r.newly_installed?.length > 0 ? { background: '#ecfdf5' } : {}}>
                <td style={S.td}>{r.date}{r.newly_installed?.length > 0 && <span style={{ fontSize: 8, color: '#059669', marginLeft: 4 }}>▼ {r.newly_installed.join(', ')}</span>}</td>
                <td style={S.tdR}>{r.required_cii?.toFixed(4)}</td>
                <td style={S.td}><span style={S.badge(r.grade === 'A' || r.grade === 'B' ? 'green' : r.grade === 'E' || r.grade === 'D' ? 'red' : 'blue')}>{r.grade}</span></td>
                <td style={S.tdR}>{r.attained_cii?.toFixed(4)}</td>
                <td style={S.tdR}>{r.cumulative_saving_pct?.toFixed(1)}%</td>
                <td style={S.tdR}>{r.active_esds}/{timeline.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Footer page={4} />
      </div>

      {/* ═══════ PAGE 5: EU COMPLIANCE ═══════ */}
      <div className="pdf-page" style={S.page}>
        <Header vesselName={vesselName || v.vessel_name} imo={imo} />
        <div style={S.secTitle}>EU compliance — EUA + FuelEU</div>
        <div style={{ ...S.grid3, marginBottom: 14 }}>
          <div style={S.kpi}><div style={S.kpiL}>Total EU compliance cost</div><div style={{ ...S.kpiV, color: '#DC2626' }}>{fmt$(penalty.total_eu_compliance_cost_usd)}/yr</div></div>
          <div style={S.kpi}><div style={S.kpiL}>EUA cost</div><div style={S.kpiV}>{fmt$(eua.total_eua_cost_usd)}/yr</div></div>
          <div style={S.kpi}><div style={S.kpiL}>FuelEU penalty</div><div style={S.kpiV}>{fmt$(feu.penalty_usd)}/yr</div></div>
        </div>
        <div style={{ ...S.grid2, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6, color: '#666' }}>GHG intensity</div>
            <table style={S.tbl}>
              <tbody>
                <tr><td style={{ ...S.td, color: '#888' }}>WTT</td><td style={S.tdR}>{feu.ghg_intensity_wtt?.toFixed(4)} gCO₂eq/MJ</td></tr>
                <tr><td style={{ ...S.td, color: '#888' }}>TTW</td><td style={S.tdR}>{feu.ghg_intensity_ttw?.toFixed(4)} gCO₂eq/MJ</td></tr>
                <tr style={{ fontWeight: 600 }}><td style={{ ...S.td, color: '#888' }}>Total</td><td style={S.tdR}>{feu.ghg_intensity_total?.toFixed(4)} gCO₂eq/MJ</td></tr>
                <tr><td style={{ ...S.td, color: '#888' }}>Target ({vm.analysis_year})</td><td style={S.tdR}>{feu.ghg_target?.toFixed(4)} gCO₂eq/MJ</td></tr>
                <tr><td style={{ ...S.td, color: '#888' }}>Status</td><td style={S.tdR}><span style={S.badge(feu.compliant ? 'green' : 'red')}>{feu.compliant ? 'Compliant' : 'Non-compliant'}</span></td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6, color: '#666' }}>EUA breakdown</div>
            <table style={S.tbl}>
              <thead><tr><th style={S.th}>Fuel</th><th style={S.thR}>EU emission tCO₂</th><th style={S.thR}>EUA units</th><th style={S.thR}>Cost</th></tr></thead>
              <tbody>
                {(eua.fuel_breakdown || []).map((fb, i) => (
                  <tr key={i}><td style={S.td}>{fb.fuel_name}</td><td style={S.tdR}>{fmtN(fb.eu_emission_tco2eq, 1)}</td><td style={S.tdR}>{fmtN(fb.liable_eua_units, 1)}</td><td style={S.tdR}>{fmt$(fb.eua_cost_usd)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={S.secTitle}>Year-by-year EU compliance projection</div>
        <table style={{ ...S.tbl, fontSize: 9 }}>
          <thead>
            <tr><th style={S.th}>Year</th><th style={S.thR}>Months</th><th style={S.thR}>Target</th><th style={S.thR}>FuelEU pen.</th><th style={S.thR}>EUA cost</th><th style={S.thR}>ESD fuel $</th><th style={S.thR}>ESD EUA $</th><th style={S.thR}>ESD FuelEU $</th></tr>
          </thead>
          <tbody>
            {yearly.map((r, i) => (
              <tr key={i}>
                <td style={{ ...S.td, fontWeight: 600 }}>{r.year}</td>
                <td style={S.tdR}>{r.active_months}mo</td>
                <td style={S.tdR}>{r.target?.toFixed(4)}</td>
                <td style={{ ...S.tdR, color: '#DC2626' }}>{fmt$(r.vessel_fueleu_penalty_usd)}</td>
                <td style={{ ...S.tdR, color: '#DC2626' }}>{fmt$(r.vessel_eua_cost_usd)}</td>
                <td style={{ ...S.tdR, color: '#059669' }}>{fmt$(r.esd_fuel_savings_usd)}</td>
                <td style={{ ...S.tdR, color: '#059669' }}>{fmt$(r.esd_eua_savings_usd)}</td>
                <td style={{ ...S.tdR, color: '#059669' }}>{fmt$(r.esd_fueleu_savings_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Footer page={5} />
      </div>

      {/* ═══════ PAGE 6: FINANCIALS ═══════ */}
      <div className="pdf-page" style={S.page}>
        <Header vesselName={vesselName || v.vessel_name} imo={imo} />
        <div style={S.secTitle}>Financial analysis</div>
        <div style={{ ...S.grid3, marginBottom: 14 }}>
          <div style={S.kpi}><div style={S.kpiL}>NPV</div><div style={{ ...S.kpiV, color: finSum.npv_usd >= 0 ? '#059669' : '#DC2626' }}>{fmt$(finSum.npv_usd)}</div></div>
          <div style={S.kpi}><div style={S.kpiL}>Savings PV</div><div style={S.kpiV}>{fmt$(finSum.savings_pv_usd)}</div></div>
          <div style={S.kpi}><div style={S.kpiL}>Payback period</div><div style={S.kpiV}>{finSum.payback_years ? finSum.payback_years.toFixed(1) + ' yrs' : '—'}</div></div>
        </div>
        <div style={{ ...S.grid3, marginBottom: 14 }}>
          <div style={S.kpi}><div style={S.kpiL}>IRR</div><div style={S.kpiV}>{finSum.irr_pct ? finSum.irr_pct.toFixed(1) + '%' : '—'}</div></div>
          <div style={S.kpi}><div style={S.kpiL}>Total investment</div><div style={{ ...S.kpiV, color: '#DC2626' }}>{fmt$(finSum.total_investment_usd)}</div></div>
          <div style={S.kpi}><div style={S.kpiL}>Accumulated savings</div><div style={{ ...S.kpiV, color: '#059669' }}>{fmt$(finSum.accumulated_savings_usd)}</div></div>
        </div>

        <div style={S.secTitle}>Monthly cashflow</div>
        <table style={{ ...S.tbl, fontSize: 9 }}>
          <thead>
            <tr><th style={S.th}>Date</th><th style={S.thR}>Investment</th><th style={S.thR}>Fuel $</th><th style={S.thR}>EUA $</th><th style={S.thR}>FuelEU $</th><th style={S.thR}>Net</th><th style={S.thR}>Cumulative</th></tr>
          </thead>
          <tbody>
            {cashflows.map((r, i) => (
              <tr key={i} style={r.is_docking ? { background: '#fef3c7' } : {}}>
                <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 9 }}>{r.date}</td>
                <td style={{ ...S.tdR, color: r.investment > 0 ? '#DC2626' : '#ccc' }}>{r.investment > 0 ? '-' + fmt$(r.investment) : '—'}</td>
                <td style={{ ...S.tdR, color: '#059669' }}>{r.fuel_savings > 0 ? fmt$(r.fuel_savings) : '—'}</td>
                <td style={{ ...S.tdR, color: '#2563EB' }}>{r.ets_savings > 0 ? '$' + fmtN(r.ets_savings, 0) : '—'}</td>
                <td style={{ ...S.tdR, color: '#7C3AED' }}>{r.fuel_eu_savings > 0 ? '$' + fmtN(r.fuel_eu_savings, 0) : '—'}</td>
                <td style={{ ...S.tdR, fontWeight: 600, color: r.net_cashflow >= 0 ? '#059669' : '#DC2626' }}>{r.net_cashflow >= 0 ? '+' : ''}{fmt$(r.net_cashflow)}</td>
                <td style={{ ...S.tdR, fontWeight: 600, color: r.cumulative_cashflow >= 0 ? '#059669' : '#DC2626' }}>{r.cumulative_cashflow >= 0 ? '+' : ''}{fmt$(r.cumulative_cashflow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Footer page={6} />
      </div>

    </div>
  );
}