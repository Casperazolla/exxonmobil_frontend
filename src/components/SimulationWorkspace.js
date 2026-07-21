/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { simulationAPI } from '../services/apiService';

// =====================================================================
// HELPERS
// =====================================================================
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

// =====================================================================
// All data from real APIs
// Used when real API is unavailable — swap out for live API later
// =====================================================================
// No static data — all data comes from real APIs

// =====================================================================
// SUB-COMPONENTS
// =====================================================================

// ── Fuel Tab ─────────────────────────────────────────────────────────
function FuelTab({ out }) {
  const fs = out?.fuel_summary || {};
  const total = fs.total_consumption_mt || 1;
  return (
    <div className="rwrap">
      <div className="g4" style={{marginBottom:14}}>
        <div className="kpi"><div className="kpi-l">Total Consumption</div><div className="kpi-v">{fmtN(fs.total_consumption_mt,0)} MT</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">Total Fuel Cost</div><div className="kpi-v g">{fmt$(fs.total_fuel_cost_usd)}</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">Fuel Types</div><div className="kpi-v">{(fs.fuel_summary||[]).length}</div></div>
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
        <div className="kpi"><div className="kpi-l">Fuel Savings</div><div className="kpi-v g">{fmtN(sum.total_fuel_savings_mt_all,0)} MT</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">CO₂ Reduction</div><div className="kpi-v g">{fmtN(sum.total_co2_reduction_mt,0)} t</div><div className="kpi-s">/ year</div></div>
        <div className="kpi"><div className="kpi-l">Annual Savings</div><div className="kpi-v g">{fmt$(esdTotal)}</div><div className="kpi-s">fuel+EUA+FuelEU</div></div>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div className="card-hd"><span className="card-title">ESD Performance</span><span style={{fontSize:10,color:'var(--ink3)'}}>Payback (EU) = cost ÷ (fuel + EUA + FuelEU savings)</span></div>
        <div style={{overflowX:'auto'}}><table className="tbl">
          <thead><tr><th>ESD</th><th>Category</th><th>Install</th><th className="r">Saving%</th><th className="r">Fuel MT</th><th className="r">Fuel $</th><th className="r">EUA $</th><th className="r">FuelEU $</th><th className="r">Total/yr</th><th className="r">Payback(EU)</th></tr></thead>
          <tbody>
            {esds.map((e,i)=>{
              const fuelStr=Object.entries(e.fuel_savings_mt||{}).map(([fn,mt])=>`${fmtN(mt,0)} ${fn}`).join(', ')||'—';
              return(
              <tr key={i}>
                <td><b>{e.tech_name}</b></td>
                <td><span className={`bx ${CAT_CLASS[e.category]||'bx-gray'}`}>{e.category}</span></td>
                <td><span className={`bx ${e.installation_req==='docking'?'bx-a':'bx-gray'}`}>{e.installation_req?.replace('_','-')}</span></td>
                <td className="r">{e.calculated_saving_pct?.toFixed(2)}%</td>
                <td className="r">{fuelStr}</td>
                <td className="r">{fmt$(e.annual_cost_savings_usd)}</td>
                <td className="r">{fmt$(e.ets_savings_usd)}</td>
                <td className="r">{fmt$(e.fuel_eu_savings_usd)}</td>
                <td className="r"><b>{fmt$(e.total_annual_savings_usd)}</b></td>
                <td className="r" style={{color:'var(--green)',fontWeight:600}}>{e.payback_with_ets_years?.toFixed(2)} yr</td>
              </tr>
            );})}
            <tr className="tbl-tot">
              <td colSpan={4}><b>TOTAL</b></td>
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
      {sensItems.length>0&&(
        <div className="card">
          <div className="card-hd">
            <div>
              <div className="card-title">Payback Period (incl. EU Tax) as a Function of Fuel Cost</div>
              <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>13 bunker price scenarios. EU savings (EUA + FuelEU) held constant — only fuel price varies. Highlighted column = current input price.</div>
            </div>
          </div>
          <div style={{overflowX:'auto',padding:'0 1px'}}>
            {(() => {
              // Collect ALL unique fuel types from machines (not just ESD-active fuels)
              const allMachineFuels = [...new Set(
                (out?.input?.machines || []).flatMap(m => (m.fuel_particulars || []).map(fp => fp.fuel_name))
              )];
              // Merge with activeFuels from sensitivity data (in case sensitivity has fuels machines don't)
              const allFuels = [...new Set([...allMachineFuels, ...activeFuels])];
              
              const mainFuel = activeFuels[0] || allFuels[0] || 'HFO';
              const mainPrices = ranges[mainFuel] || [];
              const numCases = mainPrices.length || 13;
              const mainCurPrice = out?.input?.machines?.flatMap(m=>m.fuel_particulars||[]).find(fp=>fp.fuel_name===mainFuel)?.fuel_price_usd_per_mt;
              const mainCurIdx = mainPrices.indexOf(mainCurPrice);
              
              // Generate price ranges for fuels not in sensitivity data
              const generatePriceRange = (fuelName, curPrice) => {
                const base = curPrice || 500;
                const step = Math.round(base * 0.08); // ~8% increments
                const start = Math.round(base - 6 * step);
                return Array.from({length: numCases}, (_, i) => Math.max(50, start + i * step));
              };
              
              return (
                <table style={{borderCollapse:'collapse',fontSize:10.5,width:'100%'}}>
                  <thead>
                    <tr style={{background:'#1D9E75'}}>
                      <th style={{padding:'6px 10px',textAlign:'left',fontWeight:600,fontSize:10,color:'#fff',minWidth:200}}>Case #</th>
                      {mainPrices.map((p,i)=><th key={i} style={{padding:'6px 8px',textAlign:'center',fontWeight:700,fontSize:10,color:'#fff',background:i===mainCurIdx?'#D97706':undefined}}>{i+1}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Bunker cost rows for ALL fuel types */}
                    {allFuels.map((fuelType,fi) => {
                      const fPrices = ranges[fuelType] || generatePriceRange(fuelType, 
                        out?.input?.machines?.flatMap(m=>m.fuel_particulars||[]).find(fp=>fp.fuel_name===fuelType)?.fuel_price_usd_per_mt
                      );
                      const fCurPrice = out?.input?.machines?.flatMap(m=>m.fuel_particulars||[]).find(fp=>fp.fuel_name===fuelType)?.fuel_price_usd_per_mt;
                      const fCurIdx = fPrices.indexOf(fCurPrice) >= 0 ? fPrices.indexOf(fCurPrice) : fPrices.findIndex(p => p >= (fCurPrice||0));
                      return (
                        <tr key={'bc-'+fuelType} style={{background:'#FEF3C7'}}>
                          <td style={{padding:'5px 10px',fontWeight:600,fontSize:10,color:'#D97706'}}>{fuelType}</td>
                          {fPrices.slice(0, numCases).map((p,i) => 
                            <td key={i} style={{padding:'5px 8px',textAlign:'center',fontWeight:600,fontSize:10,color:'#1A1A1A',background:i===fCurIdx?'#FDE68A':undefined}}>{p}</td>
                          )}
                        </tr>
                      );
                    })}
                    {/* All ESDs in one list */}
                    {sensItems.map((e,ri) => {
                      const fPrices = ranges[e.primary_fuel] || mainPrices;
                      const fCurPrice = out?.input?.machines?.flatMap(m=>m.fuel_particulars||[]).find(fp=>fp.fuel_name===e.primary_fuel)?.fuel_price_usd_per_mt;
                      const fCurIdx = fPrices.indexOf(fCurPrice);
                      return (
                        <tr key={ri} style={{borderBottom:'1px solid var(--bd)'}}>
                          <td style={{padding:'5px 10px',fontWeight:500}}><b style={{color:'var(--ink3)',marginRight:6}}>{ri+1}</b> {e.tech_name}</td>
                          {(e.payback_by_case||[]).map((v,ci)=>{
                            let bg='',cl='';
                            if(v!=null){if(v<=1.5){bg='#D1FAE5';cl='#065F46';}else if(v<=3){bg='#FEF3C7';cl='#92400E';}else{bg='#FEE2E2';cl='#991B1B';}}
                            return <td key={ci} style={{textAlign:'center',background:ci===fCurIdx?(bg||'#FEF3C7'):bg,color:cl||'var(--ink3)',fontWeight:v!=null?600:400,fontSize:10.5,borderRight:'1px solid var(--bd)',outline:ci===fCurIdx?'2px solid #D97706':'none',outlineOffset:-2}}>{v!=null?v.toFixed(1):'—'}</td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}    </div>
  );
}

// ── CII Tab ────────────────────────────────────────────────────────────
// Uses Chart.js loaded from CDN — we inject canvas elements and init charts
function CiiTab({ out }) {
  const [sailFilter, setSailFilter] = useState('all');
  const [zoomFit,    setZoomFit]    = useState(false);
  const chartsRef = useRef({});
  const cii = out?.cii || {};
  const baseline = cii.graph1_baseline || [];
  const sailing  = cii.graph2_sailing  || {};
  const esdData  = cii.graph3_esd      || {};
  const combined = cii.graph4_combined?.scenarios || cii.graph4_combined || {};
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
    const gradeBandsPlugin = {
      id:'gradeBands',
      beforeDatasetsDraw(chart) {
        const {ctx,chartArea:ca,scales:{x,y}} = chart;
        if(!x||!y||!ca||!annualBounds.length) return;
        const GCOLS = {A:'rgba(46,160,84,.50)',B:'rgba(144,208,144,.60)',C:'rgba(245,230,74,.50)',D:'rgba(245,197,163,.65)',E:'rgba(240,128,128,.60)'};
        ctx.save();
        const isLinear = x.type === 'linear' || x.type === 'timeseries';
        const labels = chart.data.labels || [];
        const years = annualBounds.map(ab => parseInt(ab.date));
        
        annualBounds.forEach((ab, idx) => {
          let xL, xR;
          if (isLinear) {
            // Linear axis: use getPixelForValue with year values
            const yr = years[idx];
            const nextYr = idx < years.length - 1 ? years[idx + 1] : yr + 1;
            xL = Math.max(ca.left, x.getPixelForValue(yr));
            xR = Math.min(ca.right, x.getPixelForValue(nextYr));
          } else {
            // Category axis: calculate from index position
            const step = (ca.right - ca.left) / Math.max(labels.length - 1, 1);
            const halfStep = step / 2;
            xL = idx === 0 ? ca.left : ca.left + idx * step - halfStep;
            xR = idx === labels.length - 1 ? ca.right : ca.left + (idx + 1) * step - halfStep;
          }
          if(xR <= xL || isNaN(xL) || isNaN(xR)) return;
          const w = xR - xL;
          [
            {from:0, to:ab.d1, c:GCOLS.A},
            {from:ab.d1, to:ab.d2, c:GCOLS.B},
            {from:ab.d2, to:ab.d3, c:GCOLS.C},
            {from:ab.d3, to:ab.d4, c:GCOLS.D},
            {from:ab.d4, to:10, c:GCOLS.E}
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
      animation:{duration:300},
      plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12}},
               tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(4)}`}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:10}}, ...(extra.scales?.x||{})},
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

    // Grade band plugin
    const gradeBandsPlugin = {
      id:'gradeBands',
      beforeDatasetsDraw(chart){
        const {ctx,chartArea:{left,right,top,bottom},scales:{y}}=chart;
        if(!y) return;
        annual.forEach(r=>{
          const yr=parseInt(r.date);
          const bands=[
            [y.max,r.d1,'A'],[r.d1,r.d2,'B'],[r.d2,r.d3,'C'],[r.d3,r.d4,'D'],[r.d4,y.min||0,'E']
          ];
          bands.forEach(([top_v,bot_v,grade])=>{
            const t=y.getPixelForValue(top_v);
            const b=y.getPixelForValue(bot_v);
            if(isNaN(t)||isNaN(b)) return;
            ctx.fillStyle=GRADE_COLS[grade]||'transparent';
            // Only draw for this year's x-range (approximate with full width)
            ctx.fillRect(left,Math.min(t,b),right-left,Math.abs(t-b));
          });
        });
      }
    };

    // G1 — Baseline
    const g1Data = {
      labels,
      datasets:[
        {label:'Attained CII',data:annual.map(r=>r.attained_cii),borderColor:'#1A1A1A',borderWidth:2.5,pointRadius:4,tension:0,fill:false},
        {label:'Required CII',data:annual.map(r=>r.required_cii),borderColor:'#C9980A',borderDash:[6,3],borderWidth:1.5,pointRadius:0,fill:false},
      ]
    };
    // Zoom: fixed 2.0–5.4 when off, auto-fit when on
    const yBounds = zoomFit ? {} : {yMin:2.0, yMax:5.4};
    
    buildChart('g1',g1Data,{useGradeBands:true,...yBounds});

    // G2 — Sailing scenarios
    const sailKeys2 = sailFilter==='all'?sailKeys:[sailFilter];
    const g2Datasets=[
      {label:'Required',data:labels.map(yr=>annualOf(baseline).find(r=>parseInt(r.date)===yr)?.required_cii),borderColor:'#C9980A',borderDash:[6,3],borderWidth:1.5,pointRadius:0,fill:false}
    ];
    sailKeys2.forEach((k,i)=>{
      const arr=annualOf(sailing[k]||[]);
      g2Datasets.push({label:k,data:labels.map(yr=>arr.find(r=>parseInt(r.date)===yr)?.attained_cii),borderColor:SAIL_COLORS[sailKeys.indexOf(k)%SAIL_COLORS.length],borderWidth:1.5,pointRadius:3,fill:false});
    });
    buildChart('g2',{labels,datasets:g2Datasets},{useGradeBands:true,...yBounds});

    // G3 — ESD step-down
    const esdMonthly=esdData.monthly_data||[];
    const pts=[];
    esdMonthly.forEach((r,i)=>{
      const[yr,mo]=r.date.split('-').map(Number);
      const x=yr+(mo-1)/12;
      const prev=i>0?esdMonthly[i-1]:null;
      if(i===0){pts.push({x,y:r.attained_cii});}
      else if(r.attained_cii!==prev.attained_cii){pts.push({x,y:prev.attained_cii});pts.push({x,y:r.attained_cii});}
    });
    if(esdMonthly.length){const l=esdMonthly[esdMonthly.length-1];const[ly,lm]=l.date.split('-').map(Number);pts.push({x:ly+lm/12,y:l.attained_cii});}
    buildChart('g3',{datasets:[
      {label:'Required CII',data:labels.map(yr=>({x:yr,y:annualOf(baseline).find(r=>parseInt(r.date)===yr)?.required_cii})),borderColor:'#C9980A',borderDash:[6,3],borderWidth:1.5,pointRadius:0,fill:false,parsing:false},
      {label:'CII with ESDs',data:pts,borderColor:'#2563EB',borderWidth:2.5,pointRadius:0,fill:false,parsing:false,stepped:'before'},
    ]},{useGradeBands:true,...yBounds,scales:{x:{type:'linear',grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'rgba(0,0,0,.04)',drawBorder:false},...(zoomFit?{}:{min:2.0,max:5.4}),ticks:{font:{size:10}}}}});

    // G4 — Combined
    const combKeys2=sailFilter==='all'?Object.keys(combined):[sailFilter];
    const g4Ds=[{label:'Required',data:labels.map(yr=>annualOf(baseline).find(r=>parseInt(r.date)===yr)?.required_cii),borderColor:'#C9980A',borderDash:[6,3],borderWidth:1.5,pointRadius:0,fill:false}];
    combKeys2.forEach((k,i)=>{
      const arr=annualOf(combined[k]||[]);
      g4Ds.push({label:k,data:labels.map(yr=>arr.find(r=>parseInt(r.date)===yr)?.attained_cii),borderColor:SAIL_COLORS[Object.keys(combined).indexOf(k)%SAIL_COLORS.length],borderWidth:1.5,pointRadius:3,fill:false});
    });
    buildChart('g4',{labels,datasets:g4Ds},{useGradeBands:true,...yBounds});
  },[baseline,sailing,combined,esdData,sailFilter,zoomFit,buildChart,annualOf,sailKeys,esdTimeline]);

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
          <button
            className={`zoom-toggle${zoomFit?' active':''}`}
            onClick={()=>setZoomFit(z=>!z)}
          >
            <i className="ti ti-zoom-in-area" style={{fontSize:12}}></i> Auto-fit y-axis
          </button>
          <div style={{display:'flex',gap:8,fontSize:9,color:'var(--ink3)'}}>
            <span>- - CII<sub>R</sub></span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:18,height:2,background:'var(--ink)',display:'inline-block'}}></span> Baseline</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:18,height:2,background:'var(--blue)',display:'inline-block'}}></span> With ESDs</span>
          </div>
        </div>
      </div>
      <div className="g2" style={{marginBottom:14}}>
        <div className="card"><div className="card-hd"><span className="card-title">Graph 1 — Baseline CII</span><span className="bv bv-g">No ESDs</span></div>
          <div className="card-body"><div className="ch h360"><canvas id="sim-g1"></canvas></div></div></div>
        <div className="card"><div className="card-hd"><span className="card-title">Graph 3 — With ESD Rollout</span><span style={{background:'#EFF6FF',color:'#1D4ED8',fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:3}}>Step-down as ESDs install</span></div>
          <div className="card-body"><div className="ch h360"><canvas id="sim-g3"></canvas></div></div></div>
      </div>
      <div className="card" style={{marginBottom:14}}><div className="card-hd"><span className="card-title">Graph 2 — Sailing Profile Scenarios</span></div>
        <div className="card-body"><div className="ch h400"><canvas id="sim-g2"></canvas></div></div></div>
      <div className="card"><div className="card-hd"><span className="card-title">Graph 4 — Sailing + ESD Combined</span></div>
        <div className="card-body"><div className="ch h400"><canvas id="sim-g4"></canvas></div></div></div>
      {esdTimeline.length>0&&(
        <div style={{marginTop:10,display:'flex',flexWrap:'wrap',gap:6,fontSize:10,color:'var(--ink3)'}}>
          {esdTimeline.map((t,i)=>(
            <span key={i} style={{background:'#FEF3C7',color:'#92400E',padding:'2px 7px',borderRadius:3,fontWeight:500}}>
              {t.implementation_label}: {t.name} (+{t.saving_pct}%)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Financial Tab ─────────────────────────────────────────────────────
function FinancialTab({ out }) {
  const cashRef = useRef(null);
  const opexRef = useRef(null);
  const chartsRef = useRef({});
  const fin = out?.financial || {};
  const sum = fin.summary || {};

  useEffect(()=>{
    if(!window.Chart||!cashRef.current||!opexRef.current) return;
    const fmtM=v=>{if(Math.abs(v)>=1e6)return'$'+(v/1e6).toFixed(1)+'M';if(Math.abs(v)>=1e3)return'$'+(v/1e3).toFixed(0)+'K';return'$'+v;};

    // Cashflow chart
    const cf = fin.monthly_cashflows||[];
    const cfPts = cf.filter((_,i)=>i%2===0||cf[i]?.is_docking).map(r=>({x:r.timeline,y:r.cumulative_cashflow}));
    if(chartsRef.current.cash){try{chartsRef.current.cash.destroy();}catch(e){}}
    chartsRef.current.cash = new window.Chart(cashRef.current,{type:'line',data:{datasets:[{label:'Cumulative Cashflow',data:cfPts,borderColor:'#1D9E75',borderWidth:2,pointRadius:0,fill:{target:'origin',above:'rgba(29,158,117,.1)',below:'rgba(239,68,68,.08)'},parsing:false,tension:0}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:12}}},scales:{x:{type:'linear',grid:{display:false},ticks:{font:{size:10},callback:v=>v.toFixed(0)}},y:{grid:{color:'rgba(0,0,0,.04)',drawBorder:false},ticks:{font:{size:10},callback:fmtM}}}}});

    // Yearly stacked bar
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
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},
        scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'rgba(0,0,0,.04)',drawBorder:false},ticks:{font:{size:10},callback:fmtM}}}}});
  },[fin]);

  return(
    <div className="rwrap">
      <div style={{background:'linear-gradient(135deg,var(--gl),#EFF6FF)',border:'1px solid var(--gm)',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:14,display:'flex',gap:10,alignItems:'center'}}>
        <i className="ti ti-trending-up" style={{fontSize:16,color:'var(--green)',flexShrink:0}}></i>
        <div style={{fontSize:10,color:'var(--ink2)'}}>
          <b>FuelEU savings scale as IMO targets tighten.</b> 2026–2029: ×1.0 ($64K/yr) → 2030–2034: ×2.79 ($180K/yr).
        </div>
      </div>
      <div className="g4" style={{marginBottom:14}}>
        <div className="kpi"><div className="kpi-l">NPV</div><div className="kpi-v g">{fmt$(sum.npv_usd)}</div><div className="kpi-s">Savings PV − Investment</div></div>
        <div className="kpi"><div className="kpi-l">IRR</div><div className="kpi-v g">{sum.irr_pct!=null?sum.irr_pct.toFixed(1)+'%':'—'}</div></div>
        <div className="kpi"><div className="kpi-l">Savings PV</div><div className="kpi-v">{fmt$(sum.savings_pv_usd)}</div><div className="kpi-s">@ {sum.discount_rate_pct||10}% discount rate</div></div>
        <div className="kpi"><div className="kpi-l">Accumulated</div><div className="kpi-v">{fmt$(sum.accumulated_savings_usd)}</div><div className="kpi-s">Undiscounted total</div></div>
      </div>
      <div className="g4" style={{marginBottom:14}}>
        <div className="kpi"><div className="kpi-l">Total Investment</div><div className="kpi-v r">{fmt$(sum.total_investment_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Annual Fuel Savings</div><div className="kpi-v">{fmt$(sum.annual_fuel_savings_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Annual EUA Savings</div><div className="kpi-v">{fmt$(sum.annual_ets_savings_usd)}</div></div>
        <div className="kpi"><div className="kpi-l">Payback Period</div><div className="kpi-v g">{sum.payback_years!=null?sum.payback_years.toFixed(2)+' yr':'—'}</div><div className="kpi-s">incl. EUA + FuelEU</div></div>
      </div>
      <div className="g2">
        <div className="card"><div className="card-hd"><span className="card-title">Accumulated Cashflow</span><span style={{fontSize:9,color:'var(--amber)'}}>▲ = docking months</span></div>
          <div className="card-body"><div className="ch h300"><canvas ref={cashRef}></canvas></div></div></div>
        <div className="card"><div className="card-hd"><span className="card-title">Yearly Savings (Stacked)</span><span style={{fontSize:9,color:'var(--purple)'}}>FuelEU grows from 2030</span></div>
          <div className="card-body"><div className="ch h300"><canvas ref={opexRef}></canvas></div></div></div>
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
      <div className="pen-bar" style={{marginBottom:14}}>
        <div className="pen-item"><div className="pen-l">EUA Cost</div><div className="pen-v r">{fmt$(ps.total_eua_cost_usd)}</div><div className="pen-s">{fmtN(eua.total_eua_units,0)} units × ${inp.voyage_meta?.eua_cost_usd||75}</div></div>
        <div className="pen-div"></div>
        <div className="pen-item"><div className="pen-l">FuelEU Penalty</div><div className="pen-v r">{fmt$(ps.total_fuel_eu_penalty_usd)}</div><div className="pen-s">GHG {feu.ghg_intensity_total?.toFixed(2)} vs target {feu.ghg_target?.toFixed(2)}</div></div>
        <div className="pen-div"></div>
        <div className="pen-item"><div className="pen-l">Total EU Compliance</div><div className="pen-v r">{fmt$(ps.total_eu_compliance_cost_usd)}</div><div className="pen-s">EUA + FuelEU / year</div></div>
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
      <div className="g2" style={{marginBottom:14}}>
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
              <tr><td>Carbon Balance (cb)</td><td className="r" style={{color:'var(--red)'}}>{feu.carbon_balance!=null?Math.round(feu.carbon_balance).toLocaleString():'—'}</td></tr>
              <tr><td>EU Voyage Share</td><td className="r">{feu.eu_voyages_percent}%</td></tr>
              <tr><td>Penalty Rate</td><td className="r">€2,400 / tCO₂eq</td></tr>
              <tr><td>EUR → USD</td><td className="r">1.08</td></tr>
              <tr style={{background:'var(--bg)'}}><td><b>FuelEU Penalty (base year)</b></td><td className="r" style={{color:'var(--red)',fontSize:14,fontWeight:600}}>{fmt$(feu.penalty_usd)}</td></tr>
            </tbody></table>
          </div>
        </div>
        <div className="card"><div className="card-hd"><span className="card-title">FuelEU Scaling by Target Period</span></div>
          <div className="card-body">
            <div style={{background:'var(--gl)',borderRadius:6,padding:'9px 12px',fontSize:10,color:'var(--gd)',marginBottom:12}}>
              <b>Why does the penalty grow?</b> As IMO targets drop each year, this vessel becomes <i>more</i> non-compliant. Each tonne of fuel saved by ESDs avoids a proportionally <i>larger</i> penalty.
            </div>
            <table className="tbl"><thead><tr><th>Period</th><th className="r">IMO Target</th><th className="r">Vessel Excess</th><th className="r">Scale Factor</th><th className="r">Annual Penalty</th><th className="r">ESD Savings</th><th className="r">Net Penalty</th></tr></thead>
            <tbody>
              {[
                {period:'2025-2029',target:89.34,excess:'+2.04',scale:'1.00',penalty:yearly.find(r=>r.scale<=1),color:''},
                {period:'2030-2034',target:85.69,excess:'+5.69',scale:'2.79',penalty:yearly.find(r=>r.scale>1),color:'#EFF6FF'},
              ].filter(r=>r.penalty).map((r,i)=>(
                <tr key={i} style={{background:r.color}}>
                  <td>{r.period}</td>
                  <td className="r" style={{color:r.scale==='1.00'?'var(--green)':'var(--amber)'}}>{r.target.toFixed(4)}</td>
                  <td className="r" style={{color:'var(--red)'}}>{r.excess}</td>
                  <td className="r" style={{color:r.scale!=='1.00'?'var(--blue)':''}}><b>{r.scale}×</b></td>
                  <td className="r" style={{color:'var(--red)'}}>{fmt$(r.penalty?.vessel_penalty_usd)}</td>
                  <td className="r" style={{color:'var(--green)'}}>{fmt$(r.penalty?.esd_savings_usd)}</td>
                  <td className="r">{fmt$(r.penalty?.net_penalty_usd)}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>
      {yearly.length>0&&(
        <div className="card"><div className="card-hd">
          <div><div className="card-title">Year-by-Year FuelEU Projection</div><div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>Annual penalty + ESD savings per year.</div></div>
        </div>
        <div style={{overflowX:'auto'}}>
        <table className="tbl"><thead><tr><th>Year</th><th className="r">IMO Target</th><th className="r">Excess</th><th className="r">Scale</th><th className="r">Vessel Penalty</th><th className="r">ESD Savings</th><th className="r">Net Penalty</th><th className="r">Cumul. Penalty</th><th className="r">Cumul. Savings</th></tr></thead>
        <tbody>
          {yearly.map((r,i)=>(
            <tr key={i} style={{background:r.scale>1?'#EFF6FF':''}}>
              <td><b>{r.year}</b> {r.scale>1&&<span style={{fontSize:8,color:'var(--blue)',fontWeight:600,marginLeft:4}}>{r.scale.toFixed(2)}×</span>}</td>
              <td className="r">{r.target?.toFixed(4)}</td>
              <td className="r" style={{color:'var(--red)'}}>+{r.vessel_excess?.toFixed(4)}</td>
              <td className="r"><b style={{color:r.scale>1?'var(--blue)':''}}>{r.scale?.toFixed(3)}×</b></td>
              <td className="r" style={{color:'var(--red)'}}>{fmt$(r.vessel_penalty_usd)}</td>
              <td className="r" style={{color:'var(--green)'}}>{fmt$(r.esd_savings_usd)}</td>
              <td className="r">{fmt$(r.net_penalty_usd)}</td>
              <td className="r" style={{color:'var(--ink3)'}}>{fmt$(r.cumulative_vessel_penalty)}</td>
              <td className="r" style={{color:'var(--green)'}}>{fmt$(r.cumulative_esd_savings)}</td>
            </tr>
          ))}
          {yearly.length>0&&(
            <tr style={{background:'var(--ink)',color:'#fff'}}>
              <td><b>Total ({yearly[0]?.year}–{yearly[yearly.length-1]?.year})</b></td>
              <td className="r">—</td><td className="r">—</td><td className="r">—</td>
              <td className="r" style={{color:'#FCA5A5'}}><b>{fmt$(yearly.reduce((s,r)=>s+r.vessel_penalty_usd,0))}</b></td>
              <td className="r" style={{color:'#6EE7B7'}}><b>{fmt$(yearly.reduce((s,r)=>s+r.esd_savings_usd,0))}</b></td>
              <td className="r"><b>{fmt$(yearly.reduce((s,r)=>s+r.net_penalty_usd,0))}</b></td>
              <td className="r">—</td><td className="r">—</td>
            </tr>
          )}
        </tbody></table>
        </div></div>
      )}
    </div>
  );
}

// =====================================================================
// MAIN WORKSPACE
// =====================================================================
export default function SimulationWorkspace({ vesselId, vesselName, sessionMode, initialReport, vesselReports, onBack }) {
  const [loading,    setLoading]    = useState(false);
  const [running,    setRunning]    = useState(false);
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
      console.log('[Workspace] Mount — vesselId:', vesselId, 'sessionMode:', sessionMode, 'initialReport:', !!initialReport);

      // ── ALL data comes from the report selected in session modal ──
      // initialReport is fetched by Tracker.confirmSession() via GET /simulation/report/?report_id=X
      if (initialReport) {
        const inp = initialReport.input || initialReport;
        console.log('[Workspace] Loading from report:', initialReport.report_id);

        populateSidebar(inp);
        setReportId(initialReport.report_id || null);

        // "Latest" mode → show the report output immediately
        // "Base" mode → only load inputs, user clicks Run Simulation for new report
        if (sessionMode === 'last' && initialReport.output) {
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
    console.log('[runSim] Starting — vesselMeta:', !!vesselMeta, 'sessionMode:', sessionMode, 'reportId:', reportId);
    if(!vesselMeta) { setError('Vessel data not loaded yet.'); return; }
    setRunning(true); setError(null);

    const inputData = {
      vesselId: vesselId,  // pass vessel_id for the API
      vessel: vesselMeta.vessel,
      voyage_meta: {
        ...vesselMeta.voyage_meta,
        sailing_days_per_year: sailingDays,
        non_steaming_days_per_year: nonSailingDays,
        eua_cost_usd: euaCost,
      },
      machines,
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
        result = await simulationAPI.simulate(inputData, selectedEsds);
      }

      if (result.success) {
        const report = result.data?.data || result.data;
        console.log('[runSim] Success — report_id:', report?.report_id);
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

  if(loading) return(
    <div style={{display:'flex',flex:1,alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'var(--ink3)'}}>
      <div style={{fontSize:28}}>⏳</div><div>Loading vessel data…</div>
    </div>
  );

  return(
    <div style={{display:'flex',width:'100%',height:'calc(100vh - 52px)',overflow:'hidden'}}>

      {/* ========== SIDEBAR ========== */}
      <div className={`sim-sidebar${sidebarOpen?' open':''}`} style={{flexShrink:0}}>
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
                  {e.selected&&(
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
        <div style={{background:'var(--sf)',borderBottom:'1px solid var(--bd)',padding:'8px 20px',display:'flex',alignItems:'center',gap:16,flexShrink:0,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>{v.vessel_name||vesselName||'—'}</div>
            <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>
              {[v.vessel_type,'IMO '+(v.imo_number||'?'),'Built '+(v.build_year||'?'),v.flag,v.name_of_owner].filter(Boolean).join(' · ')}
            </div>
          </div>
          {reportData&&(
            <div style={{display:'flex',gap:24,alignItems:'center'}}>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:9,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.3px'}}>EU Compliance Cost</div>
                <div style={{fontSize:16,fontWeight:600,color:'var(--red)',fontFamily:'IBM Plex Mono,monospace'}}>{fmt$(ps.total_eu_compliance_cost_usd)}</div>
                <div style={{fontSize:9,color:'var(--ink3)'}}>EUA + FuelEU / yr</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:9,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.3px'}}>ESD Annual Savings</div>
                <div style={{fontSize:16,fontWeight:600,color:'var(--green)',fontFamily:'IBM Plex Mono,monospace'}}>{fmt$(esdSum)}</div>
                <div style={{fontSize:9,color:'var(--ink3)'}}>fuel + EUA + FuelEU / yr</div>
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:reportData?12:'auto'}}>
            {feuP.compliant===false&&<span style={{padding:'3px 8px',borderRadius:10,fontSize:9,fontWeight:600,background:'#FEE2E2',color:'var(--red)'}}>FuelEU Non-Compliant</span>}
            {grade&&<span style={{padding:'3px 8px',borderRadius:10,fontSize:9,fontWeight:600,background:'var(--gl)',color:'var(--green)'}}>CII Grade {grade}</span>}
            <button className="btn btn-secondary btn-sm" onClick={()=>setSidebarOpen(o=>!o)}>
              <i className={`ti ${sidebarOpen?'ti-x':'ti-sliders'}`}></i> {sidebarOpen?'Hide Inputs':'Edit Inputs'}
            </button>
          </div>
        </div>

        {/* Report tabs */}
        <div className="report-tabs">
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