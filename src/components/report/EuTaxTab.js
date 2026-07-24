import React from 'react';

const fmt$ = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + Math.round(n).toLocaleString();
  return '$' + Number(n).toFixed(0);
};
const fmtN = (n, dec = 0) =>
  n != null ? Number(n).toLocaleString(undefined, { maximumFractionDigits: dec }) : '—';

const FuelBadge = ({ name }) => (
  <span className={`fuel-badge fuel-${name || 'OTHER'}`}>{name || '—'}</span>
);

export default function EuTaxTab({ output }) {
  const ps  = output?.penalty_summary || {};
  const eua = output?.eua || {};
  const feu = output?.fuel_eu_penalty || {};
  const yearly = output?.fueleu_yearly_breakdown || [];

  return (
    <div>
      {/* Top penalty bar */}
      <div className="pen-bar">
        <div className="pen-item">
          <div className="pen-label">EUA Cost ({eua.analysis_year || '—'})</div>
          <div className="pen-val">{fmt$(ps.total_eua_cost_usd)}</div>
          <div className="pen-sub">{fmtN(eua.total_eua_units, 0)} units × ${output?.input?.voyage_meta?.eua_cost_usd || 75}</div>
        </div>
        <div className="pen-item">
          <div className="pen-label">FuelEU Penalty ({eua.analysis_year || '—'})</div>
          <div className="pen-val">{fmt$(ps.total_fuel_eu_penalty_usd)}</div>
          <div className="pen-sub">
            GHG {feu.ghg_intensity_total?.toFixed(2)} vs target {feu.ghg_target?.toFixed(2)}
          </div>
        </div>
        <div className="pen-item" style={{ background: '#FFF7F7' }}>
          <div className="pen-label">Total EU Compliance</div>
          <div className="pen-val" style={{ fontSize: 22 }}>{fmt$(ps.total_eu_compliance_cost_usd)}</div>
          <div className="pen-sub">EUA + FuelEU / year</div>
        </div>
      </div>

      <div className="r-two-col">
        {/* EUA section */}
        <div>
          {/* EUA KPIs */}
          <div className="kpi-grid kpi-grid-2" style={{ marginBottom: 12 }}>
            <div className="kpi-box">
              <div className="kl">EUA Units Liable</div>
              <div className="kv">{fmtN(eua.total_eua_units, 0)}</div>
              <div className="ks">tCO₂eq / year</div>
            </div>
            <div className="kpi-box">
              <div className="kl">Relief Factor</div>
              <div className="kv">{eua.relief_factor != null ? (eua.relief_factor * 100).toFixed(0) + '%' : '—'}</div>
              <div className="ks">EU voyage share: {eua.eu_voyages_percent}%</div>
            </div>
          </div>

          {/* EUA fuel breakdown table */}
          <div className="r-card">
            <div className="r-card-hd">
              EUA Fuel Breakdown
              <span className="hd-sub">
                {eua.analysis_year} · Relief {eua.relief_factor} · EU voyages {eua.eu_voyages_percent}%
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="r-table">
                <thead>
                  <tr>
                    <th>Fuel</th>
                    <th className="right">Total MT</th>
                    <th className="right">EU MT</th>
                    <th className="right">TTW Factor</th>
                    <th className="right">EU Emissions</th>
                    <th className="right">Relief</th>
                    <th className="right">EUA Units</th>
                    <th className="right">EUA Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(eua.fuel_breakdown || []).map((f, i) => (
                    <tr key={i}>
                      <td><FuelBadge name={f.fuel_name} /></td>
                      <td className="right">{fmtN(f.total_consumption_mt, 0)}</td>
                      <td className="right">{fmtN(f.eu_consumption_mt, 1)}</td>
                      <td className="right">{f.ttw_factor?.toFixed(4)}</td>
                      <td className="right">{fmtN(f.eu_emission_tco2eq, 0)} tCO₂</td>
                      <td className="right">{f.relief_factor}</td>
                      <td className="right">{fmtN(f.liable_eua_units, 0)}</td>
                      <td className="right">{fmt$(f.eua_cost_usd)}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td colSpan={6}><strong>Total</strong></td>
                    <td className="right"><strong>{fmtN(eua.total_eua_units, 0)}</strong></td>
                    <td className="right"><strong>{fmt$(eua.total_eua_cost_usd)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FuelEU section */}
        <div>
          {/* GHG intensity card */}
          <div className="r-card" style={{ marginBottom: 12 }}>
            <div className="r-card-hd">
              GHG Intensity Analysis
              <span
                className={`badge ${feu.compliant ? 'badge-green' : 'badge-red'}`}
                style={{ marginLeft: 8 }}
              >
                {feu.compliant ? 'Compliant' : 'Non-Compliant'}
              </span>
            </div>
            <div className="r-card-body">
              <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Actual GHG Intensity</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#EF4444', fontFamily: 'monospace' }}>
                    {feu.ghg_intensity_total?.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>gCO₂eq/MJ (WTT + TTW)</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, color: '#94A3B8' }}>→</div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Target ({feu.analysis_year})</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#1D9E75', fontFamily: 'monospace' }}>
                    {feu.ghg_target?.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    Excess: +{((feu.ghg_intensity_total || 0) - (feu.ghg_target || 0)).toFixed(4)}
                  </div>
                </div>
              </div>
              <table className="r-table">
                <tbody>
                  <tr><td>GHG Target</td><td className="right" style={{ color: '#1D9E75' }}>{feu.ghg_target?.toFixed(4)} gCO₂eq/MJ</td></tr>
                  <tr><td>Actual GHG (WTT {feu.ghg_intensity_wtt?.toFixed(4)} + TTW {feu.ghg_intensity_ttw?.toFixed(4)})</td><td className="right" style={{ color: '#EF4444' }}>{feu.ghg_intensity_total?.toFixed(4)} gCO₂eq/MJ</td></tr>
                  <tr><td>Carbon Balance (CB)</td><td className="right" style={{ color: '#EF4444' }}>{feu.carbon_balance != null ? Math.round(feu.carbon_balance).toLocaleString() : '—'}</td></tr>
                  <tr><td>EU Voyage Share</td><td className="right">{feu.eu_voyages_percent}%</td></tr>
                  <tr><td>Penalty Rate</td><td className="right">€2,400 / tCO₂eq</td></tr>
                  <tr><td>EUR → USD</td><td className="right">1.08</td></tr>
                  <tr style={{ background: '#FFF7F7' }}>
                    <td><strong>FuelEU Penalty (base year)</strong></td>
                    <td className="right" style={{ color: '#EF4444', fontWeight: 700, fontSize: 14 }}>
                      {fmt$(feu.penalty_usd)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* FuelEU Yearly Projection */}
      {yearly.length > 0 && (
        <div className="r-card">
          <div className="r-card-hd">
            FuelEU Maritime — Year-by-Year Projection
            <span className="hd-sub">Penalty and ESD savings scale as IMO targets tighten</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="r-table fueleu-yr">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="right">IMO Target</th>
                  <th className="right">Vessel Excess</th>
                  <th className="right">Scale Factor</th>
                  <th className="right">Vessel Penalty</th>
                  <th className="right">ESD Savings</th>
                  <th className="right">Net Penalty</th>
                  <th className="right">Cum. Penalty</th>
                  <th className="right">Cum. Savings</th>
                </tr>
              </thead>
              <tbody>
                {yearly.map((r, i) => (
                  <tr key={i} className={r.scale > 1.0 ? 'scale-high' : ''}>
                    <td><strong>{r.year}</strong></td>
                    <td className="right">{r.target?.toFixed(4)}</td>
                    <td className="right" style={{ color: '#EF4444' }}>+{r.vessel_excess?.toFixed(4)}</td>
                    <td className="right">
                      <span className={r.scale > 1.0 ? 'badge badge-amber' : ''}>
                        {r.scale?.toFixed(3)}×
                      </span>
                    </td>
                    <td className="right" style={{ color: '#EF4444' }}>{fmt$(r.vessel_penalty_usd)}</td>
                    <td className="right" style={{ color: '#1D9E75' }}>{fmt$(r.esd_savings_usd)}</td>
                    <td className="right">{fmt$(r.net_penalty_usd)}</td>
                    <td className="right" style={{ color: '#64748B' }}>{fmt$(r.cumulative_vessel_penalty)}</td>
                    <td className="right" style={{ color: '#1D9E75' }}>{fmt$(r.cumulative_esd_savings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 14px', fontSize: 10, color: '#64748B', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
            Rows highlighted blue = post-2030 (2.786× scale factor, IMO target drops to 85.69 gCO₂eq/MJ)
          </div>
        </div>
      )}
    </div>
  );
}
