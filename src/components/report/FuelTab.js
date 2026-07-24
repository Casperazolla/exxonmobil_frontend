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

export default function FuelTab({ output }) {
  const fs = output?.fuel_summary || {};
  const totalMT = fs.total_consumption_mt || 1;

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-box">
          <div className="kl">Total Consumption</div>
          <div className="kv">{fmtN(fs.total_consumption_mt, 0)} MT</div>
          <div className="ks">per year</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Total Fuel Cost</div>
          <div className="kv green">{fmt$(fs.total_fuel_cost_usd)}</div>
          <div className="ks">per year</div>
        </div>
        <div className="kpi-box">
           <div style={{textAlign:'right'}}>
                <div style={{fontSize:9,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.3px'}}>EU Compliance Cost</div>
                <div style={{fontSize:16,fontWeight:600,color:'var(--red)',fontFamily:'IBM Plex Mono,monospace'}}>{fmt$(ps.total_eu_compliance_cost_usd)}</div>
                <div style={{fontSize:9,color:'var(--ink3)'}}>EUA + FuelEU / yr</div>
              </div>
        </div>
        <div className="kpi-box">
          <div className="kl">Consumers</div>
          <div className="kv">{(fs.machine_breakdown || []).length}</div>
          <div className="ks">{(fs.machine_breakdown || []).map(m => m.machine_name).join(' · ')}</div>
        </div>
      </div>

      <div className="r-two-col">
        {/* Fuel breakdown */}
        <div className="r-card">
          <div className="r-card-hd">Fuel Breakdown by Type</div>
          <table className="r-table">
            <thead>
              <tr>
                <th>Fuel</th>
                <th className="right">Price/MT</th>
                <th className="right">MT</th>
                <th className="right">Investment</th>
                <th className="right">Share</th>
              </tr>
            </thead>
            <tbody>
              {(fs.fuel_summary || []).map((f, i) => (
                <tr key={i}>
                  <td><FuelBadge name={f.fuel_name} /></td>
                  <td className="right">${fmtN(f.fuel_price_usd_per_mt, 0)}</td>
                  <td className="right">{fmtN(f.consumption_mt, 0)}</td>
                  <td className="right">{fmt$(f.total_cost_usd)}</td>
                  <td className="right">{((f.consumption_mt / totalMT) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="total">
                <td><strong>Total</strong></td>
                <td className="right">—</td>
                <td className="right">{fmtN(totalMT, 0)}</td>
                <td className="right"><strong>{fmt$(fs.total_fuel_cost_usd)}</strong></td>
                <td className="right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Machine breakdown */}
        <div className="r-card">
          <div className="r-card-hd">Machine Breakdown</div>
          <table className="r-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Fuel</th>
                <th className="right">MT</th>
                <th className="right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {(fs.machine_breakdown || []).flatMap((m, mi) =>
                (m.fuels || []).map((f, fi) => (
                  <tr key={`${mi}-${fi}`}>
                    {fi === 0 && (
                      <td rowSpan={m.fuels.length}><strong>{m.machine_name}</strong></td>
                    )}
                    <td><FuelBadge name={f.fuel_name} /></td>
                    <td className="right">{fmtN(f.consumption_mt, 0)}</td>
                    <td className="right">{fmt$(f.total_cost_usd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
