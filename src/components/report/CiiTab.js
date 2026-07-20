import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

const fmtN = (n, dec = 2) =>
  n != null ? Number(n).toLocaleString(undefined, { maximumFractionDigits: dec }) : '—';

const GRADE_COLORS = { A: '#1D9E75', B: '#3B82F6', C: '#F59E0B', D: '#F97316', E: '#EF4444' };
const SAIL_COLORS  = ['#3B82F6','#8B5CF6','#EC4899','#06B6D4','#F59E0B'];

// Derive unique annual CII boundary data from monthly baseline
function buildAnnualBounds(monthly) {
  const byYear = {};
  (monthly || []).forEach(r => {
    const yr = parseInt(r.date);
    if (!byYear[yr]) byYear[yr] = r;
  });
  return Object.values(byYear).sort((a, b) => parseInt(a.date) - parseInt(b.date));
}

// Convert monthly data to decimal-year step format for recharts
function buildStepLine(monthly) {
  const pts = [];
  (monthly || []).forEach((r, i) => {
    const [yr, mo] = r.date.split('-').map(Number);
    const x = yr + (mo - 1) / 12;
    const prev = i > 0 ? monthly[i - 1] : null;
    if (i === 0) { pts.push({ x, y: r.attained_cii }); return; }
    if (r.attained_cii !== prev.attained_cii) {
      pts.push({ x, y: prev.attained_cii });
      pts.push({ x, y: r.attained_cii });
    }
  });
  if (monthly?.length) {
    const last = monthly[monthly.length - 1];
    const [ly, lm] = last.date.split('-').map(Number);
    pts.push({ x: ly + lm / 12, y: last.attained_cii });
  }
  return pts;
}

export default function CiiTab({ output }) {
  console.log('CII output prop:', output);
  console.log('CII object:', output?.cii);
  const [sailFilter, setSailFilter] = useState('all');
  const cii = output?.cii || {};

  const baseline    = cii.graph1_baseline || [];
  const annualBounds = useMemo(() => buildAnnualBounds(baseline), [baseline]);
  const esdMonthly  = cii.graph3_esd?.monthly_data || [];
  const esdTimeline = cii.graph3_esd?.esd_timeline || [];
  const sailing     = cii.graph2_sailing || {};
  const combined    = cii.graph4_combined?.scenarios || cii.graph4_combined || {};
  const sailKeys    = Object.keys(sailing);
  const combKeys    = Object.keys(combined);

  // Build unified chart data for baseline / grade lines
  const baselineChartData = useMemo(() => {
    return annualBounds.map(r => ({
      yr: parseInt(r.date),
      req: r.required_cii,
      d1: r.d1, d2: r.d2, d3: r.d3, d4: r.d4,
      att: r.attained_cii,
      grade: r.grade,
    }));
  }, [annualBounds]);

  // ESD step-down line
  const esdLine = useMemo(() => buildStepLine(esdMonthly), [esdMonthly]);

  // Sailing scenarios (constant per scenario, yearly)
  const sailingChartData = useMemo(() => {
    return baselineChartData.map(row => {
      const pt = { yr: row.yr, req: row.req, d1: row.d1, d2: row.d2, d3: row.d3, d4: row.d4 };
      sailKeys.forEach(k => {
        const match = (sailing[k] || []).find(r => parseInt(r.date) === row.yr);
        if (match) pt[k] = match.attained_cii;
      });
      return pt;
    });
  }, [baselineChartData, sailing, sailKeys]);

  // Combined sailing+ESD
  const combChartData = useMemo(() => {
    return baselineChartData.map(row => {
      const pt = { yr: row.yr, req: row.req, d1: row.d1, d2: row.d2, d3: row.d3, d4: row.d4 };
      combKeys.forEach(k => {
        const match = ((combined[k]) || []).find(r => parseInt(r.date) === row.yr);
        if (match) pt[k] = match.attained_cii;
      });
      return pt;
    });
  }, [baselineChartData, combined, combKeys]);

  const CIITooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', fontSize: 10 }}>
        <div style={{ color: '#64748B', marginBottom: 4, fontWeight: 600 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(4)}</div>
        ))}
      </div>
    );
  };

  const filterKeys = sailFilter === 'all' ? combKeys : [sailFilter];

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Sailing scenario:</span>
        <button
          onClick={() => setSailFilter('all')}
          style={{
            padding: '4px 12px', fontSize: 11, borderRadius: 4,
            border: '1px solid #E2E8F0', cursor: 'pointer',
            background: sailFilter === 'all' ? '#1D9E75' : '#fff',
            color: sailFilter === 'all' ? '#fff' : '#374151',
          }}
        >All</button>
        {sailKeys.map((k, i) => (
          <button
            key={k}
            onClick={() => setSailFilter(k)}
            style={{
              padding: '4px 12px', fontSize: 11, borderRadius: 4,
              border: '1px solid #E2E8F0', cursor: 'pointer',
              background: sailFilter === k ? SAIL_COLORS[i] : '#fff',
              color: sailFilter === k ? '#fff' : '#374151',
            }}
          >{k}</button>
        ))}
      </div>

      {/* Graph 1 — Baseline */}
      <div className="r-card">
        <div className="r-card-hd">
          Graph 1: Baseline CII (No ESD)
          <span className="hd-sub">Attained vs Required CII with grade bands</span>
        </div>
        <div className="r-card-body">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={baselineChartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#F1F5F9" strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="yr" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
              <Tooltip content={<CIITooltip />} />
              <Line dataKey="d1" stroke={GRADE_COLORS.A} strokeWidth={1} strokeDasharray="3 3" dot={false} name="D1 (A/B)" />
              <Line dataKey="d2" stroke={GRADE_COLORS.B} strokeWidth={1} strokeDasharray="3 3" dot={false} name="D2 (B/C)" />
              <Line dataKey="d3" stroke={GRADE_COLORS.C} strokeWidth={1} strokeDasharray="3 3" dot={false} name="D3 (C/D)" />
              <Line dataKey="d4" stroke={GRADE_COLORS.D} strokeWidth={1} strokeDasharray="3 3" dot={false} name="D4 (D/E)" />
              <Line dataKey="req" stroke="#1E293B" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Required CII" />
              <Line dataKey="att" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3, fill: '#1D9E75' }} name="Attained CII" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="r-two-col">
        {/* Graph 2 — Sailing scenarios */}
        <div className="r-card">
          <div className="r-card-hd">Graph 2: Sailing Profile Scenarios</div>
          <div className="r-card-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sailingChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="yr" tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip content={<CIITooltip />} />
                <Line dataKey="req" stroke="#1E293B" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Required" />
                {sailKeys.map((k, i) => (
                  <Line key={k} dataKey={k} stroke={SAIL_COLORS[i % SAIL_COLORS.length]} strokeWidth={1.5} dot={false} name={k} />
                ))}
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3 — ESD step-down */}
        <div className="r-card">
          <div className="r-card-hd">
            Graph 3: ESD Implementation Timeline
            <span className="hd-sub">{esdTimeline.length} ESDs</span>
          </div>
          <div className="r-card-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={esdLine} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="x" tickFormatter={v => v?.toFixed(0)} tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [v?.toFixed(4), 'Attained CII']} labelFormatter={l => l?.toFixed(2)} />
                {esdTimeline.map((t, i) => (
                  <ReferenceLine
                    key={i}
                    x={t.implementation_date[0] + (t.implementation_date[1] - 1) / 12}
                    stroke="#F59E0B" strokeDasharray="3 3"
                    label={{ value: t.name.split(' ')[0], fontSize: 8, fill: '#F59E0B', position: 'top' }}
                  />
                ))}
                <Line dataKey="y" stroke="#1D9E75" strokeWidth={2.5} dot={false} name="CII with ESDs" connectNulls />
              </LineChart>
            </ResponsiveContainer>
            {/* ESD timeline legend */}
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10, color: '#64748B' }}>
              {esdTimeline.map((t, i) => (
                <span key={i} style={{ background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 3 }}>
                  {t.implementation_label}: {t.name} (+{t.saving_pct}%)
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Graph 4 — Combined */}
      <div className="r-card">
        <div className="r-card-hd">Graph 4: Combined — Sailing + ESD</div>
        <div className="r-card-body">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={combChartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="yr" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
              <Tooltip content={<CIITooltip />} />
              <Line dataKey="req" stroke="#1E293B" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Required" />
              {filterKeys.map((k, i) => (
                <Line
                  key={k} dataKey={k}
                  stroke={SAIL_COLORS[combKeys.indexOf(k) % SAIL_COLORS.length]}
                  strokeWidth={2} dot={false} name={k}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
