import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const fmt$ = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + Math.round(n).toLocaleString();
  return '$' + Number(n).toFixed(0);
};
const fmtN = (n, dec = 0) =>
  n != null ? Number(n).toLocaleString(undefined, { maximumFractionDigits: dec }) : '—';

const fmtAxisM = (v) => {
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v;
};

export default function FinancialTab({ output }) {
  const fin  = output?.financial || {};
  const sum  = fin.summary || {};

  // Monthly cashflow chart data — sample key turning points to keep chart readable
  const cfRaw = fin.monthly_cashflows || [];
  const cfData = cfRaw
    .filter((_, i) => i % 2 === 0 || cfRaw[i]?.is_docking)
    .map(r => ({
      tl:  r.timeline,
      cum: r.cumulative_cashflow,
      dk:  r.is_docking,
    }));

  // Yearly savings stacked bar
  const yrData = (fin.yearly_savings || []).map(r => ({
    year:   r.year,
    fuel:   r.fuel_savings,
    eua:    r.ets_savings,
    fueleu: r.fuel_eu_savings,
    inv:    -r.investment,
  }));

  const CustomCFTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const cum = payload[0]?.value;
    return (
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
        <div style={{ color: '#64748B', marginBottom: 4 }}>{label?.toFixed(2)}</div>
        <div style={{ color: cum >= 0 ? '#1D9E75' : '#EF4444', fontWeight: 600 }}>{fmt$(cum)}</div>
      </div>
    );
  };

  return (
    <div>
      {/* KPIs row 1 */}
      <div className="kpi-grid">
        <div className="kpi-box">
          <div className="kl">NPV</div>
          <div className="kv green">{fmt$(sum.npv_usd)}</div>
          <div className="ks">Savings PV − Investment</div>
        </div>
        <div className="kpi-box">
          <div className="kl">IRR</div>
          <div className="kv green">{sum.irr_pct != null ? sum.irr_pct.toFixed(1) + '%' : '—'}</div>
          <div className="ks">Internal rate of return</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Savings PV</div>
          <div className="kv">{fmt$(sum.savings_pv_usd)}</div>
          <div className="ks">@ {sum.discount_rate_pct || 10}% discount rate</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Accumulated Gross Savings</div>
          <div className="kv">{fmt$(sum.accumulated_savings_usd)}</div>
          <div className="ks">Undiscounted total</div>
        </div>
      </div>

      {/* KPIs row 2 */}
      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <div className="kpi-box">
          <div className="kl">Total Investment</div>
          <div className="kv red">{fmt$(sum.total_investment_usd)}</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Annual Fuel Savings</div>
          <div className="kv">{fmt$(sum.annual_fuel_savings_usd)}</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Annual EUA Savings</div>
          <div className="kv">{fmt$(sum.annual_ets_savings_usd)}</div>
        </div>
        <div className="kpi-box">
          <div className="kl">Payback Period</div>
          <div className="kv green">{sum.payback_years != null ? sum.payback_years.toFixed(2) + ' yr' : '—'}</div>
          <div className="ks">incl. EUA + FuelEU savings</div>
        </div>
      </div>

      {/* Vessel life info bar */}
      <div style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 14px', marginBottom: 14, display: 'flex', gap: 28, fontSize: 11, color: '#64748B' }}>
        <span><strong>Vessel age:</strong> {sum.vessel_age != null ? sum.vessel_age + ' yrs' : '—'}</span>
        <span><strong>Remaining:</strong> {sum.vessel_remaining_years != null ? sum.vessel_remaining_years.toFixed(1) + ' yrs' : '—'}</span>
        <span><strong>End of life:</strong> <code>{sum.end_of_vessel_life || '—'}</code></span>
        <span><strong>Discount rate:</strong> {sum.discount_rate_pct || 10}%</span>
      </div>

      {/* Charts */}
      <div className="r-two-col">
        {/* Cumulative cashflow */}
        <div className="r-card">
          <div className="r-card-hd">Cumulative Cashflow</div>
          <div className="r-card-body">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cfData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="cfNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" strokeOpacity={0.8} vertical={false} />
                <XAxis dataKey="tl" tickFormatter={v => v?.toFixed(0)} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmtAxisM} tick={{ fontSize: 10 }} width={60} />
                <Tooltip content={<CustomCFTooltip />} />
                <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1.5} />
                <Area
                  type="monotone" dataKey="cum"
                  stroke="#1D9E75" strokeWidth={2}
                  fill="url(#cfPos)"
                  dot={(props) => {
                    if (!props.payload?.dk) return null;
                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill="#F59E0B" />;
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>
              🟡 Docking months (investment outflows)
            </div>
          </div>
        </div>

        {/* Yearly savings stacked */}
        <div className="r-card">
          <div className="r-card-hd">Yearly Savings Breakdown</div>
          <div className="r-card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={yrData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeOpacity={0.8} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmtAxisM} tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v, name) => [fmt$(v), name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={0} stroke="#E2E8F0" />
                <Bar dataKey="fuel"   stackId="a" fill="#1D9E75"   name="Fuel" radius={[0,0,0,0]} />
                <Bar dataKey="eua"    stackId="a" fill="#3B82F6"   name="EUA" />
                <Bar dataKey="fueleu" stackId="a" fill="#8B5CF6"   name="FuelEU" />
                <Bar dataKey="inv"    stackId="a" fill="#EF4444BB" name="Investment" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
