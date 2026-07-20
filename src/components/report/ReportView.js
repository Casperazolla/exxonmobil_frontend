import React, { useState } from 'react';
import './report.css';
import FuelTab      from './FuelTab';
import EsdTab       from './EsdTab';
import CiiTab       from './CiiTab';
import FinancialTab from './FinancialTab';
import EuTaxTab     from './EuTaxTab';

const fmt$ = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + Math.round(n).toLocaleString();
  return '$' + Number(n).toFixed(0);
};

const TABS = [
  { key: 'fuel',      label: '⛽ Fuel' },
  { key: 'esd',       label: '⚙️ ESD Results' },
  { key: 'cii',       label: '📈 CII Strategy' },
  { key: 'financial', label: '💰 Financial' },
  { key: 'eutax',     label: '🌿 EU Tax' },
];

export default function ReportView({ reportData, vesselName, onClose }) {
  const [activeTab, setActiveTab] = useState('fuel');

  if (!reportData) return null;

  const out  = reportData.output || reportData;
  const inp  = reportData.input  || {};
  const ps   = out.penalty_summary || {};
  const feu  = out.fuel_eu_penalty || {};
  const esdTotal = (out.esd?.esd_results || []).reduce(
    (s, r) => s + (r.total_annual_savings_usd || 0), 0
  );
  const firstGrade = out.cii?.graph1_baseline?.[0]?.grade || '—';
  const compliant  = feu.compliant !== false;

  const v = inp.vessel || {};
  const vesselMeta = [
    v.vessel_type, 'IMO ' + v.imo_number, 'Built ' + v.build_year,
    v.flag, v.name_of_owner,
  ].filter(Boolean).join(' · ');

  return (
    <div className="report-view">
      {/* Banner */}
      <div className="report-banner">
        <div>
          <div className="vessel-name">{vesselName || v.vessel_name || 'Report'}</div>
          <div className="vessel-meta">{vesselMeta}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 12, alignItems: 'center' }}>
          <span className={`badge badge-green`}>CII Grade {firstGrade}</span>
          {!compliant && <span className="badge badge-red">FuelEU Non-Compliant</span>}
          {reportData.report_id && (
            <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>
              {reportData.report_id}
            </span>
          )}
        </div>
        <div className="banner-kpis">
          <div className="banner-kpi">
            <div className="bk-label">EU Compliance Cost</div>
            <div className="bk-val red">{fmt$(ps.total_eu_compliance_cost_usd)}</div>
            <div style={{ fontSize: 9, color: '#64748B' }}>EUA + FuelEU / yr</div>
          </div>
          <div className="banner-kpi">
            <div className="bk-label">ESD Annual Savings</div>
            <div className="bk-val green">{fmt$(esdTotal)}</div>
            <div style={{ fontSize: 9, color: '#64748B' }}>fuel + EUA + FuelEU / yr</div>
          </div>
          <div className="banner-kpi">
            <div className="bk-label">Payback</div>
            <div className="bk-val green">
              {out.financial?.summary?.payback_years != null
                ? out.financial.summary.payback_years.toFixed(2) + ' yr'
                : '—'}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ marginLeft: 12, background: 'none', border: '1px solid #475569', color: '#94A3B8', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="report-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`report-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="report-content">
        {activeTab === 'fuel'      && <FuelTab      output={out} />}
        {activeTab === 'esd'       && <EsdTab       output={{ ...out, input: inp }} />}
        {activeTab === 'cii'       && <CiiTab       output={out} />}
        {activeTab === 'financial' && <FinancialTab output={out} />}
        {activeTab === 'eutax'     && <EuTaxTab     output={{ ...out, input: inp }} />}
      </div>
    </div>
  );
}
