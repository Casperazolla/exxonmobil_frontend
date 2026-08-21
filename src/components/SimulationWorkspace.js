/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { simulationAPI } from '../services/apiService';
import { generateReport } from '../utils/pdfExport';

// =====================================================================
// HELPERS
// =====================================================================
// Resolves whatever the backend stored for a vessel's cover photo into a
// base64 data URL that jsPDF can embed directly. Handles either shape:
// already a data: URL (what the onboarding form uploads today), or a
// remote URL (e.g. an S3 link) that needs fetching + converting first.
//
// Checks several plausible locations because we don't yet know which one
// (if any) the backend actually echoes back — logs what it checked so this
// is diagnosable from the browser console rather than failing silently.
function findVesselImageRaw({ reportData, vesselMeta, vessel }) {
  const candidates = [
    ['vessel.vessel_image_base64', vessel?.vessel_image_base64],
    ['vessel.vessel_image', vessel?.vessel_image],
    ['vessel.image_url', vessel?.image_url],
    ['vessel.vessel_image_url', vessel?.vessel_image_url],
    ['reportData.input.vessel_image_base64', reportData?.input?.vessel_image_base64],
    ['reportData.input.vessel_image', reportData?.input?.vessel_image],
    ['reportData.output.vessel_image_base64', reportData?.output?.vessel_image_base64],
    ['reportData.vessel_image_base64', reportData?.vessel_image_base64],
    ['vesselMeta.vessel_image_base64', vesselMeta?.vessel_image_base64],
    ['vesselMeta.vessel.vessel_image_base64', vesselMeta?.vessel?.vessel_image_base64],
    ['vesselMeta.vessel_image', vesselMeta?.vessel_image],
    ['vesselMeta.image_url', vesselMeta?.image_url],
  ];
  const found = candidates.find(([, val]) => !!val);
  if (found) {
    console.log(`[PDF export] Vessel image found at "${found[0]}"`);
    return found[1];
  }
  console.warn(
    '[PDF export] No vessel image field found on the report/vessel data. Checked:',
    candidates.map(([path]) => path),
    '\nIf you uploaded a photo when onboarding this vessel, this means the backend is not ' +
    'persisting/returning it on this endpoint — check the Network tab response for the report ' +
    'or vessel-meta request and see which field (if any) actually comes back.'
  );
  return null;
}

async function resolveVesselImageB64(ctx) {
  const raw = findVesselImageRaw(ctx);
  if (!raw) return null;
  if (raw.startsWith('data:image')) return raw;
  try {
    const res = await fetch(raw);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load vessel image for PDF:', e.message);
    return null;
  }
}

const fmt$ = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n/1e6).toFixed(2)+'M';
  if (abs >= 1e3) return '$' + Math.round(n).toLocaleString();
  return '$' + Number(n).toFixed(0);
};
const fmtN = (n, dec=0) =>
  n != null ? Number(n).toLocaleString(undefined,{maximumFractionDigits:dec}) : '—';

const INSTALL_DEFAULTS = {
  hull:       {lead:8,  req:'docking'},
  propulsion: {lead:7,  req:'docking'},
  engine:     {lead:5,  req:'in_sailing'},
  auxiliary:  {lead:4,  req:'in_sailing'},
  operations: {lead:4,  req:'in_sailing'},
};
const iDef = (cat) => INSTALL_DEFAULTS[(cat||'').toLowerCase()] || INSTALL_DEFAULTS.operations;

const FUEL_BG = {HFO:'#FEF3C7',MDO:'#EFF6FF',LNG:'#D1FAE5',LFO:'#F5F3FF'};
const FUEL_CL = {HFO:'#92400E',MDO:'#1D4ED8',LNG:'#065F46',LFO:'#7C3AED'};
const CAT_CLASS = {propulsion:'bx-b',hull:'bx-b',engine:'bx-g',auxiliary:'bx-p',operations:'bx-a'};



// ── Fuel Tab ─────────────────────────────────────────────────────────
function FuelTab({ out }) {
  const fs = out?.fuel_summary || {};
    const ps     = out?.penalty_summary || {};


  const total = fs.total_consumption_mt || 1;
  return (
    <div className="rwrap">
      <div className="g4" style={{marginBottom:14}}>
        <div className="kpi"><div className="kpi-l">Total Consumption</div><div className="kpi-v">{fmtN(fs.total_consumption_mt,0)} MT</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">Total Fuel Cost</div><div className="kpi-v g">{fmt$(fs.total_fuel_cost_usd)}</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">EU COMPLIANCE COST</div><div className="kpi-v">{fmt$(ps.total_eu_compliance_cost_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Machines</div><div className="kpi-v">{(fs.machine_breakdown||[]).length}</div></div>
      </div>
      <div className="g2">
        <div className="card"><div className="card-hd"><span className="card-title">Fuel Breakdown</span></div>
          <table className="tbl"><thead><tr><th>Fuel</th><th className="r">Price</th><th className="r">MT</th><th className="r">Total Cost</th><th className="r">Share</th></tr></thead>
          <tbody>
            {(fs.fuel_summary||[]).map((f,i)=>(
              <tr key={i}>
                <td><span style={{display:'inline-block',padding:'2px 6px',borderRadius:3,fontSize:9,fontWeight:700,background:FUEL_BG[f.fuel_name]||'#F1F5F9',color:FUEL_CL[f.fuel_name]||'#475569'}}>{f.fuel_name}</span></td>
                <td className="r">${fmtN(f.fuel_price_usd_per_mt,0)}</td>
                <td className="r">{fmtN(f.consumption_mt,0)}</td>
                <td className="r">{fmt$(f.total_cost_usd)}</td>
                <td className="r">{((f.consumption_mt/total)*100).toFixed(1)}%</td>
              </tr>
            ))}
            <tr className="tbl-tot"><td><b>Total</b></td><td className="r">—</td><td className="r">{fmtN(total,0)}</td><td className="r"><b>{fmt$(fs.total_fuel_cost_usd)}</b></td><td className="r">100%</td></tr>
          </tbody></table>
        </div>
        <div className="card"><div className="card-hd"><span className="card-title">Machine Breakdown</span></div>
          <table className="tbl"><thead><tr><th>Machine</th><th>Fuel</th><th className="r">MT</th><th className="r">Cost</th></tr></thead>
          <tbody>
            {(fs.machine_breakdown||[]).flatMap((m,mi)=>
              (m.fuels||[]).map((f,fi)=>(
                <tr key={`${mi}-${fi}`}>
                  {fi===0&&<td rowSpan={m.fuels.length}><b>{m.machine_name}</b></td>}
                  <td><span style={{display:'inline-block',padding:'2px 6px',borderRadius:3,fontSize:9,fontWeight:700,background:FUEL_BG[f.fuel_name]||'#F1F5F9',color:FUEL_CL[f.fuel_name]||'#475569'}}>{f.fuel_name}</span></td>
                  <td className="r">{fmtN(f.consumption_mt,0)}</td>
                  <td className="r">{fmt$(f.total_cost_usd)}</td>
                </tr>
              ))
            )}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

// ── ESD Tab ───────────────────────────────────────────────────────────
function EsdTab({ out }) {
  const [fuelFilter, setFuelFilter] = useState('HFO');
  const esd   = out?.esd || {};
  const esds  = esd.esd_results || [];
  const sum   = esd.summary || {};
  const sens  = out?.payback_sensitivity || {};
  const ranges= sens.fuel_type_ranges || {};
  const sensItems = sens.esd_sensitivity || [];
  const activeFuels = sens.active_fuel_types || Object.keys(ranges);
  const prices = ranges[fuelFilter] || [];
  const curPrice = out?.input?.machines?.flatMap(m=>m.fuel_particulars||[]).find(fp=>fp.fuel_name===fuelFilter)?.fuel_price_usd_per_mt;
  const curIdx = prices.indexOf(curPrice);
  const esdTotal = esds.reduce((s,r)=>s+(r.total_annual_savings_usd||0),0);

  const payCell = (v,isCur) => {
    let bg=''; let cl='';
    if(v<=1.5){bg='#D1FAE5';cl='#065F46';}
    else if(v<=3){bg='#FEF3C7';cl='#92400E';}
    else{bg='#FEE2E2';cl='#991B1B';}
    return <td key={v} style={{textAlign:'center',background:bg,color:cl,fontWeight:600,fontSize:10,
      outline:isCur?'2px solid #D97706':'none',outlineOffset:-2}}>{v?.toFixed(1)}y</td>;
  };

  return (
    <div className="rwrap">
      <div className="g4" style={{marginBottom:14}}>
        <div className="kpi"><div className="kpi-l">Investment</div><div className="kpi-v">{fmt$(sum.total_cost_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Fuel Savings</div><div className="kpi-v g">{fmtN(sum.total_fuel_savings_mt_all,0)}  MT</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">CO₂ Reduction</div><div className="kpi-v g">{fmtN(sum.total_co2_reduction_mt,0)}  T</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">Annual Savings</div><div className="kpi-v g">{fmt$(esdTotal)}</div><div className="kpi-s">fuel+EUA+FuelEU</div></div>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div className="card-hd"><span className="card-title">ESD Performance</span><span style={{fontSize:10,color:'var(--ink3)'}}>Payback (EU) = cost ÷ (fuel + EUA + FuelEU savings)</span></div>
        <div style={{overflowX:'auto'}}><table className="tbl">
          <thead><tr><th>ESD</th><th>Category</th><th>Install</th><th className="r">Lead</th><th className="r">Cost</th><th className="r">Saving%</th><th className="r">Fuel MT</th><th className="r">Fuel $</th><th className="r">EUA $</th><th className="r">FuelEU $</th><th className="r">Total/yr</th><th className="r">Payback(EU)</th></tr></thead>
          <tbody>
            {esds.map((e,i)=>{
              const fuelRows=Object.entries(e.fuel_savings_mt||{});
              return(
              <tr key={i}>
                <td><b>{e.tech_name}</b></td>
                <td><span className={`bx ${CAT_CLASS[e.category]||'bx-gray'}`}>{e.category}</span></td>
                <td><span className={`bx ${e.installation_req==='docking'?'bx-a':'bx-gray'}`}>{e.installation_req?.replace('_','-')}</span></td>
                <td className="r" style={{fontSize:10,color:'var(--ink3)'}}>{e.lead_time_months || '—'}mo</td>
                <td className="r">{fmt$(e.cost_usd)}</td>
                <td className="r">{e.calculated_saving_pct?.toFixed(2)}%</td>
                <td>
                  {fuelRows.length?(
                    <table style={{borderCollapse:'collapse',fontSize:10,marginLeft:'auto',border:'1px solid var(--bd)'}}>
                      <tbody>
                        {fuelRows.map(([fn,mt],fi)=>(
                          <tr key={fi} style={{borderBottom:fi<fuelRows.length-1?'1px solid var(--bd)':'none'}}>
                            <td style={{padding:'1px 6px',color:'var(--ink3)',fontWeight:600,borderRight:'1px solid var(--bd)'}}>{fn}</td>
                            <td style={{padding:'1px 6px',textAlign:'right',fontFamily:'IBM Plex Mono,monospace'}}>{fmtN(mt,0)} MT</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ):<span style={{color:'var(--ink3)'}}>—</span>}
                </td>
                <td className="r">{fmt$(e.annual_cost_savings_usd)}</td>
                <td className="r">{fmt$(e.ets_savings_usd)}</td>
                <td className="r">{fmt$(e.fuel_eu_savings_usd)}</td>
                <td className="r"><b>{fmt$(e.total_annual_savings_usd)}</b></td>
                <td className="r" style={{color:'var(--green)',fontWeight:600}}>{e.payback_with_ets_years?.toFixed(2)} yr</td>
              </tr>
            );})}
            <tr className="tbl-tot">
              <td colSpan={6}><b>TOTAL</b></td>
              <td className="r">{fmtN(sum.total_fuel_savings_mt_all,0)} MT</td>
              <td className="r">{fmt$(sum.total_annual_cost_savings)}</td>
              <td className="r">{fmt$(sum.total_ets_savings_usd)}</td>
              <td className="r">{fmt$(esds.reduce((s,r)=>s+(r.fuel_eu_savings_usd||0),0))}</td>
              <td className="r"><b>{fmt$(esdTotal)}</b></td>
              <td className="r">—</td>
            </tr>
          </tbody>
        </table></div>
      </div>
      
      {sensItems.length>0&&(() => {
        // Shared setup for both sensitivity tables (incl-EU and fuel-only).
        const allMachineFuels = [...new Set(
          (out?.input?.machines || []).flatMap(m => (m.fuel_particulars || []).map(fp => fp.fuel_name))
        )];
        const allFuels  = [...new Set([...allMachineFuels, ...activeFuels])];
        const mainFuel  = activeFuels[0] || allFuels[0] || 'HFO';
        const mainPrices= ranges[mainFuel] || [];
        const numCases  = mainPrices.length || 13;
        const priceOf = (fuelName) => out?.input?.machines?.flatMap(m=>m.fuel_particulars||[])
          .find(fp=>fp.fuel_name===fuelName)?.fuel_price_usd_per_mt;
        const mainCurPrice = sens.current_fuel_prices?.[mainFuel] ?? priceOf(mainFuel);

        const generatePriceRange = (fuelName, cp) => {
          const base = cp || 500;
          const step = Math.round(base * 0.08);
          const start = Math.round(base - 6 * step);
          return Array.from({length: numCases}, (_, i) => Math.max(50, start + i * step));
        };

        // Build the column model: 13 preset cases + one "Current" column,
        // ordered inline by the MAIN fuel's price. Every row renders against
        // this so the Current column sits in price order across the whole table.
        // insertAt = index in the preset list where current price slots in.
        const insertAt = (mainCurPrice!=null)
          ? mainPrices.filter(p => p < mainCurPrice).length
          : -1;
        // columns: {type:'preset', caseIdx} | {type:'current'}
        const columns = [];
        for (let i=0;i<numCases;i++){
          if(i===insertAt) columns.push({type:'current'});
          columns.push({type:'preset', caseIdx:i});
        }
        if(insertAt>=numCases || insertAt===-1 && mainCurPrice!=null) columns.push({type:'current'});

        const heatBg = (v) => {
          if(v==null) return {bg:'',cl:'var(--ink3)'};
          if(v<=1.5) return {bg:'#D1FAE5',cl:'#065F46'};
          if(v<=3)   return {bg:'#FEF3C7',cl:'#92400E'};
          return {bg:'#FEE2E2',cl:'#991B1B'};
        };
        const num = (v) => typeof v === 'number' ? v : null;

        // Renders one heatmap. caseKey picks which per-ESD array to read;
        // overallArr is the fleet-level per-scenario Overall row;
        // curEsdKey / overallCur read the exact real-price (Current) values.
        const renderTable = (caseKey, overallArr, curEsdKey, overallCur) => (
          <table style={{borderCollapse:'collapse',fontSize:10.5,width:'100%'}}>
            <thead>
              <tr style={{background:'#1D9E75'}}>
                <th style={{padding:'6px 10px',textAlign:'left',fontWeight:600,fontSize:10,color:'#fff',minWidth:200}}>Case #</th>
                {columns.map((col,ci)=>col.type==='current'
                  ? <th key={ci} style={{padding:'6px 8px',textAlign:'center',fontWeight:700,fontSize:10,color:'#92400E',background:'#FDE68A'}}>Current</th>
                  : <th key={ci} style={{padding:'6px 8px',textAlign:'center',fontWeight:700,fontSize:10,color:'#fff'}}>{col.caseIdx+1}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Bunker cost rows for ALL fuel types */}
              {allFuels.map((fuelType) => {
                const fPrices  = ranges[fuelType] || generatePriceRange(fuelType, priceOf(fuelType));
                const fCurPrice= sens.current_fuel_prices?.[fuelType] ?? priceOf(fuelType);
                return (
                  <tr key={'bc-'+fuelType} style={{background:'#FEF3C7'}}>
                    <td style={{padding:'5px 10px',fontWeight:600,fontSize:10,color:'#1A1A1A'}}>{fuelType}</td>
                    {columns.map((col,ci)=>col.type==='current'
                      ? <td key={ci} style={{padding:'5px 8px',textAlign:'center',fontWeight:700,fontSize:10,color:'#1A1A1A',background:'#FDE68A'}}>{fCurPrice!=null?fCurPrice:'—'}</td>
                      : <td key={ci} style={{padding:'5px 8px',textAlign:'center',fontWeight:600,fontSize:10,color:'#1A1A1A'}}>{fPrices[col.caseIdx]}</td>
                    )}
                  </tr>
                );
              })}
              {/* Per-ESD payback rows */}
              {sensItems.map((e,ri) => {
                const curVal = num(e[curEsdKey]);
                const cur = heatBg(curVal);
                return (
                  <tr key={ri} style={{borderBottom:'1px solid var(--bd)'}}>
                    <td style={{padding:'5px 10px',fontWeight:500}}><b style={{color:'var(--ink3)',marginRight:6}}>{ri+1}</b> {e.tech_name}</td>
                    {columns.map((col,ci)=>{
                      if(col.type==='current'){
                        return <td key={ci} style={{textAlign:'center',fontWeight:700,fontSize:10.5,color:cur.cl,background:cur.bg||'#FEF3C7',borderRight:'1px solid var(--bd)',outline:'2px solid #F59E0B',outlineOffset:-2}}>{curVal!=null?curVal.toFixed(1):'—'}</td>;
                      }
                      const v=num((e[caseKey]||[])[col.caseIdx]);
                      const h=heatBg(v);
                      return <td key={ci} style={{textAlign:'center',background:h.bg,color:h.cl,fontWeight:v!=null?600:400,fontSize:10.5,borderRight:'1px solid var(--bd)'}}>{v!=null?v.toFixed(1):'—'}</td>;
                    })}
                  </tr>
                );
              })}
              {/* Overall row: total investment ÷ total yearly savings */}
              <tr style={{background:'#ECFDF5',borderTop:'2px solid var(--green)'}}>
                <td style={{padding:'6px 10px',fontWeight:700,fontSize:10.5,color:'#065F46'}}>Overall (Investment ÷ Yearly Savings)</td>
                {columns.map((col,ci)=>{
                  if(col.type==='current'){
                    const cv=num(overallCur);
                    return <td key={ci} style={{textAlign:'center',fontWeight:800,fontSize:10.5,color:'#92400E',background:'#FDE68A',borderRight:'1px solid var(--bd)'}}>{cv!=null?cv.toFixed(1):'—'}</td>;
                  }
                  const v=num((overallArr||[])[col.caseIdx]);
                  return <td key={ci} style={{textAlign:'center',fontWeight:700,fontSize:10.5,color:'#065F46',borderRight:'1px solid var(--bd)'}}>{v!=null?v.toFixed(1):'—'}</td>;
                })}
              </tr>
            </tbody>
          </table>
        );

        return (
          <>
            <div className="card" style={{marginBottom:14}}>
              <div className="card-hd">
                <div>
                  <div className="card-title">Payback Period (incl. EU Tax) as a Function of Fuel Cost</div>
                  <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>13 bunker price scenarios. EU savings (EUA + FuelEU) held constant — only fuel price varies. The blue "Current" column uses your exact input price.</div>
                </div>
              </div>
              <div style={{overflowX:'auto',padding:'0 1px'}}>
                {renderTable('payback_by_case', sens.overall_payback_by_case, 'current_payback_with_eu', sens.overall_current_payback)}
              </div>
            </div>
            <div className="card">
              <div className="card-hd">
                <div>
                  <div className="card-title">Payback Period (Fuel Cost Saving Only) as a Function of Fuel Cost</div>
                  <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>13 bunker price scenarios. EU savings (EUA + FuelEU) excluded — payback from fuel cost savings alone. The blue "Current" column uses your exact input price.</div>
                </div>
              </div>
              <div style={{overflowX:'auto',padding:'0 1px'}}>
                {renderTable('payback_fuel_only_by_case', sens.overall_payback_fuel_only_by_case, 'current_payback_fuel_only', sens.overall_current_payback_fuel_only)}
              </div>
            </div>
          </>
        );
      })()}
      
      <div className="card" style={{marginBottom:14}}>
        <div className="card-hd">
          <span className="card-title">Annual Savings Split</span>
          <div style={{display:'flex',gap:10,fontSize:9}}>
            <span><span style={{display:'inline-block',width:8,height:8,background:'var(--green)',borderRadius:1,marginRight:3}}/> Fuel</span>
            <span><span style={{display:'inline-block',width:8,height:8,background:'var(--blue)',borderRadius:1,marginRight:3}}/> EUA</span>
            <span><span style={{display:'inline-block',width:8,height:8,background:'var(--purple)',borderRadius:1,marginRight:3}}/> FuelEU</span>
          </div>
        </div>
        <div className="card-body">
          {esds.map((e,i)=>{
            const tot=e.total_annual_savings_usd||1;
            const fp=((e.annual_cost_savings_usd||0)/tot*100).toFixed(0);
            const ep=((e.ets_savings_usd||0)/tot*100).toFixed(0);
            const up=((e.fuel_eu_savings_usd||0)/tot*100).toFixed(0);
            return(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                  <span style={{fontWeight:600}}>{e.tech_name}</span>
                  <span style={{fontFamily:'IBM Plex Mono,monospace',color:'var(--green)'}}>{fmt$(tot)} / yr</span>
                </div>
                <div className="ss-bar"><div className="ss-f" style={{width:`${fp}%`}}/><div className="ss-e" style={{width:`${ep}%`}}/><div className="ss-u" style={{width:`${up}%`}}/></div>
              </div>
            );
          })}
        </div>
      </div>
      
          </div>
  );
}

// ── ESD Schedule Info (hover tooltip on graph headers) ──────────────────
// Shows the dynamic ESD implementation schedule from the timeline data.
function EsdScheduleInfo({ timeline }) {
  const [open, setOpen] = useState(false);
  if (!timeline || timeline.length === 0) return null;
  return (
    <span
      style={{position:'relative',display:'inline-flex',alignItems:'center'}}
      onMouseEnter={()=>setOpen(true)}
      onMouseLeave={()=>setOpen(false)}
    >
      <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:'50%',background:'#EFF6FF',color:'#1D4ED8',fontSize:10,fontWeight:700,fontStyle:'italic',cursor:'help',border:'1px solid #BFDBFE'}}>i</span>
      {open&&(
        <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:20,minWidth:220,background:'#fff',border:'1px solid var(--bd)',borderRadius:6,boxShadow:'0 4px 16px rgba(0,0,0,.12)',padding:'10px 12px'}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',color:'var(--ink3)',marginBottom:6}}>ESD Implementation Schedule</div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {timeline.map((t,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:10.5,alignItems:'baseline'}}>
                <span style={{color:'var(--ink2)'}}><b style={{color:'#92400E',fontFamily:'IBM Plex Mono,monospace',marginRight:6}}>{t.implementation_label}</b>{t.name}</span>
                <span style={{color:'var(--green)',fontWeight:600,whiteSpace:'nowrap'}}>+{t.saving_pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

// ── CII Tab ────────────────────────────────────────────────────────────
// Uses Chart.js loaded from CDN — we inject canvas elements and init charts
function CiiTab({ out }) {
  const [sailFilter, setSailFilter] = useState('all');
  const chartsRef = useRef({});
  const cii = out?.cii || {};
  const baseline = cii.graph1_baseline || [];
  const sailing  = cii.graph2_sailing  || {};
  const esdData  = cii.graph3_esd      || {};
  const combined = cii.graph4_combined?.scenarios || cii.graph4_combined || {};
  const [showCiiMonthly, setShowCiiMonthly] = useState(false);
  const sailKeys = Object.keys(sailing);
  const esdTimeline = esdData.esd_timeline || [];

  // Annual dedup
  const annualOf = (arr) => {
    const m={};
    (arr||[]).forEach(r=>{ const y=parseInt(r.date); if(!m[y])m[y]=r; });
    return Object.values(m).sort((a,b)=>parseInt(a.date)-parseInt(b.date));
  };

  const GRADE_COLS = {A:'rgba(46,160,84,.5)',B:'rgba(144,208,144,.6)',C:'rgba(245,230,74,.5)',D:'rgba(245,197,163,.65)',E:'rgba(240,128,128,.6)'};
  const SAIL_COLORS= ['#3B82F6','#8B5CF6','#EC4899','#06B6D4','#F59E0B'];
  const annualBounds = annualOf(baseline);

  const buildChart = useCallback((id, data, extra={}) => {
    if(!window.Chart) return;
    const canvas = document.getElementById('sim-'+id);
    if(!canvas) return;
    if(chartsRef.current[id]) { try{chartsRef.current[id].destroy();}catch(e){} }

    // Grade band plugin — draws staircase rectangles PER YEAR
    // Each year has its own d1/d2/d3/d4 boundaries → bands narrow over time
    const gradeBandsPlugin = {
      id:'gradeBands',
      beforeDatasetsDraw(chart) {
        const {ctx,chartArea:ca,scales:{x,y}} = chart;
        if(!x||!y||!ca||!annualBounds.length) return;
        const GCOLS = {A:'rgba(46,160,84,.50)',B:'rgba(144,208,144,.60)',C:'rgba(245,230,74,.50)',D:'rgba(245,197,163,.65)',E:'rgba(240,128,128,.60)'};
        ctx.save();
        const isLinear = x.type === 'linear' || x.type === 'timeseries';
        const n = annualBounds.length;
        
        annualBounds.forEach((ab, idx) => {
          let xL, xR;
          
          if (isLinear) {
            const yr = parseInt(ab.date);
            const nextYr = idx < n - 1 ? parseInt(annualBounds[idx + 1].date) : yr + 1;
            xL = Math.max(ca.left, x.getPixelForValue(yr));
            xR = Math.min(ca.right, x.getPixelForValue(nextYr));
          } else {
            // Category axis: band goes from THIS year's label to NEXT year's label
            // so the transition happens exactly AT the year tick mark
            const thisX = x.getPixelForValue(idx);
            const nextX = idx < n - 1 ? x.getPixelForValue(idx + 1) : ca.right + (thisX - x.getPixelForValue(Math.max(0, idx - 1)));
            const prevX = idx > 0 ? x.getPixelForValue(idx - 1) : ca.left - (x.getPixelForValue(1) - thisX);
            // Each band: from midpoint-before to THIS label, then from THIS label to midpoint-after
            // NO — transition AT the year: from this label to next label
            xL = idx === 0 ? ca.left : thisX;
            xR = idx === n - 1 ? ca.right : nextX;
          }
          
          if(xR <= xL || isNaN(xL) || isNaN(xR)) return;
          const w = xR - xL;
          
          [
            {from:0, to:ab.d1, c:GCOLS.A},
            {from:ab.d1, to:ab.d2, c:GCOLS.B},
            {from:ab.d2, to:ab.d3, c:GCOLS.C},
            {from:ab.d3, to:ab.d4, c:GCOLS.D},
            {from:ab.d4, to:99, c:GCOLS.E}
          ].forEach(z => {
            const yT = y.getPixelForValue(z.to);
            const yB = y.getPixelForValue(z.from);
            if(isNaN(yT)||isNaN(yB)) return;
            const top = Math.max(ca.top, Math.min(yT, yB));
            const bot = Math.min(ca.bottom, Math.max(yT, yB));
            if(bot > top) { ctx.fillStyle=z.c; ctx.fillRect(xL, top, w, bot-top); }
          });
        });
        ctx.restore();
      }
    };

    chartsRef.current[id] = new window.Chart(canvas, {type:'line', data, 
      plugins: extra.useGradeBands ? [gradeBandsPlugin] : [],
      options:{
      responsive:true, maintainAspectRatio:false,
      // Render the canvas bitmap at 3x its CSS size regardless of the
      // screen's actual pixel ratio — otherwise a 1x display produces a
      // low-res source image that looks blurry once stretched into the PDF.
      devicePixelRatio:3,
      animation:{duration:300},
      plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12}},
               tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(4)}`}}},
      scales:{
        x: extra.overrideX || {grid:{display:false},ticks:{font:{size:10}}, ...(extra.scales?.x||{})},
        y:{grid:{color:'rgba(0,0,0,.04)',drawBorder:false},ticks:{font:{size:10}},
          ...(extra.yMin!=null?{min:extra.yMin}:{}),
          ...(extra.yMax!=null?{max:extra.yMax}:{}),
          ...(extra.scales?.y||{})}
      },
    }});
  }, [annualBounds]);

  const rebuildAll = useCallback(() => {
    if(!window.Chart) return;
    const annual = annualOf(baseline);
    const labels = annual.map(r=>parseInt(r.date));

    // ── Shared y-axis bounds for ALL 4 graphs ──
    // Dynamic y-axis: ensure ALL 5 grade bands are always visible
    // Dynamic y-axis: must show ALL grade bands + all attained CII values
    // Collects from baseline (G1), ESD monthly (G3), and combined (G4)
    const allD4 = annual.map(r => r.d4).filter(v => v != null);
    const allD1 = annual.map(r => r.d1).filter(v => v != null);
    const allAttained = annual.map(r => r.attained_cii).filter(v => v != null);
    // Also include ESD monthly attained values (they may be lower than baseline)
    const esdMonthlyData = (cii.graph3_esd?.monthly_data || []);
    const esdAttained = esdMonthlyData.map(r => r.attained_cii).filter(v => v != null);
    // Also include combined scenario attained values
    const combData = cii.graph4_combined?.scenarios || cii.graph4_combined || {};
    const combAttained = Object.values(combData).flat().map(r => r?.attained_cii).filter(v => v != null);

    const allValues = [...allD4, ...allD1, ...allAttained, ...esdAttained, ...combAttained];
    const dataMax = allValues.length > 0 ? Math.max(...allValues) : 5.4;
    const dataMin = allValues.length > 0 ? Math.min(...allValues) : 2.0;
    // If attained > d4, yMax must be above attained value
    const yMax = Math.ceil((dataMax + 0.5) * 2) / 2;   // round up to nearest 0.5
    const yMin = Math.floor((dataMin - 0.5) * 2) / 2;  // round down to nearest 0.5
    const yBounds = {yMin, yMax};
    const fixedYScale = {min:yMin, max:yMax};

    // ── Shared CII_R dataset style (dashed + dots at each year) ──
    const makeCiiReq = (dataArr) => ({
      label:'CII_R (Required)',
      data: dataArr,
      borderColor:'#D97706',
      borderDash:[8,4],
      borderWidth:1.5,
      pointRadius:3,
      pointStyle:'circle',
      pointBackgroundColor:'#D97706',
      pointBorderColor:'#92400E',
      pointBorderWidth:1,
      stepped:'before',
      fill:false,
      tension:0,
    });

    // G1 — Baseline CII (no ESDs)
    const g1Data = {
      labels,
      datasets:[
        {label:'Attained CII (current, no ESDs)',data:annual.map(r=>r.attained_cii),borderColor:'#1A1A1A',borderWidth:2.5,pointRadius:3,pointStyle:'rectRot',pointBackgroundColor:'#1A1A1A',tension:0,fill:false},
        makeCiiReq(annual.map(r=>r.required_cii)),
      ]
    };
    buildChart('g1',g1Data,{useGradeBands:true,...yBounds});

    // G2 — Sailing scenarios
    const sailKeys2 = sailFilter==='all'?sailKeys:[sailFilter];
    const g2Datasets=[
      makeCiiReq(labels.map(yr=>annualOf(baseline).find(r=>parseInt(r.date)===yr)?.required_cii)),
      {label:'Baseline (no ESDs, '+((annualOf(baseline)[0]||{}).attained_cii||'').toString().slice(0,4)+')',data:labels.map(yr=>annualOf(baseline).find(r=>parseInt(r.date)===yr)?.attained_cii),borderColor:'#1A1A1A',borderWidth:2,borderDash:[4,4],pointRadius:0,fill:false,tension:0},
    ];
    sailKeys2.forEach((k,i)=>{
      const arr=annualOf(sailing[k]||[]);
      g2Datasets.push({label:k+' sailing',data:labels.map(yr=>arr.find(r=>parseInt(r.date)===yr)?.attained_cii),borderColor:SAIL_COLORS[sailKeys.indexOf(k)%SAIL_COLORS.length],borderWidth:1.5,pointRadius:3,pointBackgroundColor:SAIL_COLORS[sailKeys.indexOf(k)%SAIL_COLORS.length],fill:false,tension:0});
    });
    buildChart('g2',{labels,datasets:g2Datasets},{useGradeBands:true,...yBounds});

    // G3 — ESD step-down (MONTHLY — shows CII drop as each ESD installs)
    const esdMonthly = esdData.monthly_data || [];
    // Convert monthly dates to numeric x values for linear axis
    const esdPts = esdMonthly.map(r => {
      const [yr,mo] = r.date.split('-').map(Number);
      return { x: yr + (mo-1)/12, y: r.attained_cii };
    });
    // Baseline as flat line across same range
    const baseAttained = baseline.length > 0 ? baseline[0].attained_cii : null;
    const basePts = esdPts.map(p => ({ x: p.x, y: baseAttained }));
    // Required CII line (steps per year)
    const reqPts = esdMonthly.map(r => {
      const [yr,mo] = r.date.split('-').map(Number);
      return { x: yr + (mo-1)/12, y: r.required_cii };
    });
    // One dot per year (January), not one per month — matches G2's look
    const reqPointRadii = esdMonthly.map((r,i) => {
      const mo = parseInt(r.date.split('-')[1], 10);
      return (mo === 1 || i === 0) ? 3 : 0;
    });
    // Mark months where new ESDs become active
    const esdInstallPts = esdMonthly
      .filter(r => r.newly_installed && r.newly_installed.length > 0)
      .map(r => {
        const [yr,mo] = r.date.split('-').map(Number);
        return { x: yr + (mo-1)/12, y: r.attained_cii };
      });

    // Shared x-range across EVERY series that can appear on g3/g4 — baseline
    // years, ESD monthly points, AND every combined-scenario's monthly points
    // (not just esdPts, and not just the currently-filtered scenario). This
    // guarantees g3/g4 span at least as far as g1/g2 even if graph3_esd or
    // graph4_combined weren't extrapolated as far forward on the backend.
    const allCombinedXs = Object.values(combined).flatMap(arr =>
      (arr || []).map(r => {
        const [yr, mo] = r.date.split('-').map(Number);
        return yr + (mo - 1) / 12;
      })
    );
    const sharedXs = [
      ...labels,
      ...esdPts.map(p => p.x),
      ...allCombinedXs,
    ].filter(Number.isFinite);

    const g3XMin = sharedXs.length > 0 ? Math.min(...sharedXs) : labels[0];
    const g3XMax = sharedXs.length > 0 ? Math.max(...sharedXs) : labels[labels.length-1];

    // Explicit integer-year ticks — don't rely on Chart.js's auto step-size
    // picker, which can choose a non-integer step for a fractional range
    // like 2026 → 2030.92 and silently skip the year-aligned tick.
    const yearTicks = [];
    for (let yr = Math.floor(g3XMin); yr <= Math.ceil(g3XMax); yr++) yearTicks.push(yr);
    const forceYearTicks = axis => {
      axis.ticks = yearTicks.map(yr => ({ value: yr }));
    };

    buildChart('g3',{datasets:[
      {label:'Baseline (no ESDs)',data:basePts,borderColor:'#1A1A1A',borderDash:[6,4],borderWidth:1.5,pointRadius:0,fill:false,tension:0,parsing:false},
      {label:'CII_R (Required)',data:reqPts,borderColor:'#D97706',borderDash:[8,4],borderWidth:2.0,pointRadius:reqPointRadii,pointBackgroundColor:'#D97706',fill:false,tension:0,stepped:'before',parsing:false},
      {label:'With ESDs',data:esdPts,borderColor:'#2563EB',borderWidth:2.5,pointRadius:0,fill:false,tension:0,stepped:'before',parsing:false},
      {label:'ESD Installed',data:esdInstallPts,borderColor:'#065F46',borderDash:[8,4],borderWidth:1.5,pointRadius:3,pointBackgroundColor:'#065F46',fill:false,tension:0,stepped:'before',parsing:false},
    ]},{useGradeBands:true,yMin:yBounds.yMin,yMax:yBounds.yMax,
      overrideX:{type:'linear',min:g3XMin,max:g3XMax,grid:{display:false},afterBuildTicks:forceYearTicks,ticks:{font:{size:10},autoSkip:false,callback:v=>{const yr=Math.floor(v);const mo=Math.round((v-yr)*12)+1;return mo===1?yr:mo===7?'Jul':''}}}
    });

    // G4 — Combined (sailing + ESD) — MONTHLY to show ESD drop effect
    const combKeys2=sailFilter==='all'?Object.keys(combined):[sailFilter];
    const g4Ds=[
      {label:'Baseline (no ESDs)',data:basePts,borderColor:'#1A1A1A',borderDash:[6,4],borderWidth:1.5,pointRadius:0,fill:false,tension:0,parsing:false},
      {label:'CII_R (Required)',data:reqPts,borderColor:'#D97706',borderDash:[8,4],borderWidth:1.5,pointRadius:reqPointRadii,pointBackgroundColor:'#D97706',fill:false,tension:0,stepped:'before',parsing:false},
    ];
    combKeys2.forEach((k,ki)=>{
      const scData = (combined[k]||[]).map(r => {
        const [yr,mo] = r.date.split('-').map(Number);
        return { x: yr + (mo-1)/12, y: r.attained_cii };
      });
      g4Ds.push({label:k+' + ESDs',data:scData,borderColor:SAIL_COLORS[Object.keys(combined).indexOf(k)%SAIL_COLORS.length],borderWidth:1.5,pointRadius:0,fill:false,tension:0,stepped:'before',parsing:false});
    });
    buildChart('g4',{datasets:g4Ds},{useGradeBands:true,yMin:yBounds.yMin,yMax:yBounds.yMax,
      overrideX:{type:'linear',min:g3XMin,max:g3XMax,grid:{display:false},afterBuildTicks:forceYearTicks,ticks:{font:{size:10},autoSkip:false,callback:v=>{const yr=Math.floor(v);const mo=Math.round((v-yr)*12)+1;return mo===1?yr:mo===7?'Jul':''}}}
    });
  },[baseline,sailing,combined,esdData,sailFilter,buildChart,annualOf,sailKeys,esdTimeline]);

  useEffect(()=>{ rebuildAll(); },[rebuildAll]);

  return(
    <div className="rwrap">
      <div className="cii-filter-bar">
        <div style={{display:'flex',gap:5,alignItems:'center'}}>
          <span style={{fontSize:9,color:'var(--ink3)'}}>Zones:</span>
          {[['A','rgba(46,160,84,.50)','#fff'],['B','rgba(144,208,144,.60)','#1a5e1a'],['C','rgba(245,230,74,.50)','#5a4a00'],['D','rgba(245,197,163,.65)','#7C2D12'],['E','rgba(240,128,128,.60)','#7f0000']].map(([g,bg,cl])=>(
            <span key={g} className="grade-box" style={{background:bg,color:cl}}>{g}</span>
          ))}
        </div>
        <span style={{fontSize:9,color:'var(--ink3)'}}>|</span>
        <span style={{fontSize:9,color:'var(--ink3)'}}>Sailing:</span>
        <select className="fsel" value={sailFilter} onChange={e=>setSailFilter(e.target.value)}>
          <option value="all">All {sailKeys.length} scenarios</option>
          {sailKeys.map(k=><option key={k} value={k}>{k}</option>)}
        </select>
        <span style={{fontSize:9,color:'var(--ink3)'}}>|</span>
        <div style={{display:'flex',gap:14,alignItems:'center',marginLeft:'auto'}}>
          <div style={{display:'flex',gap:8,fontSize:9,color:'var(--ink3)'}}>
            <span>- - CII<sub>R</sub></span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:18,height:2,background:'var(--ink)',display:'inline-block'}}></span> Attained</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:18,height:2,background:'var(--blue)',display:'inline-block'}}></span> With ESDs</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:8,height:8,borderRadius:'50%',background:'var(--blue)',display:'inline-block'}}></span> Sailing scenarios</span>
          </div>
        </div>
      </div>
      <div className="g2" style={{marginBottom:14}}>
        <div className="card"><div className="card-hd"><span className="card-title">Graph 1 — Baseline CII</span><span className="bv bv-g">No ESDs</span></div>
          <div className="card-body"><div className="ch h280"  style={{height: "400px"}}><canvas id="sim-g1"></canvas></div></div></div>
       
        <div className="card"><div className="card-hd"><span className="card-title">Graph 2 — Sailing Profile Scenarios</span></div>
          <div className="card-body"><div className="ch h280" style={{height: "400px"}}><canvas id="sim-g2"></canvas></div></div></div>
 <div className="card"><div className="card-hd"><span className="card-title">Graph 3 — With ESD Rollout</span><EsdScheduleInfo timeline={esdTimeline}/></div>
          <div className="card-body"><div className="ch h280"  style={{height: "400px"}}><canvas id="sim-g3"></canvas></div></div></div>

        <div className="card"><div className="card-hd"><span className="card-title">Graph 4 — Sailing + ESD Combined</span><EsdScheduleInfo timeline={esdTimeline}/></div>
          <div className="card-body"><div className="ch h280"  style={{height: "400px"}}><canvas id="sim-g4"></canvas></div></div></div>
      </div>

      {/* Monthly CII Breakdown toggle */}
      <div className="card" style={{marginTop:14}}>
        <div className="card-hd" style={{cursor:'pointer',userSelect:'none'}} onClick={()=>setShowCiiMonthly(!showCiiMonthly)}>
          <span className="card-title">{showCiiMonthly ? '▾' : '▸'} Monthly CII Breakdown (ESD + Sailing)</span>
          <span style={{fontSize:10,color:'var(--ink3)'}}>{showCiiMonthly ? 'click to collapse' : 'click to expand'}</span>
        </div>
        {showCiiMonthly && (
          <div style={{overflowX:'auto',padding:'0 0 12px'}}>
            <table className="tbl" style={{fontSize:10,minWidth:900}}>
              <thead><tr>
                <th style={{minWidth:90}}>Date / ESD Installed</th>
                <th className="r">Req. CII</th>
                <th className="r">Grade</th>
                <th className="r">Baseline</th>
                <th className="r">With ESDs</th>
                <th className="r" style={{color:'var(--purple)'}}>Saving %</th>
                <th className="r">Active</th>
                {Object.keys(combined).map(k=>(
                  <th key={k} className="r" style={{color:'var(--blue)'}}>{k}+ESDs</th>
                ))}
              </tr></thead>
              <tbody>
                {(esdData.monthly_data||[]).map((row,i)=>{
                  const baseRow = baseline.find(b=>row.date.startsWith(b.date));
                  const hasNew = row.newly_installed && row.newly_installed.length > 0;
                  const prevRow = i > 0 ? (esdData.monthly_data||[])[i-1] : null;
                  const ciiDrop = prevRow ? (prevRow.attained_cii - row.attained_cii) : 0;
                  return (
                    <tr key={i} style={{background: hasNew ? '#ECFDF5' : row.date.endsWith('-01') ? '#F0FDF4' : ''}}>
                      <td style={{fontFamily:'IBM Plex Mono,monospace',fontSize:10,color:'var(--ink3)'}}>
                        {row.date}
                        {hasNew && <span style={{display:'block',fontSize:8,color:'#059669',fontWeight:600,fontFamily:'var(--font-sans)',marginTop:1}}>▼ {row.newly_installed.join(', ')}</span>}
                      </td>
                      <td className="r" style={{color:'var(--amber)'}}>{row.required_cii?.toFixed(4)}</td>
                      <td className="r"><span className={`bx bx-${row.grade==='A'||row.grade==='B'?'b':row.grade==='C'?'a':row.grade==='D'?'p':'c'}`}>{row.grade}</span></td>
                      <td className="r" style={{fontWeight:600}}>{baseRow?.attained_cii?.toFixed(4) || '—'}</td>
                      <td className="r" style={{color:'var(--green)',fontWeight:600}}>
                        {row.attained_cii?.toFixed(4)}
                        {hasNew && ciiDrop > 0 && <span style={{fontSize:8,color:'#059669',marginLeft:3}}>↓{ciiDrop.toFixed(4)}</span>}
                      </td>
                      <td className="r" style={{color:'var(--purple)',fontSize:10}}>{row.cumulative_saving_pct?.toFixed(1) || '0'}%</td>
                      <td className="r" style={{color:'var(--ink3)'}}>{row.active_esds || 0}/{(esdData.esd_timeline||[]).length}</td>
                      {Object.keys(combined).map(k=>{
                        const scRow = (combined[k]||[]).find(s=>s.date===row.date);
                        return <td key={k} className="r" style={{color:'var(--blue)'}}>{scRow?.attained_cii?.toFixed(4) || '—'}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}


// ── Financial Tab ─────────────────────────────────────────────────────
function FinancialTab({ out }) {
  const [showMonthly, setShowMonthly] = useState(false);
  const cashRef = useRef(null);
  const opexRef = useRef(null);
  const overviewRef = useRef(null);
  const chartsRef = useRef({});
  const fin = out?.financial || {};
  const sum = fin.summary || {};

  useEffect(()=>{
    if(!window.Chart) return;
    const fmtM=v=>{const sign=v<0?'-':'';const av=Math.abs(v);if(av>=1e6)return sign+'$'+(av/1e6).toFixed(1)+'M';if(av>=1e3)return sign+'$'+(av/1e3).toFixed(0)+'K';return sign+'$'+av;};

    // ── 1. Investment Overview bar chart ──────────────────────────────
    if(overviewRef.current) {
      if(chartsRef.current.overview){try{chartsRef.current.overview.destroy();}catch(e){}}
      chartsRef.current.overview = new window.Chart(overviewRef.current,{type:'bar',data:{
        labels:['Investment','Accumulated\nSavings','NPV','Savings PV'],
        datasets:[{
          label:'Amount (USD)',
          data:[
            -(sum.total_investment_usd || 0),
            sum.accumulated_savings_usd || 0,
            sum.npv_usd || 0,
            sum.savings_pv_usd || 0,
          ],
          backgroundColor:[
            'rgba(220,38,38,.7)',     // red for cost
            'rgba(29,158,117,.7)',    // green for savings
            'rgba(44,111,191,.7)',    // blue for NPV
            'rgba(124,58,237,.7)',    // purple for PV
          ],
          borderColor:['#DC2626','#1D9E75','#2C6FBF','#7C3AED'],
          borderWidth:1,
          borderRadius:4,
        }]},
        options:{
          responsive:true,maintainAspectRatio:false,
          devicePixelRatio:3,
          plugins:{
            legend:{display:false},
            tooltip:{callbacks:{label:ctx=>fmtM(ctx.parsed.y)}},
          },
          scales:{
            x:{grid:{display:false},ticks:{font:{size:10}}},
            y:{grid:{color:'rgba(0,0,0,.04)',drawBorder:false},ticks:{font:{size:10},callback:fmtM}},
          },
        }
      });
    }

    // ── 2. Cashflow chart with docking markers ───────────────────────
    if(cashRef.current) {
      const cf = fin.monthly_cashflows||[];
      // Main line data (sampled for performance)
      // All points so chart starts from analysis month
      const cfPts   = cf.map(r=>({x:r.timeline, y:r.cumulative_cashflow}));
      const xMin    = cf.length > 0 ? cf[0].timeline : undefined;
      const xMax    = cf.length > 0 ? cf[cf.length-1].timeline : undefined;
      // Docking points only (for triangle markers)
      const dockPts = cf.filter(r=>r.is_docking).map(r=>({x:r.timeline,y:r.cumulative_cashflow}));

      if(chartsRef.current.cash){try{chartsRef.current.cash.destroy();}catch(e){}}
      chartsRef.current.cash = new window.Chart(cashRef.current,{type:'line',data:{datasets:[
        {
          label:'Cumulative Cashflow',
          data:cfPts,
          borderColor:'#1D9E75',borderWidth:2,pointRadius:0,
          fill:{target:'origin',above:'rgba(29,158,117,.1)',below:'rgba(239,68,68,.08)'},
          parsing:false,tension:0
        },
        {
          label:'Docking',
          data:dockPts,
          borderColor:'transparent',borderWidth:0,
          pointRadius:7,pointStyle:'triangle',pointBackgroundColor:'#D97706',pointBorderColor:'#92400E',pointBorderWidth:1,
          parsing:false,showLine:false,
        }
      ]},
        options:{responsive:true,maintainAspectRatio:false,devicePixelRatio:3,
          plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:12,
            generateLabels:(chart)=>[
              {text:'Cumulative Cashflow',fillStyle:'#1D9E75',strokeStyle:'#1D9E75',lineWidth:2},
              {text:'▲ Docking',fillStyle:'#D97706',strokeStyle:'#92400E',lineWidth:1,pointStyle:'triangle'},
            ]
          }}},
          scales:{x:{type:'linear',min:xMin,max:xMax,grid:{display:false},ticks:{font:{size:10},maxTicksLimit:10,callback:v=>{const yr=Math.floor(v);const mo=Math.round((v-yr)*12)+1;return mo===1?yr:mo===7?'Jul':''}}},y:{grid:{color:'rgba(0,0,0,.04)',drawBorder:false},ticks:{font:{size:10},callback:fmtM}}}
        }
      });
    }

    // ── 3. Yearly stacked bar ────────────────────────────────────────
    if(opexRef.current) {
      const yr = fin.yearly_savings||[];
      if(chartsRef.current.opex){try{chartsRef.current.opex.destroy();}catch(e){}}
      chartsRef.current.opex = new window.Chart(opexRef.current,{type:'bar',data:{
        labels:yr.map(r=>r.year),
        datasets:[
          {label:'Fuel Savings',data:yr.map(r=>r.fuel_savings),backgroundColor:'rgba(29,158,117,.8)',stack:'s'},
          {label:'EUA Savings',data:yr.map(r=>r.ets_savings),backgroundColor:'rgba(44,111,191,.8)',stack:'s'},
          {label:'FuelEU Savings',data:yr.map(r=>r.fuel_eu_savings),backgroundColor:'rgba(124,58,237,.8)',stack:'s'},
          {label:'Investment',data:yr.map(r=>-r.investment),backgroundColor:'rgba(220,38,38,.6)',stack:'s'},
        ]},
        options:{responsive:true,maintainAspectRatio:false,devicePixelRatio:3,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},
          scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'rgba(0,0,0,.04)',drawBorder:false},ticks:{font:{size:10},callback:fmtM}}}}
      });
    }
  },[fin]);

  return(
    <div className="rwrap">
      <div style={{background:'linear-gradient(135deg,var(--gl),#EFF6FF)',border:'1px solid var(--gm)',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:14,display:'flex',gap:10,alignItems:'center'}}>
        <i className="ti ti-trending-up" style={{fontSize:16,color:'var(--green)',flexShrink:0}}></i>
        <div style={{fontSize:10,color:'var(--ink2)'}}>
          <b>FuelEU savings scale as IMO targets tighten.</b> 2026–2029: ×1.0 → 2030–2034: ×2.79.
        </div>
      </div>
      <div className="g4" style={{marginBottom:14}}>
        <div className="kpi"><div className="kpi-l">NPV</div><div className="kpi-v g">{fmt$(sum.npv_usd)}</div><div className="kpi-s">Savings PV − Investment</div></div>
        <div className="kpi"><div className="kpi-l">IRR</div><div className="kpi-v g">{sum.irr_pct!=null?sum.irr_pct.toFixed(1)+'%':'—'}</div></div>
        <div className="kpi"><div className="kpi-l">Savings PV</div><div className="kpi-v">{fmt$(sum.savings_pv_usd)}</div><div className="kpi-s">@ {sum.discount_rate_pct||10}% discount</div></div>
        <div className="kpi"><div className="kpi-l">Accumulated</div><div className="kpi-v">{fmt$(sum.accumulated_savings_usd)}</div><div className="kpi-s">Undiscounted total</div></div>
      </div>
      <div className="g4" style={{marginBottom:14}}>
        <div className="kpi"><div className="kpi-l">Total Investment</div><div className="kpi-v r">{fmt$(sum.total_investment_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Annual Fuel Savings</div><div className="kpi-v">{fmt$(sum.annual_fuel_savings_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Annual EUA Savings</div><div className="kpi-v">{fmt$(sum.annual_ets_savings_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Payback Period</div><div className="kpi-v g">{sum.payback_years!=null?sum.payback_years.toFixed(2)+' yr':'—'}</div><div className="kpi-s">incl. EUA + FuelEU</div></div>
      </div>

      {/* Yearly Savings — full width */}
      <div className="card" style={{marginBottom:14}}>
        <div className="card-hd">
          <span className="card-title">Yearly Savings (Stacked)</span>
          <span style={{fontSize:9,color:'var(--purple)'}}>FuelEU grows from 2030</span>
        </div>
        <div className="card-body"><div className="ch h300"><canvas ref={opexRef} data-chart-id="opex"></canvas></div></div>
      </div>

      <div className="g2">
        <div className="card"><div className="card-hd"><span className="card-title">Accumulated Cashflow</span><span style={{fontSize:9,color:'var(--amber)'}}>▲ = docking months</span></div>
          <div className="card-body"><div className="ch h300"><canvas ref={cashRef} data-chart-id="cash"></canvas></div></div></div>
        <div className="card"><div className="card-hd"><span className="card-title">Investment Overview — {out?.input?.vessel?.vessel_name || '—'}</span><span style={{fontSize:9,color:'var(--ink3)'}}>Total cost vs returns</span></div>
          <div className="card-body"><div className="ch h300"><canvas ref={overviewRef} data-chart-id="overview"></canvas></div></div></div>
      </div>

      {/* Monthly Breakdown toggle */}
      <div className="card" style={{marginTop:14}}>
        <div className="card-hd" style={{cursor:'pointer',userSelect:'none'}} onClick={()=>setShowMonthly(!showMonthly)}>
          <span className="card-title">{showMonthly ? '▾' : '▸'} Monthly Cashflow Breakdown</span>
          <span style={{fontSize:10,color:'var(--ink3)'}}>{(fin.monthly_cashflows||[]).length} months · {showMonthly ? 'click to collapse' : 'click to expand'}</span>
        </div>
        {showMonthly && (
          <div style={{overflowX:'auto',padding:'0 0 12px'}}>
            <table className="tbl" style={{fontSize:10,minWidth:820}}>
              <thead><tr>
                <th>Date</th><th>Status</th>
                <th className="r">Investment</th>
                <th className="r">Fuel $</th><th className="r">EUA $</th><th className="r">FuelEU $</th>
                <th className="r">Net</th><th className="r">Cumulative</th>
              </tr></thead>
              <tbody>
                {(fin.monthly_cashflows||[]).map((r,i)=>(
                  <tr key={i} style={r.is_docking?{background:'#FEF3C7'}:{}}>
                    <td style={{fontFamily:'IBM Plex Mono,monospace',fontSize:10,color:'var(--ink3)'}}>{r.date}</td>
                    <td>{r.is_docking?<span className="bx bx-a">docking</span>:r.investment>0?<span className="bx bx-c">invest</span>:(r.fuel_savings>0?<span className="bx bx-b">saving</span>:<span style={{color:'var(--ink3)'}}>—</span>)}</td>
                    <td className="r" style={{color:r.investment>0?'#DC2626':'var(--ink3)'}}>{r.investment>0?'-$'+fmtN(r.investment,0):'—'}</td>
                    <td className="r" style={{color:'#059669'}}>{r.fuel_savings>0?'$'+fmtN(r.fuel_savings,0):'—'}</td>
                    <td className="r" style={{color:'#2563EB'}}>{r.ets_savings>0?'$'+fmtN(r.ets_savings,0):'—'}</td>
                    <td className="r" style={{color:'#7C3AED'}}>{r.fuel_eu_savings>0?'$'+fmtN(r.fuel_eu_savings,0):'—'}</td>
                    <td className="r" style={{fontWeight:600,color:r.net_cashflow>=0?'#059669':'#DC2626'}}>{r.net_cashflow>=0?'+':''}{fmt$(r.net_cashflow)}</td>
                    <td className="r" style={{fontWeight:600,color:r.cumulative_cashflow>=0?'#059669':'#DC2626'}}>{r.cumulative_cashflow>=0?'+':''}{fmt$(r.cumulative_cashflow)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── EU Tax Tab ─────────────────────────────────────────────────────────
function EuTaxTab({ out }) {
  const ps     = out?.penalty_summary || {};
  const eua    = out?.eua || {};
  const feu    = out?.fuel_eu_penalty || {};
  const yearly = out?.fueleu_yearly_breakdown || [];
  const inp    = out?.input || {};

  return(
    <div className="rwrap">
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{gap:14,marginBottom:14}}>
        <div className="card" style={{padding:'12px 16px'}}>
          <div className="pen-l">EUA Cost</div>
          <div className="pen-v r">{fmt$(ps.total_eua_cost_usd)}</div>
          <div className="pen-s">{fmtN(eua.total_eua_units,0)} units × ${inp.voyage_meta?.eua_cost_usd||75}</div>
        </div>
        <div className="card" style={{padding:'12px 16px'}}>
          <div className="pen-l">FuelEU Penalty</div>
          <div className="pen-v r">{fmt$(ps.total_fuel_eu_penalty_usd)}</div>
          <div className="pen-s">GHG {feu.ghg_intensity_total?.toFixed(2)} vs target {feu.ghg_target?.toFixed(2)}</div>
        </div>
        <div className="card" style={{padding:'12px 16px'}}>
          <div className="pen-l">Total EU Compliance</div>
          <div className="pen-v r">{fmt$(ps.total_eu_compliance_cost_usd)}</div>
          <div className="pen-s">EUA + FuelEU / year</div>
        </div>
      </div>
      <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',color:'var(--blue)',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
        <span style={{width:12,height:12,background:'var(--blue)',borderRadius:2,display:'inline-block'}}></span>
        EUA / ETS — European Union Allowances
      </div>
      <div className="g4" style={{marginBottom:10}}>
        <div className="kpi"><div className="kpi-l">EUA Units Liable</div><div className="kpi-v">{fmtN(eua.total_eua_units,0)}</div><div className="kpi-s">tCO₂eq / year</div></div>
        <div className="kpi"><div className="kpi-l">EUA Cost</div><div className="kpi-v r">{fmt$(eua.total_eua_cost_usd)}</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">Relief Factor</div><div className="kpi-v">{eua.relief_factor!=null?(eua.relief_factor*100).toFixed(0)+'%':'—'}</div></div>
        <div className="kpi"><div className="kpi-l">EU Voyage Share</div><div className="kpi-v">{eua.eu_voyages_percent}%</div><div className="kpi-s">of total consumption</div></div>
      </div>
      <div className="card" style={{marginBottom:18}}><div className="card-hd"><span className="card-title">EUA Fuel Breakdown</span><span style={{fontSize:10,color:'var(--ink3)'}}>{eua.analysis_year} · Relief factor {eua.relief_factor} · EU voyages {eua.eu_voyages_percent}%</span></div>
        <table className="tbl"><thead><tr><th>Fuel</th><th className="r">Total MT</th><th className="r">EU MT</th><th className="r">TTW Factor</th><th className="r">EU Emissions</th><th className="r">Relief</th><th className="r">EUA Liable</th><th className="r">EUA Cost</th></tr></thead>
        <tbody>
          {(eua.fuel_breakdown||[]).map((f,i)=>(
            <tr key={i}>
              <td><span style={{display:'inline-block',padding:'2px 6px',borderRadius:3,fontSize:9,fontWeight:700,background:FUEL_BG[f.fuel_name]||'#F1F5F9',color:FUEL_CL[f.fuel_name]||'#475569'}}>{f.fuel_name}</span></td>
              <td className="r">{fmtN(f.total_consumption_mt,0)}</td>
              <td className="r">{fmtN(f.eu_consumption_mt,1)}</td>
              <td className="r">{f.ttw_factor?.toFixed(4)}</td>
              <td className="r">{fmtN(f.eu_emission_tco2eq,0)} tCO₂</td>
              <td className="r">{f.relief_factor}</td>
              <td className="r">{fmtN(f.liable_eua_units,0)}</td>
              <td className="r">{fmt$(f.eua_cost_usd)}</td>
            </tr>
          ))}
          <tr className="tbl-tot"><td colSpan={6}><b>Total</b></td><td className="r"><b>{fmtN(eua.total_eua_units,0)}</b></td><td className="r"><b>{fmt$(eua.total_eua_cost_usd)}</b></td></tr>
        </tbody></table>
      </div>
      <div style={{borderTop:'2px dashed var(--bd)',marginBottom:18}}></div>
      <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',color:'var(--green)',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
        <span style={{width:12,height:12,background:'var(--green)',borderRadius:2,display:'inline-block'}}></span>
        FuelEU Maritime — Year-by-Year Projection
        <span style={{fontSize:9,fontWeight:400,color:'var(--ink3)',textTransform:'none',letterSpacing:0}}>Penalty and ESD savings both scale as IMO targets tighten</span>
      </div>
      <div style={{marginBottom:14}}>
        <div className="card"><div className="card-hd"><span className="card-title">GHG Intensity Analysis</span><span className={`bx ${feu.compliant===false?'bx-r':'bx-g'}`}>{feu.compliant===false?'Non-Compliant':'Compliant'}</span></div>
          <div className="card-body">
            <div className="g2" style={{marginBottom:14}}>
              <div><div style={{fontSize:9,color:'var(--ink3)',marginBottom:2}}>Actual GHG Intensity</div><div style={{fontSize:22,fontWeight:600,fontFamily:'IBM Plex Mono,monospace',color:'var(--red)'}}>{feu.ghg_intensity_total?.toFixed(4)}</div><div style={{fontSize:9,color:'var(--ink3)'}}>gCO₂eq/MJ (WTT + TTW)</div></div>
              <div><div style={{fontSize:9,color:'var(--ink3)',marginBottom:2}}>Target</div><div style={{fontSize:22,fontWeight:600,fontFamily:'IBM Plex Mono,monospace',color:'var(--green)'}}>{feu.ghg_target?.toFixed(4)}</div><div style={{fontSize:9,color:'var(--ink3)'}}>gCO₂eq/MJ · Excess: +{((feu.ghg_intensity_total||0)-(feu.ghg_target||0)).toFixed(4)}</div></div>
            </div>
            {/* Gradient bar */}
            <div style={{position:'relative',height:26,background:'linear-gradient(to right,#D1FAE5,#FEF9C3,#FEE2E2)',borderRadius:5,margin:'10px 0 22px'}}>
              <div style={{position:'absolute',top:-4,bottom:-4,left:'39.5%',width:2,background:'var(--green)'}}></div>
              <div style={{position:'absolute',top:-14,left:'39.5%',transform:'translateX(-50%)',fontSize:8,color:'var(--green)',fontWeight:600,whiteSpace:'nowrap'}}>Target {feu.ghg_target?.toFixed(2)}</div>
              <div style={{position:'absolute',top:'50%',left:'58%',transform:'translate(-50%,-50%)',width:11,height:11,background:'var(--red)',borderRadius:'50%',border:'2px solid #fff',boxShadow:'0 0 0 2px var(--red)'}}></div>
              <div style={{position:'absolute',bottom:-14,left:'58%',transform:'translateX(-50%)',fontSize:8,color:'var(--red)',fontWeight:600,whiteSpace:'nowrap'}}>Actual {feu.ghg_intensity_total?.toFixed(2)}</div>
            </div>
            <table className="tbl"><thead><tr><th>Calculation Component</th><th className="r">Value</th></tr></thead>
            <tbody>
              <tr><td>GHG Target</td><td className="r" style={{color:'var(--green)'}}>{feu.ghg_target?.toFixed(4)} gCO₂eq/MJ</td></tr>
              <tr><td>Actual GHG (WTT {feu.ghg_intensity_wtt?.toFixed(2)} + TTW {feu.ghg_intensity_ttw?.toFixed(2)})</td><td className="r" style={{color:'var(--red)'}}>{feu.ghg_intensity_total?.toFixed(4)} gCO₂eq/MJ</td></tr>
              <tr><td>Carbon Balance (CB)</td><td className="r" style={{color:'var(--red)'}}>{feu.carbon_balance!=null?Math.round(feu.carbon_balance).toLocaleString():'—'}</td></tr>
              <tr><td>EU Voyage Share</td><td className="r">{feu.eu_voyages_percent}%</td></tr>
              <tr><td>Penalty Rate</td><td className="r">€2,400 / tCO₂eq</td></tr>
              <tr><td>EUR → USD</td><td className="r">1.08</td></tr>
              <tr style={{background:'var(--bg)'}}><td><b>FuelEU Penalty (base year)</b></td><td className="r" style={{color:'var(--red)',fontSize:14,fontWeight:600}}>{fmt$(feu.penalty_usd)}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
      {yearly.length>0&&(
        <div className="card"><div className="card-hd">
          <div><div className="card-title">Year-by-Year FuelEU Projection</div><div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>Annual penalty + ESD savings per year.</div></div>
        </div>
        <div className="card-body">
        <div style={{background:'var(--gl)',borderRadius:6,padding:'9px 12px',fontSize:10,color:'var(--gd)',marginBottom:12}}>
          <b>Why does the penalty grow?</b> As IMO targets drop each year, this vessel becomes <i>more</i> non-compliant. Each tonne of fuel saved by ESDs avoids a proportionally <i>larger</i> penalty.
        </div>
        <div style={{overflowX:'auto'}}>
        <table className="tbl"><thead><tr><th>Year</th><th className="r">Months</th><th className="r">Target</th><th className="r">Excess</th><th className="r">FuelEU Penalty</th><th className="r">EUA Cost</th><th className="r">Total EU Cost</th><th className="r">ESD Fuel $</th><th className="r">ESD EUA $</th><th className="r">ESD FuelEU $</th><th className="r">Net FuelEU</th><th className="r">Net EUA</th></tr></thead>
        <tbody>
          {yearly.map((r,i)=>(
            <tr key={i}>
              <td><b>{r.year}</b></td>
              <td className="r" style={{color:'var(--ink3)'}}>{r.active_months||12}mo</td>
              <td className="r">{r.target?.toFixed(4)}</td>
              <td className="r" style={{color:r.vessel_excess>0?'var(--red)':'var(--green)'}}>{r.vessel_excess>0?'+':''}{r.vessel_excess?.toFixed(4)}</td>
              <td className="r" style={{color:'var(--red)'}}>{fmt$(r.vessel_fueleu_penalty_usd)}</td>
              <td className="r" style={{color:'var(--red)'}}>{fmt$(r.vessel_eua_cost_usd)}</td>
              <td className="r" style={{color:'var(--red)',fontWeight:600}}>{fmt$(r.total_vessel_eu_cost_usd)}</td>
              <td className="r" style={{color:'var(--green)'}}>{fmt$(r.esd_fuel_savings_usd)}</td>
              <td className="r" style={{color:'var(--green)'}}>{fmt$(r.esd_eua_savings_usd)}</td>
              <td className="r" style={{color:'var(--green)'}}>{fmt$(r.esd_fueleu_savings_usd)}</td>
              <td className="r">{fmt$(r.net_fueleu_usd)}</td>
              <td className="r">{fmt$(r.net_eua_usd)}</td>
            </tr>
          ))}
          {yearly.length>0&&(
            <tr style={{background:'#F0FDF4',fontWeight:600}}>
              <td colSpan={2}><b>Total ({yearly[0]?.year}–{yearly[yearly.length-1]?.year})</b></td>
              <td className="r">—</td><td className="r">—</td>
              <td className="r" style={{color:'var(--red)'}}><b>{fmt$(yearly.reduce((s,r)=>s+(r.vessel_fueleu_penalty_usd||0),0))}</b></td>
              <td className="r" style={{color:'var(--red)'}}><b>{fmt$(yearly.reduce((s,r)=>s+(r.vessel_eua_cost_usd||0),0))}</b></td>
              <td className="r" style={{color:'var(--red)'}}><b>{fmt$(yearly.reduce((s,r)=>s+(r.total_vessel_eu_cost_usd||0),0))}</b></td>
              <td className="r" style={{color:'var(--green)'}}><b>{fmt$(yearly.reduce((s,r)=>s+(r.esd_fuel_savings_usd||0),0))}</b></td>
              <td className="r" style={{color:'var(--green)'}}><b>{fmt$(yearly.reduce((s,r)=>s+(r.esd_eua_savings_usd||0),0))}</b></td>
              <td className="r" style={{color:'var(--green)'}}><b>{fmt$(yearly.reduce((s,r)=>s+(r.esd_fueleu_savings_usd||0),0))}</b></td>
              <td className="r"><b>{fmt$(yearly.reduce((s,r)=>s+(r.net_fueleu_usd||0),0))}</b></td>
              <td className="r"><b>{fmt$(yearly.reduce((s,r)=>s+(r.net_eua_usd||0),0))}</b></td>
            </tr>
          )}
        </tbody></table>
        </div></div></div>
      )}
    </div>
  );
}

// =====================================================================
// MAIN WORKSPACE
// =====================================================================
export default function SimulationWorkspace({ vesselId, vesselName, sessionMode, initialReport, vesselReports, isOnlyReport, onBack, isAdmin = false, autoExportPdf = false, onAutoExportDone }) {  
  const [loading,    setLoading]    = useState(false);
  const [running,    setRunning]    = useState(false);
  const [pdfLoading, setPdfLoading]  = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('fuel');
  const [editCount,  setEditCount]  = useState(0);
  const [reportId,   setReportId]   = useState(null);
  const [vesselMeta, setVesselMeta] = useState(null);

  // sidebar state
  const [sailingDays,    setSailingDays]    = useState(200);
  const [nonSailingDays, setNonSailingDays] = useState(165);
  const [euaCost,        setEuaCost]        = useState(75);
  const [machines,       setMachines]       = useState([]);
  const [esds,           setEsds]           = useState([]);

  // Extended voyage / financial params (editable in sidebar)
  const [distanceNm,      setDistanceNm]      = useState(60000);
  const [euVoyagePct,     setEuVoyagePct]     = useState(30);
  const [dockingMonth,    setDockingMonth]     = useState('');
  const [dockingYear,     setDockingYear]      = useState('');
  const [commonImplMonth, setCommonImplMonth]  = useState('');
  const [commonImplYear,  setCommonImplYear]   = useState('');
  const [vesselLifeYears, setVesselLifeYears]  = useState(25);
  const [vesselEndYear,   setVesselEndYear]    = useState('');
  const [vesselEndMonth,  setVesselEndMonth]   = useState('');
  const [discountRate,    setDiscountRate]     = useState(0.10);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const mark = () => setEditCount(c=>c+1);

  // ── load vessel data based on session mode ──────────────────────
  // Helper: populate sidebar from report input
  const populateSidebar = (inp) => {
    if (!inp) return;
    const vm = inp.voyage_meta || {};
    setSailingDays(vm.sailing_days_per_year || 200);
    setNonSailingDays(vm.non_steaming_days_per_year || 165);
    setEuaCost(vm.eua_cost_usd || 75);
    setDistanceNm(vm.distance_nm || 60000);
    setEuVoyagePct(vm.eu_voyages_percent ?? 30);
    setDockingMonth(vm.docking_month || '');
    setDockingYear(vm.docking_year || '');
    setCommonImplMonth(vm.common_impl_month || '');
    setCommonImplYear(vm.common_impl_year || '');
    setVesselLifeYears(inp.vessel_life_years || 25);
    setVesselEndYear(inp.vessel_end_year || '');
    setVesselEndMonth(inp.vessel_end_month || '');
    setDiscountRate(inp.discount_rate || 0.10);
    setMachines((inp.machines || []).map(m => ({
      machine_name: m.machine_name,
      fuel_particulars: (m.fuel_particulars || []).map(fp => ({
        fuel_name: fp.fuel_name,
        consumption_mt: fp.consumption_mt,
        fuel_price_usd_per_mt: fp.fuel_price_usd_per_mt,
      })),
    })));
    const esdMeasures = inp.esd_measures || vm.esd_recommended?.selected_measures || [];
    setEsds(esdMeasures.map(e => {
      const cat = (e.category || 'operations').toLowerCase();
      const def = iDef(cat);
      return { name: e.name, category: cat, efficiency_gain_percent: e.efficiency_gain_percent || 0,
        cost_usd: e.cost_usd || 0, lead_time_months: e.lead_time_months || def.lead,
        installation_req: e.installation_req || def.req, selected: true };
    }));
    setVesselMeta({ vessel: inp.vessel, voyage_meta: vm, machines: inp.machines });
  };

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);

      // ── ALL data comes from the report selected in session modal ──
      // initialReport is fetched by Tracker.confirmSession() via GET /simulation/report/?report_id=X
      if (initialReport) {
        const inp = initialReport.input || initialReport;

        populateSidebar(inp);
        setReportId(initialReport.report_id || null);

        // "Latest" mode → show the report output immediately
        // "Base" mode → only load inputs, user clicks Run Simulation for new report
        if ((sessionMode === 'last' || isOnlyReport) && initialReport.output) {
          setReportData(initialReport);
        }

        setLoading(false);
        return;
      }

      // ── No initialReport — should not happen in normal flow ──
      // This means user got here without going through session modal
      setError('No report data available. Please go back to Vessels and click Simulate.');
      setLoading(false);
    })();
  }, [vesselId, sessionMode, initialReport]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── sidebar edit helpers ─────────────────────────────────────────────
  const updateFuel = (mi,fi,field,val) => {
    setMachines(prev=>prev.map((m,i)=>i!==mi?m:{...m,fuel_particulars:m.fuel_particulars.map((f,j)=>j!==fi?f:{...f,[field]:Number(val)||0})}));
    mark();
  };
  const toggleEsd   = (i,v) => { setEsds(prev=>prev.map((e,j)=>j===i?{...e,selected:v}:e)); mark(); };
  const updateEsd   = (i,f,v) => { setEsds(prev=>prev.map((e,j)=>j===i?{...e,[f]:Number(v)||0}:e)); mark(); };
  const toggleAll   = (v) => { setEsds(prev=>prev.map(e=>({...e,selected:v}))); mark(); };

  // ── run simulation ────────────────────────────────────────────────────
  const runSim = async () => {
    if(!vesselMeta) { setError('Vessel data not loaded yet.'); return; }
    setRunning(true); setError(null);

    const inputData = {
      vesselId: vesselId,  // pass vessel_id for the API
      vessel: vesselMeta.vessel,
      voyage_meta: {
        ...vesselMeta.voyage_meta,
        sailing_days_per_year:       sailingDays,
        non_steaming_days_per_year:  nonSailingDays,
        eua_cost_usd:                euaCost,
        distance_nm:                 distanceNm,
        eu_voyages_percent:          euVoyagePct,
        docking_month:               dockingMonth ? Number(dockingMonth) : vesselMeta.voyage_meta?.docking_month,
        docking_year:                dockingYear  ? Number(dockingYear)  : undefined,
        common_impl_month:           commonImplMonth ? Number(commonImplMonth) : undefined,
        common_impl_year:            commonImplYear  ? Number(commonImplYear)  : undefined,
      },
      machines,
      vessel_life_years: vesselLifeYears,
      vessel_end_year:   vesselEndYear  ? Number(vesselEndYear)  : undefined,
      vessel_end_month:  vesselEndMonth ? Number(vesselEndMonth) : undefined,
      discount_rate:     discountRate,
    };
    const selectedEsds = esds.filter(e => e.selected);

    try {
      let result;

      if (sessionMode === 'last' && reportId) {
        // Latest mode: update the existing report
        result = await simulationAPI.updateSimulation(reportId, {
          ...inputData,
          esd_measures: selectedEsds.map(e => ({
            category: e.category,
            name: e.name,
            efficiency_gain_percent: e.efficiency_gain_percent,
            cost_usd: e.cost_usd,
            lead_time_months: e.lead_time_months,
            installation_req: e.installation_req,
          })),
        });
      } else {
        // Base mode: create a NEW report
        result = await simulationAPI.simulate(inputData, selectedEsds, vesselLifeYears, discountRate);
      }

      if (result.success) {
        const report = result.data?.data || result.data;
        setReportData(report);
        setReportId(report?.report_id || reportId);
        setEditCount(0);
        setActiveTab('fuel');
      } else {
        setError(result.error || 'Simulation failed. Please check inputs and try again.');

      }
    } catch (err) {
      setError(err.message || 'Unexpected error during simulation');
      console.error('Simulation error:', err);

    }

    setEditCount(0);
    setActiveTab('fuel');
    setRunning(false);
  };

  // ── computed banner values ───────────────────────────────────────────
  const out      = reportData?.output||reportData;
  const inp      = reportData?.input||{};
  const ps       = out?.penalty_summary||{};
  const feuP     = out?.fuel_eu_penalty||{};
  const esdSum   = (out?.esd?.esd_results||[]).reduce((s,r)=>s+(r.total_annual_savings_usd||0),0);
  const grade    = out?.cii?.graph1_baseline?.[0]?.grade;
  const v        = inp.vessel||vesselMeta?.vessel||{};

  // Shared PDF export logic — used by the manual "PDF Report" button and by
  // the auto-export flow (triggered when opened from the Reports list
  // "Download PDF" action, which needs the real chart canvases below to
  // exist and finish drawing before it can capture them).
  const exportPdf = async () => {
    setPdfLoading(true);
    try {
      const vesselImageB64 = await resolveVesselImageB64({ reportData, vesselMeta, vessel: v });
      await generateReport({
        input: reportData?.input || {},
        output: reportData?.output || reportData,
        vesselName: v.vessel_name || vesselName || 'Report',
        vesselImageB64,
        chartRefs: {
          cash: document.querySelector('canvas[data-chart-id="cash"]'),
          opex: document.querySelector('canvas[data-chart-id="opex"]'),
          overview: document.querySelector('canvas[data-chart-id="overview"]'),
        },
        filename: `${v.vessel_name || vesselName || 'Report'}_ESD_Report.pdf`,
      });
    } catch (e) {
      console.error('PDF error:', e);
      alert('PDF generation failed: ' + e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  // Auto-export once, as soon as report data (and therefore the CII /
  // financial chart canvases) is available — used when this workspace was
  // opened purely to generate a PDF in the background.
  const autoExportFired = useRef(false);
  useEffect(() => {
    if (!autoExportPdf || autoExportFired.current || !reportData) return;
    autoExportFired.current = true;
    (async () => {
      await exportPdf();
      if (onAutoExportDone) onAutoExportDone();
    })();
  }, [autoExportPdf, reportData]);

  if(loading) return(
    <div style={{display:'flex',flex:1,alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'var(--ink3)'}}>
      <div style={{fontSize:28}}>⏳</div><div>Loading vessel data…</div>
    </div>
  );

  return(
    <div style={{display:'flex',width:'100%',height:'calc(100vh - 52px)',overflow:'hidden',position:'relative'}}>

      {/* Full-screen simulation loader */}
      {running && (
        <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,0.85)',zIndex:999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,backdropFilter:'blur(4px)'}}>
          <div style={{width:48,height:48,border:'4px solid var(--border)',borderTopColor:'var(--green)',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
          <div style={{fontSize:16,fontWeight:500,color:'var(--ink1)'}}>Running simulation...</div>
          <div style={{fontSize:12,color:'var(--ink3)'}}>Calculating CII projections, ESD savings, financial metrics</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ========== SIDEBAR ========== */}
      {/* Tailwind responsive classes layered on top of the existing .sim-sidebar
          CSS: below the md breakpoint (768px) it becomes a fixed-position
          overlay so it floats over the report instead of squeezing a fixed
          296px out of a phone-width screen. At md: and up it behaves exactly
          as before (in normal document flow, pushing content over). */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`sim-sidebar${sidebarOpen ? ' open' : ''} fixed md:static inset-y-0 left-0 z-50 md:z-auto`}
        style={{ flexShrink: 0 }}
      >
        <div className="sim-sidebar-inner">

          {/* Session header */}
          <div className="sim-session-hd">
            <span className="session-dot" style={{width:7,height:7,borderRadius:'50%',background:'#4ADE80',boxShadow:'0 0 6px #4ADE80',flexShrink:0,display:'inline-block'}}></span>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:600,color:'#fff'}}>Active Session</div>
              <div style={{fontSize:9,fontFamily:'IBM Plex Mono,monospace',color:'#9CA3AF'}}>{reportId||'NEW'}</div>
            </div>
            <span style={{fontSize:9,color:'#4ADE80'}}>{editCount} edits</span>
          </div>

          {/* Voyage Parameters */}
          <div className="sim-sec">
            <div className="sim-sec-title">Voyage Parameters</div>
            <div className="sim-row">
              <div className="sim-f"><label>Sailing Days/yr</label><input className="sim-in" type="number" value={sailingDays} onChange={e=>{setSailingDays(+e.target.value);mark();}}/></div>
              <div className="sim-f"><label>Non-Sailing Days</label><input className="sim-in" type="number" value={nonSailingDays} onChange={e=>{setNonSailingDays(+e.target.value);mark();}}/></div>
            </div>
            <div className="sim-f"><label>EUA Cost (USD/t)</label><input className="sim-in" type="number" value={euaCost} onChange={e=>{setEuaCost(+e.target.value);mark();}}/></div>
            <div className="sim-row">
              <div className="sim-f"><label>Distance (nm)</label><input className="sim-in" type="number" value={distanceNm} onChange={e=>{setDistanceNm(+e.target.value);mark();}}/></div>
              <div className="sim-f"><label>EU Voyage %</label><input className="sim-in" type="number" min="0" max="100" value={euVoyagePct} onChange={e=>{setEuVoyagePct(+e.target.value);mark();}}/></div>
            </div>
            <div className="sim-f"><label>Discount Rate</label><input className="sim-in" type="number" step="0.01" min="0" max="1" value={discountRate} onChange={e=>{setDiscountRate(+e.target.value);mark();}}/></div>
            <div className="sim-sec-title" style={{marginTop:10,fontSize:10,color:'var(--ink3)'}}>Docking Schedule</div>
            <div className="sim-row">
              <div className="sim-f"><label>Docking Month</label><input className="sim-in" type="number" min="1" max="12" placeholder="1–12" value={dockingMonth} onChange={e=>{setDockingMonth(e.target.value);mark();}}/></div>
              <div className="sim-f"><label>Docking Year</label><input className="sim-in" type="number" placeholder="e.g. 2027" value={dockingYear} onChange={e=>{setDockingYear(e.target.value);mark();}}/></div>
            </div>
            <div className="sim-sec-title" style={{marginTop:10,fontSize:10,color:'var(--ink3)'}}>Common ESD Implementation (optional)</div>
            <div className="sim-row">
              <div className="sim-f"><label>Impl. Month</label><input className="sim-in" type="number" min="1" max="12" placeholder="1–12" value={commonImplMonth} onChange={e=>{setCommonImplMonth(e.target.value);mark();}}/></div>
              <div className="sim-f"><label>Impl. Year</label><input className="sim-in" type="number" placeholder="e.g. 2026" value={commonImplYear} onChange={e=>{setCommonImplYear(e.target.value);mark();}}/></div>
            </div>
            <div className="sim-sec-title" style={{marginTop:10,fontSize:10,color:'var(--ink3)'}}>Vessel Life / Charter End</div>
            <div className="sim-row">
              <div className="sim-f"><label>Life (years)</label><input className="sim-in" type="number" value={vesselLifeYears} onChange={e=>{setVesselLifeYears(+e.target.value);mark();}}/></div>
              <div className="sim-f"><label>End Year</label><input className="sim-in" type="number" placeholder="e.g. 2029" value={vesselEndYear} onChange={e=>{setVesselEndYear(e.target.value);mark();}}/></div>
            </div>
            <div className="sim-f"><label>End Month</label><input className="sim-in" type="number" min="1" max="12" placeholder="1–12" value={vesselEndMonth} onChange={e=>{setVesselEndMonth(e.target.value);mark();}}/></div>
          </div>

          {/* Fuel Particulars */}
          <div className="sim-sec">
            <div className="sim-sec-title">Fuel Particulars</div>
            {machines.map((m,mi)=>(m.fuel_particulars||[]).map((fp,fi)=>(
              <div key={`${mi}-${fi}`} style={{marginBottom:9,padding:7,background:'var(--bg)',borderRadius:5}}>
                <div style={{fontSize:10,fontWeight:600,marginBottom:5,display:'flex',alignItems:'center',gap:5}}>
                  {m.machine_name}
                  <span style={{display:'inline-block',padding:'2px 6px',borderRadius:3,fontSize:9,fontWeight:700,background:FUEL_BG[fp.fuel_name]||'#F1F5F9',color:FUEL_CL[fp.fuel_name]||'#475569'}}>{fp.fuel_name}</span>
                </div>
                <div className="sim-row">
                  <div className="sim-f"><label>Consumption (MT)</label><input className="sim-in" type="number" value={fp.consumption_mt} onChange={e=>updateFuel(mi,fi,'consumption_mt',e.target.value)}/></div>
                  <div className="sim-f"><label>Price (USD/MT)</label><input className="sim-in" type="number" value={fp.fuel_price_usd_per_mt} onChange={e=>updateFuel(mi,fi,'fuel_price_usd_per_mt',e.target.value)}/></div>
                </div>
              </div>
            )))}
          </div>

          {/* ESD Measures */}
         <div className="sim-sec" style={{flex:1}}>
            <div className="sim-sec-title">
              ESD Measures
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>toggleAll(true)} style={{fontSize:9,padding:'2px 6px',border:'1px solid var(--bd2)',borderRadius:3,cursor:'pointer',background:'var(--gl)',color:'var(--green)'}}>All</button>
                <button onClick={()=>toggleAll(false)} style={{fontSize:9,padding:'2px 6px',border:'1px solid var(--bd2)',borderRadius:3,cursor:'pointer',background:'#FEE2E2',color:'var(--red)'}}>None</button>
              </div>
            </div>
            {esds.length===0&&<div style={{fontSize:11,color:'var(--ink3)',textAlign:'center',padding:'16px 0'}}>No ESDs loaded from vessel profile</div>}
            {esds.map((e,i)=>(
              <div key={i} className="esd-item" style={{opacity:e.selected?1:0.55}}>
                <input type="checkbox" className="esd-cb" checked={e.selected} onChange={ev=>toggleEsd(i,ev.target.checked)}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,fontSize:11}}>{e.name}</div>
                  <div style={{fontSize:9,color:'var(--ink3)',marginTop:1}}>
                    {e.installation_req==='docking'?'⚓ Docking':'⛵ In-Sailing'} · {e.lead_time_months}mo lead
                  </div>
                  {isAdmin && e.selected && (
                   <div className="esd-ef">
                      <div><label style={{fontSize:8,color:'var(--ink3)',display:'block',marginBottom:1}}>Eff %</label>
                        <input type="number" step="0.1" value={e.efficiency_gain_percent} onChange={ev=>updateEsd(i,'efficiency_gain_percent',ev.target.value)}/></div>
                      <div><label style={{fontSize:8,color:'var(--ink3)',display:'block',marginBottom:1}}>Cost $</label>
                        <input type="number" step="1000" value={e.cost_usd} onChange={ev=>updateEsd(i,'cost_usd',ev.target.value)}/></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error&&<div style={{margin:'0 13px 8px',padding:'8px 10px',background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:6,fontSize:10,color:'var(--red)'}}>{error}</div>}

        {/* Run button */}
        <button className="run-btn" onClick={runSim} disabled={running||loading}>
          <i className="ti ti-player-play"></i>{running?'Running…':'Run Simulation'}
        </button>
      </div>

      {/* ========== REPORT MAIN ========== */}
      <div className="report-main">

        {/* Vessel banner */}
        <div style={{background:'var(--sf)',borderBottom:'1px solid var(--bd)',padding:'8px 20px',display:'flex',alignItems:'center',gap:16,flexShrink:0,flexWrap:'wrap', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>{v.vessel_name||vesselName||'—'}</div>
            <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>
              {[v.vessel_type,'IMO '+(v.imo_number||'?'),'Built '+(v.build_year||'?'),v.flag,v.name_of_owner].filter(Boolean).join(' · ')}
            </div>
          </div>
        
          <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:reportData?12:'auto'}}>
              {reportData&&(
            <div style={{display:'flex',gap:74,alignItems:'center'}}>
             
              <div style={{textAlign:'right', marginRight: 12}}>
                <div style={{fontSize:9,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.3px'}}>ESD Annual Savings</div>
                <div style={{fontSize:16,fontWeight:600,color:'var(--green)',fontFamily:'IBM Plex Mono,monospace'}}>{fmt$(esdSum)}</div>
                <div style={{fontSize:9,color:'var(--ink3)'}}>fuel + EUA + FuelEU / yr</div>
              </div>
            </div>
          )}
            {feuP.compliant===false&&<span style={{padding:'3px 8px',borderRadius:10,fontSize:9,fontWeight:600,background:'#FEE2E2',color:'var(--red)'}}>FuelEU Non-Compliant</span>}
            {grade&&<span style={{padding:'3px 8px',borderRadius:10,fontSize:9,fontWeight:600,background:'var(--gl)',color:'var(--green)'}}>CII Grade {grade}</span>}
            {reportData && (
              <button className="btn btn-secondary btn-sm" disabled={pdfLoading} onClick={exportPdf}>
                <i className={`ti ${pdfLoading?'ti-loader-2':'ti-file-download'}`}></i>
                {pdfLoading ? ' Generating...' : ' PDF Report'}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={()=>setSidebarOpen(o=>!o)}>
              <i className={`ti ${sidebarOpen?'ti-x':'ti-sliders'}`}></i> {sidebarOpen?'Hide Inputs':'Edit Inputs'}
            </button>
          </div>
        </div>

        {/* Report tabs — scrolls horizontally on narrow screens instead of
            squeezing every tab label down to nothing. */}
        <div className="report-tabs overflow-x-auto">
          {[['fuel','ti-flame','Fuel'],['esd','ti-settings','ESD Results'],['cii','ti-chart-line','CII Strategy'],['fin','ti-coin','Financial'],['eutax','ti-leaf','EU Tax']].map(([key,icon,label])=>(
            <button key={key} className={`rtab${activeTab===key?' on':''}`} onClick={()=>setActiveTab(key)}>
              <i className={`ti ${icon}`}></i> {label}
            </button>
          ))}
        </div>

        {/* Panes */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
          {!reportData?(
            <div className="empty-state" style={{paddingTop:80}}>
              <i className="ti ti-ship" style={{fontSize:36,display:'block',marginBottom:10,opacity:.3}}></i>
              <div style={{fontSize:15,fontWeight:600,color:'var(--ink2)',marginBottom:6}}>Ready to simulate</div>
              <div>{esds.filter(e=>e.selected).length} ESD{esds.filter(e=>e.selected).length!==1?'s':''} selected. Adjust inputs then click Run Simulation.</div>
            </div>
          ):(
            <>
              <div className={`rpane${activeTab==='fuel'?' on':''}`}><FuelTab out={{...out,input:inp}}/></div>
              <div className={`rpane${activeTab==='esd'?' on':''}`}><EsdTab out={{...out,input:inp}}/></div>
              <div className={`rpane${activeTab==='cii'?' on':''}`}><CiiTab out={{...out,input:inp}}/></div>
              <div className={`rpane${activeTab==='fin'?' on':''}`}><FinancialTab out={{...out,input:inp}}/></div>
              <div className={`rpane${activeTab==='eutax'?' on':''}`}><EuTaxTab out={{...out,input:inp}}/></div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}