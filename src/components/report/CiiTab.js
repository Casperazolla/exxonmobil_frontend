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
<<<<<<< HEAD
=======
  });
  return Object.values(byYear)
    .sort((a, b) => parseInt(a.date) - parseInt(b.date))
    .map(r => ({ ...r, x: parseInt(r.date) }));  // x = year integer
}
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342

  });

  return Object.values(byYear)

    .sort((a, b) => parseInt(a.date) - parseInt(b.date))

    .map(r => ({ ...r, x: parseInt(r.date) }));  // x = year integer

}
 
// Convert monthly data to decimal-year step format for recharts
<<<<<<< HEAD

// Carries attained_cii as step line + required_cii + install flag

=======
// Carries attained_cii as step line + required_cii + install flag
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342
function buildStepLine(monthly) {

  const pts = [];

  (monthly || []).forEach((r, i) => {

    const [yr, mo] = r.date.split('-').map(Number);

    const x = yr + (mo - 1) / 12;

    const prev = i > 0 ? monthly[i - 1] : null;
<<<<<<< HEAD

    const base = { x, req: r.required_cii, install: r.newly_installed?.length > 0 };

    if (i === 0) { pts.push({ ...base, y: r.attained_cii }); return; }

    if (r.attained_cii !== prev?.attained_cii) {

      // Insert step: hold previous value at this x, then drop

      pts.push({ x, req: r.required_cii, y: prev.attained_cii });

      pts.push({ ...base, y: r.attained_cii });

    } else {

      pts.push({ ...base, y: r.attained_cii });

=======
    const base = { x, req: r.required_cii, install: r.newly_installed?.length > 0 };
    if (i === 0) { pts.push({ ...base, y: r.attained_cii }); return; }
    if (r.attained_cii !== prev?.attained_cii) {
      // Insert step: hold previous value at this x, then drop
      pts.push({ x, req: r.required_cii, y: prev.attained_cii });
      pts.push({ ...base, y: r.attained_cii });
    } else {
      pts.push({ ...base, y: r.attained_cii });
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342
    }

  });
<<<<<<< HEAD

=======
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342
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
<<<<<<< HEAD

      x: parseInt(r.date),

=======
      x: parseInt(r.date),
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342
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
<<<<<<< HEAD

      const pt = { x: row.x, req: row.req, d1: row.d1, d2: row.d2, d3: row.d3, d4: row.d4 };

      sailKeys.forEach(k => {

        const match = (sailing[k] || []).find(r => parseInt(r.date) === row.x);

=======
      const pt = { x: row.x, req: row.req, d1: row.d1, d2: row.d2, d3: row.d3, d4: row.d4 };
      sailKeys.forEach(k => {
        const match = (sailing[k] || []).find(r => parseInt(r.date) === row.x);
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342
        if (match) pt[k] = match.attained_cii;

      });

      return pt;

    });

  }, [baselineChartData, sailing, sailKeys]);
 
  // Combined sailing+ESD — build step lines from MONTHLY data per scenario

  // Using buildStepLine per scenario so the monthly ESD drops are visible

  const combStepLines = useMemo(() => {

    const result = {};

    combKeys.forEach(k => {

      result[k] = buildStepLine(combined[k] || []);

<<<<<<< HEAD
    });
=======
  // Combined sailing+ESD — build step lines from MONTHLY data per scenario
  // Using buildStepLine per scenario so the monthly ESD drops are visible
  const combStepLines = useMemo(() => {
    const result = {};
    combKeys.forEach(k => {
      result[k] = buildStepLine(combined[k] || []);
    });
    return result;
  }, [combined, combKeys]);

  // Merge all scenarios into a single dataset aligned on x
  const combChartData = useMemo(() => {
    const allX = new Set();
    combKeys.forEach(k => (combStepLines[k] || []).forEach(p => allX.add(p.x)));
    const sorted = [...allX].sort((a, b) => a - b);
    return sorted.map(x => {
      const pt = { x };
      combKeys.forEach(k => {
        const p = (combStepLines[k] || []).find(r => r.x === x);
        if (p) { pt[k] = p.y; if (!pt.req) pt.req = p.req; }
      });
      return pt;
    });
  }, [combStepLines, combKeys]);
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342

    return result;

  }, [combined, combKeys]);
 
  // Merge all scenarios into a single dataset aligned on x

  const combChartData = useMemo(() => {

    const allX = new Set();

    combKeys.forEach(k => (combStepLines[k] || []).forEach(p => allX.add(p.x)));

    const sorted = [...allX].sort((a, b) => a - b);

    return sorted.map(x => {

      const pt = { x };

      combKeys.forEach(k => {

        const p = (combStepLines[k] || []).find(r => r.x === x);

        if (p) { pt[k] = p.y; if (!pt.req) pt.req = p.req; }

      });

      return pt;

    });

  }, [combStepLines, combKeys]);
 
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
<<<<<<< HEAD
<span className="hd-sub">Attained vs Required CII with grade bands</span>
</div>
<div className="r-card-body">
<ResponsiveContainer width="100%" height={240}>
<LineChart data={baselineChartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
<CartesianGrid stroke="#F1F5F9" strokeOpacity={0.8} vertical={false} />
<XAxis dataKey="x" type="number" scale="linear" tickFormatter={v => {

                    if (!Number.isFinite(v)) return '';

                    const yr = Math.floor(v);

                    const mo = Math.round((v - yr) * 12) + 1;

                    return mo === 1 ? String(yr) : '';

                  }}

                  ticks={baselineChartData.map(r => r.x)}

                  tick={{ fontSize: 10 }}

=======
          <span className="hd-sub">Attained vs Required CII with grade bands</span>
        </div>
        <div className="r-card-body">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={baselineChartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#F1F5F9" strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="x" type="number" scale="linear" tickFormatter={v => {
                    if (!Number.isFinite(v)) return '';
                    const yr = Math.floor(v);
                    const mo = Math.round((v - yr) * 12) + 1;
                    return mo === 1 ? String(yr) : '';
                  }}
                  ticks={baselineChartData.map(r => r.x)}
                  tick={{ fontSize: 10 }}
                />
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
                <XAxis dataKey="x" type="number" scale="linear" tickFormatter={v => {
                    if (!Number.isFinite(v)) return '';
                    const yr = Math.floor(v);
                    const mo = Math.round((v - yr) * 12) + 1;
                    return mo === 1 ? String(yr) : '';
                  }}
                  ticks={sailingChartData.map(r => r.x)}
                  tick={{ fontSize: 10 }}
                />
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
                <XAxis
                  dataKey="x"
                  type="number"
                  scale="linear"
                  domain={esdLine.length ? [Math.floor(esdLine[0].x), Math.ceil(esdLine[esdLine.length-1].x)] : ['auto','auto']}
                  tickFormatter={v => {
                    if (!Number.isFinite(v)) return '';
                    const yr = Math.floor(v);
                    const mo = Math.round((v - yr) * 12) + 1;
                    return mo === 1 ? String(yr) : '';
                  }}
                  ticks={(() => {
                    if (!esdLine.length) return [];
                    const start = Math.floor(esdLine[0].x);
                    const end = Math.ceil(esdLine[esdLine.length-1].x);
                    const tks = [];
                    for (let yr = start; yr <= end; yr++) tks.push(yr);
                    return tks;
                  })()}
                  tick={{ fontSize: 10 }}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [v?.toFixed(4), 'Attained CII']} labelFormatter={l => l?.toFixed(2)} />
                {esdTimeline.map((t, i) => (
                  <ReferenceLine
                    key={i}
                    x={t.implementation_date[0] + (t.implementation_date[1] - 1) / 12}
                    stroke="#F59E0B" strokeWidth={1} strokeDasharray="4 3"
                  />
                ))}
                <Line dataKey="req" stroke="#D97706" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Required CII" connectNulls />
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
              <XAxis
                dataKey="x"
                type="number"
                scale="linear"
                domain={combChartData.length ? [Math.floor(combChartData[0].x), Math.ceil(combChartData[combChartData.length-1].x)] : ['auto','auto']}
                tickFormatter={v => {
                  if (!Number.isFinite(v)) return '';
                  const yr = Math.floor(v);
                  const mo = Math.round((v - yr) * 12) + 1;
                  return mo === 1 ? String(yr) : '';
                }}
                ticks={(() => {
                  if (!combChartData.length) return [];
                  const start = Math.floor(combChartData[0].x);
                  const end = Math.ceil(combChartData[combChartData.length-1].x);
                  const tks = [];
                  for (let yr = start; yr <= end; yr++) tks.push(yr);
                  return tks;
                })()}
                tick={{ fontSize: 10 }}
              />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
              <Tooltip content={<CIITooltip />} />
              <Line dataKey="req" stroke="#1E293B" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Required" />
              {filterKeys.map((k, i) => (
                <Line
                  key={k} dataKey={k}
                  stroke={SAIL_COLORS[combKeys.indexOf(k) % SAIL_COLORS.length]}
                  strokeWidth={2} dot={false} name={k}
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342
                />
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
<XAxis dataKey="x" type="number" scale="linear" tickFormatter={v => {

                    if (!Number.isFinite(v)) return '';

                    const yr = Math.floor(v);

                    const mo = Math.round((v - yr) * 12) + 1;

                    return mo === 1 ? String(yr) : '';

                  }}

                  ticks={sailingChartData.map(r => r.x)}

                  tick={{ fontSize: 10 }}

                />
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
<XAxis

                  dataKey="x"

                  type="number"

                  scale="linear"

                  domain={esdLine.length ? [esdLine[0].x, esdLine[esdLine.length-1].x] : ['auto','auto']}

                  tickFormatter={v => {

                    if (!Number.isFinite(v)) return '';

                    const yr = Math.floor(v);

                    const mo = Math.round((v - yr) * 12) + 1;

                    return mo === 1 ? String(yr) : '';

                  }}

                  ticks={(() => {

                    if (!esdLine.length) return [];

                    const start = esdLine[0].x;

                    const end = esdLine[esdLine.length-1].x;

                    const tks = [];

                    tks.push(start);

                    for (let yr = Math.ceil(start); yr <= Math.floor(end); yr++) tks.push(yr);

                    tks.push(end);

                    return [...new Set(tks)];

                  })()}

                  tick={{ fontSize: 10 }}

                />
<YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
<Tooltip formatter={(v) => [v?.toFixed(4), 'Attained CII']} labelFormatter={l => l?.toFixed(2)} />

                {esdTimeline.map((t, i) => (
<ReferenceLine

                    key={i}

                    x={t.implementation_date[0] + (t.implementation_date[1] - 1) / 12}

                    stroke="#F59E0B" strokeWidth={1} strokeDasharray="4 3"

                  />

                ))}
<Line dataKey="req" stroke="#D97706" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Required CII" connectNulls />
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
<XAxis

                dataKey="x"

                type="number"

                scale="linear"

                domain={combChartData.length ? [combChartData[0].x, combChartData[combChartData.length-1].x] : ['auto','auto']}

                tickFormatter={v => {

                  if (!Number.isFinite(v)) return '';

                  const yr = Math.floor(v);

                  const mo = Math.round((v - yr) * 12) + 1;

                  return mo === 1 ? String(yr) : '';

                }}

                ticks={(() => {

                  if (!combChartData.length) return [];

                  const start = combChartData[0].x;

                  const end = combChartData[combChartData.length-1].x;

                  const tks = [start];

                  for (let yr = Math.ceil(start); yr <= Math.floor(end); yr++) tks.push(yr);

                  tks.push(end);

                  return [...new Set(tks)];

                })()}

                tick={{ fontSize: 10 }}

              />
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
<<<<<<< HEAD

}
 
=======
}
>>>>>>> c290d0eee04ff0a8776f4a1660f1e156ff674342
