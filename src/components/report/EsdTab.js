import React, { useState } from 'react';

const fmt$ = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + Math.round(n).toLocaleString();
  return '$' + Number(n).toFixed(0);
};
const fmtN = (n, dec = 0) =>
  n != null ? Number(n).toLocaleString(undefined, { maximumFractionDigits: dec }) : '—';

const paybackColor = (yrs) => {
  if (yrs == null) return '';
  if (yrs <= 1.5) return 'sens-cell-green';
  if (yrs <= 3.0) return 'sens-cell-amber';
  return 'sens-cell-red';
};

export default function EsdTab({ output }) {
  const [fuelFilter, setFuelFilter] = useState('HFO');

  const esd     = output?.esd || {};
  const esds    = esd.esd_results || [];
  const summary = esd.summary || {};
  const sens    = output?.payback_sensitivity || {};
  const ranges  = sens.fuel_type_ranges || {};
  const sensEsds = sens.esd_sensitivity || [];
  const activeFuels = sens.active_fuel_types || Object.keys(ranges);
  const prices  = ranges[fuelFilter] || [];

  const esdTotal = esds.reduce((s, r) => s + (r.total_annual_savings_usd || 0), 0);

  const CAT_CLASS = {
    propulsion: 'cat-propulsion', hull: 'cat-hull',
    engine: 'cat-engine', auxiliary: 'cat-auxiliary', operations: 'cat-operations',
  };
  const INST_CLASS = { docking: 'cat-docking', in_sailing: 'cat-in-sailing' };

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-box">
          <div className="kl">Total Investment</div>
          <div className="kv">{fmt$(summary.total_cost_usd)}</div>
          <div className="ks">{esds.length} ESDs selected</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Fuel Savings</div>
          <div className="kv green">{fmtN(summary.total_fuel_savings_mt_all, 0)} MT</div>
          <div className="ks">per year</div>
        </div>
        <div className="kpi-box">
          <div className="kl">CO₂ Reduction</div>
          <div className="kv green">{fmtN(summary.total_co2_reduction_mt, 0)} t</div>
          <div className="ks">per year</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Annual Savings</div>
          <div className="kv green">{fmt$(esdTotal)}</div>
          <div className="ks">fuel + EUA + FuelEU</div>
        </div>
      </div>

      {/* ESD performance table */}
      <div className="r-card">
        <div className="r-card-hd">
          ESD Performance Results
          <span className="hd-sub">Savings calculated after interaction effects</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="r-table">
            <thead>
              <tr>
                <th>Technology</th>
                <th>Category</th>
                <th>Install</th>
                <th className="right">Saving %</th>
                <th className="right">Fuel Savings</th>
                <th className="right">Fuel Cost Savings</th>
                <th className="right">EUA Savings</th>
                <th className="right">FuelEU Savings</th>
                <th className="right">Total Annual</th>
                <th className="right">Payback</th>
              </tr>
            </thead>
            <tbody>
              {esds.map((e, i) => {
                const fuelStr = Object.entries(e.fuel_savings_mt || {})
                  .map(([fn, mt]) => `${fmtN(mt, 0)} ${fn}`).join(', ') || '—';
                return (
                  <tr key={i}>
                    <td><strong>{e.tech_name}</strong></td>
                    <td>
                      <span className={`cat-badge ${CAT_CLASS[e.category] || ''}`}>
                        {e.category}
                      </span>
                    </td>
                    <td>
                      <span className={`cat-badge ${INST_CLASS[e.installation_req] || ''}`}>
                        {e.installation_req?.replace('_', '-') || '—'}
                      </span>
                    </td>
                    <td className="right">{e.calculated_saving_pct?.toFixed(2)}%</td>
                    <td className="right">{fuelStr}</td>
                    <td className="right">{fmt$(e.annual_cost_savings_usd)}</td>
                    <td className="right">{fmt$(e.ets_savings_usd)}</td>
                    <td className="right">{fmt$(e.fuel_eu_savings_usd)}</td>
                    <td className="right"><strong>{fmt$(e.total_annual_savings_usd)}</strong></td>
                    <td className="right" style={{ color: '#1D9E75', fontWeight: 600 }}>
                      {e.payback_with_ets_years?.toFixed(2)} yr
                    </td>
                  </tr>
                );
              })}
              <tr className="total">
                <td colSpan={4}><strong>TOTAL</strong></td>
                <td className="right">{fmtN(summary.total_fuel_savings_mt_all, 0)} MT</td>
                <td className="right">{fmt$(summary.total_annual_cost_savings)}</td>
                <td className="right">{fmt$(summary.total_ets_savings_usd)}</td>
                <td className="right">{fmt$(esds.reduce((s, r) => s + (r.fuel_eu_savings_usd || 0), 0))}</td>
                <td className="right"><strong>{fmt$(esdTotal)}</strong></td>
                <td className="right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensitivity table */}
      {sensEsds.length > 0 && (
        <div className="r-card">
          <div className="r-card-hd">
            Payback Sensitivity — Fuel Price Scenarios
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#64748B' }}>Fuel type:</span>
              {activeFuels.map(f => (
                <button
                  key={f}
                  onClick={() => setFuelFilter(f)}
                  style={{
                    padding: '3px 10px', fontSize: 10, borderRadius: 4,
                    border: '1px solid #E2E8F0', cursor: 'pointer',
                    background: fuelFilter === f ? '#1D9E75' : '#fff',
                    color: fuelFilter === f ? '#fff' : '#374151',
                  }}
                >{f}</button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sens-table">
              <thead>
                <tr>
                  <th className="left-align" style={{ minWidth: 160 }}>ESD / {fuelFilter} Price →</th>
                  {prices.map((p, i) => (
                    <th key={i}>${p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensEsds
                  .filter(e => e.primary_fuel === fuelFilter)
                  .map((e, ri) => {
                    const curPrice = output?.input?.machines
                      ?.flatMap(m => m.fuel_particulars || [])
                      .find(fp => fp.fuel_name === fuelFilter)?.fuel_price_usd_per_mt;
                    const curIdx = prices.findIndex(p => p === curPrice);
                    return (
                      <tr key={ri}>
                        <td style={{ textAlign: 'left', fontWeight: 500 }}>{e.tech_name}</td>
                        {(e.payback_by_case || []).map((val, ci) => (
                          <td
                            key={ci}
                            className={`${paybackColor(val)} ${ci === curIdx ? 'sens-cell-cur' : ''}`}
                          >
                            {val?.toFixed(1)}y
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 10, color: '#64748B', padding: '0 8px 8px' }}>
              <span><span className="sens-cell-green" style={{ padding: '1px 6px', borderRadius: 3 }}>Green</span> ≤ 1.5 yr</span>
              <span><span className="sens-cell-amber" style={{ padding: '1px 6px', borderRadius: 3 }}>Amber</span> 1.5–3 yr</span>
              <span><span className="sens-cell-red"   style={{ padding: '1px 6px', borderRadius: 3 }}>Red</span> &gt; 3 yr</span>
              <span>Outlined cell = current fuel price</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
