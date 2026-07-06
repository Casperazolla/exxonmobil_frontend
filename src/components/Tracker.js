import React, { useEffect, useState } from 'react';
import {Select, Input} from "antd";

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

import './Tracker.css';
import { ESD_LIBRARY } from '../data/esdLibrary';
import { SAMPLE_VESSELS } from '../data/vessels';
import { SAMPLE_TRACKER } from '../data/trackerData';
import './Simulator.css';
import { onboardingAPI, vesselAPI } from '../services/apiService';


const { Option } = Select;
const mapApiVesselToLocal = (raw = {}, index = 0) => {
  const v = raw.vessel || raw;
  const meta = raw.voyage_meta || raw.voyageMeta || {};
  const machines = raw.machines || [];
  const esdMeasures = raw.esd_measures || raw.esdMeasures || [];

  return {
    id: raw.id ?? v.id ?? `v${index}`,
    month: meta.analysis_month ?? '',
    year: meta.analysis_year ?? new Date().getFullYear(),
    dockMonth: meta.docking_month ?? '',
    owner: v.name_of_owner ?? '',
    vesselName: v.vessel_name ?? '',
    vesselType: v.vessel_type ?? '',
    buildYear: v.build_year ?? '',
    flag: v.flag ?? '',
    classificationSociety: v.classification_society ?? '',
    imoNumber: v.imo_number ?? '',
    grossTonnage: v.gross_tonnage ?? '',
    deadWeight: v.dead_weight ?? '',
    sailingDays: meta.sailing_days_per_year ?? '',
    nonSteamingDays: meta.non_steaming_days_per_year ?? '',
    euPct: meta.eu_voyages_percent ?? '',
    euaCost: meta.eua_cost_usd ?? '',
    costDO: raw.cost_do ?? '',
    costLFO: raw.cost_lfo ?? '',
    costHFO: raw.cost_hfo ?? '',
    costLPGP: raw.cost_lpgp ?? '',
    costLPGB: raw.cost_lpgb ?? '',
    costLNG: raw.cost_lng ?? '',
    feumPenalty: raw.feum_penalty ?? '',
    ciiRating: raw.cii_rating ?? 'D',
    machines,
    selectedEsds: esdMeasures.map((e) => e.id).filter(Boolean),
  };
};




function Tracker({ userEmail, onLogout }) {
  const [activeTab, setActiveTab] = useState('vessels');
  const [vessels, setVessels] = useState(SAMPLE_VESSELS);
  const [trackerData] = useState(SAMPLE_TRACKER);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [simulatingId, setSimulatingId] = useState(SAMPLE_VESSELS[0]?.id ?? null);
  const [selectedEsds, setSelectedEsds] = useState([]);
  const [vesselsLoading, setVesselsLoading] = useState(true);
  const [vesselsError, setVesselsError] = useState(null);

 useEffect(() => {
 

  loadVessels();
}, []);


   
const createFuel = () => ({
  fuelName: "",
  consumption: "",
  price: ""
});

const createMachine = (name = "") => ({
  machineName: name,
  fuels: [createFuel()]
});

const [machines, setMachines] = useState([
  createMachine("Main engine"),
  createMachine("Auxiliary engine")
]);

const [formData, setFormData] = useState({
    month: '',
    year: new Date().getFullYear(),
    dockMonth: '',
    owner: '',
    vesselName: '',
    vesselType: '',
    buildYear: '',
    flag: '',
    classificationSociety: '',
    imoNumber: '',
    grossTonnage: '',
    deadWeight: '',
    sailingDays: '',
    nonSteamingDays: '',
    euPct: '',
    euaCost: '',
    costDO: '',
    costLFO: '',
    costHFO: '',
    costLPGP: '',
    costLPGB: '',
    costLNG: '',
    feumPenalty: '',
    ciiRating: 'D',
  });

  const openOnboardModal = (vesselId = null) => {
    if (vesselId) {
      const vessel = vessels.find(v => v.id === vesselId);
      if (vessel) {
        setFormData(vessel);
        setEditingId(vesselId);
      }
    } else {
      setFormData({
        month: '',
        year: new Date().getFullYear(),
        dockMonth: '',
        owner: '',
        vesselName: '',
        vesselType: '',
        buildYear: '',
        flag: '',
        classificationSociety: '',
        imoNumber: '',
        grossTonnage: '',
        deadWeight: '',
        sailingDays: '',
        nonSteamingDays: '',
        euPct: '',
        euaCost: '',
        costDO: '',
        costLFO: '',
        costHFO: '',
        costLPGP: '',
        costLPGB: '',
        costLNG: '',
        feumPenalty: '',
        ciiRating: 'D',
      });
      setEditingId(null);
    }
    setModalOpen(true);
  };


    const toggleESD = (id) => {
    setSelectedEsds(prev =>
        prev.includes(id)
            ? prev.filter(item => item !== id)
            : [...prev, id]
    );
};


  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  useEffect(() => {
    if (vessels.length === 0) {
      setSimulatingId(null);
      return;
    }

    const activeVesselExists = vessels.some(vessel => vessel.id === simulatingId);

    if (!activeVesselExists) {
      setSimulatingId(vessels[0].id);
    }
  }, [simulatingId, vessels]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addMachine = () => {
  setMachines(prev => [
    ...prev,
    createMachine("")
  ]);
};

const removeMachine = (machineIndex) => {
  if (machineIndex < 2) return; // Don't delete default machines

  setMachines(prev =>
    prev.filter((_, index) => index !== machineIndex)
  );
};

const addFuel = (machineIndex) => {
  setMachines(prev =>
    prev.map((machine, index) =>
      index === machineIndex
        ? {
            ...machine,
            fuels: [...machine.fuels, createFuel()]
          }
        : machine
    )
  );
};

const removeFuel = (machineIndex, fuelIndex) => {
  setMachines(prev =>
    prev.map((machine, index) => {
      if (index !== machineIndex) return machine;

      if (machine.fuels.length === 1) {
        return machine;
      }

      return {
        ...machine,
        fuels: machine.fuels.filter((_, i) => i !== fuelIndex)
      };
    })
  );
};

const updateMachineName = (machineIndex, value) => {
  setMachines(prev =>
    prev.map((machine, index) =>
      index === machineIndex
        ? { ...machine, machineName: value }
        : machine
    )
  );
};

const updateFuel = (
  machineIndex,
  fuelIndex,
  field,
  value
) => {
  setMachines(prev =>
    prev.map((machine, index) => {
      if (index !== machineIndex) return machine;

      return {
        ...machine,
        fuels: machine.fuels.map((fuel, i) =>
          i === fuelIndex
            ? {
                ...fuel,
                [field]: value
              }
            : fuel
        )
      };
    })
  );
};


const loadVessels = async () => {
   
  setVesselsLoading(true);
  setVesselsError(null);

  try {

    const result = await vesselAPI.getAll();

    
    if (!result.success) {
      setVesselsError(result.error);
      return;
    }

   const vesselList =
  result.data?.data?.vessels ||
  result.data?.vessels ||
  result.data?.results ||
  [];

   

    setVessels(
      vesselList.map((item, index) =>
        mapApiVesselToLocal(item, index)
      )
    );

  } catch (err) {

    console.error("LOAD ERROR:", err);

  } finally {

    setVesselsLoading(false);

  }

};

const saveVessel = async () => {

  if (!formData.vesselName || !formData.owner || !formData.imoNumber) {
    alert("Please fill in required fields");
    return;
  }

  const selectedEsdObjects = selectedEsds
    .map(id => ESD_LIBRARY.find(esd => esd.id === id))
    .filter(Boolean);

  const payload = {

    vessel: {
      name_of_owner: formData.owner,
      vessel_name: formData.vesselName,
      vessel_type: (formData.vesselType || "")
        .toLowerCase()
        .replace(/\s+/g, "_"),

      build_year: parseInt(formData.buildYear, 10) || 0,
      flag: formData.flag,
      classification_society: formData.classificationSociety,
      imo_number: formData.imoNumber,
      gross_tonnage: parseFloat(formData.grossTonnage) || 0,
      dead_weight: parseFloat(formData.deadWeight) || 0,
    },

    voyage_meta: {
      analysis_month: parseInt(formData.month, 10) || 0,
      analysis_year: parseInt(formData.year, 10) || 0,
      docking_month: parseInt(formData.dockMonth, 10) || 0,
      sailing_days_per_year: parseInt(formData.sailingDays, 10) || 0,
      non_steaming_days_per_year:
        parseInt(formData.nonSteamingDays, 10) || 0,
      eu_voyages_percent: parseFloat(formData.euPct) || 0,
      eua_cost_usd: parseFloat(formData.euaCost) || 0,
    },

    machines: machines.map(machine => ({
      machine_name: machine.machineName,

      fuel_particulars: machine.fuels.map(fuel => ({
        fuel_name: fuel.fuelName,
        consumption_mt: parseFloat(fuel.consumption) || 0,
        fuel_price_usd_per_mt: parseFloat(fuel.price) || 0,
      })),
    })),

    esd_measures: selectedEsdObjects.map(esd => ({
      category: esd.category.toLowerCase(),
      name: esd.name,
      efficiency_gain_percent: esd.saving,
      cost_usd: esd.capex,
    })),
  };


  try {

    const response = await onboardingAPI.onboardVessel(payload);


    if (!response.success) {
      alert(response.error || "Failed to onboard vessel");
      return;
    }


await loadVessels();

closeModal();
  } catch (error) {

    console.error("Onboard Vessel Error:", error);

    alert(
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Something went wrong."
    );

  }
};

  const deleteVessel = (vesselId) => {
    if (window.confirm('Are you sure you want to delete this vessel?')) {
      setVessels(vessels.filter(v => v.id !== vesselId));
    }
  };

  const openSimulator = (vesselId) => {
    setSimulatingId(vesselId);
    setSelectedEsds([]);
    setActiveTab('simulator');
  };

  const handleExportPdf = () => {
    if (!vessel) {
      return;
    }

    const previousTitle = document.title;
    document.title = `${vessel.vesselName || 'Vessel'} Report`;
    window.print();
    document.title = previousTitle;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  const formatCurrencyShort = (value) => {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);

    if (abs >= 1000000) {
      return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    }

    if (abs >= 1000) {
      return `${sign}$${(abs / 1000).toFixed(0)}K`;
    }

    return `${sign}$${abs.toFixed(0)}`;
  };

  const formatMillions = (value) => `$${(value / 1000000).toFixed(1)}M`;

  const getCategoryColor = (category) => {
    const colors = {
      HULL: '#1D9E75',
      ENGINE: '#D97706',
      PROPULSION: '#2C6FBF',
      OPERATIONS: '#8B5CF6',
      AUXILIARY: '#F59E0B',
      MONITORING: '#EC4899',
    };
    return colors[category] || '#9CA3AF';
  };

  const toggleEsd = (esdId) => {
    setSelectedEsds(prev => 
      prev.includes(esdId) 
        ? prev.filter(id => id !== esdId)
        : [...prev, esdId]
    );
  };

  const removeSelectedEsd = (esdId) => {
    setSelectedEsds(prev => prev.filter(id => id !== esdId));
  };

  const getSimulatingVessel = () => vessels.find(v => v.id === simulatingId);
  
  const selectedEsdObjects = selectedEsds.map(id => 
    ESD_LIBRARY.find(e => e.id === id)
  ).filter(Boolean);

  // Financial calculations
  const totalCapex = selectedEsdObjects.reduce((sum, esd) => sum + (esd?.capex || 0), 0);
  const totalSaving = selectedEsdObjects.reduce((sum, esd) => sum + (esd?.saving || 0), 0);
  const vessel = getSimulatingVessel();
  const annualFuel = vessel ? ((vessel.costDO || 0) + (vessel.costLFO || 0) + (vessel.costHFO || 0)) * 100 : 0;
  const annualValue = annualFuel > 0 ? (annualFuel * totalSaving / 100) : 30420;
  const payback = annualValue > 0 ? (totalCapex / annualValue).toFixed(1) : 0;
  const npv = annualValue * 10 - totalCapex;
  const accumulatedSavings = annualValue * 2.5;
  const savingsPV = annualValue * 8;

 const investmentData = [
  { name: 'Total Cost', value: totalCapex },
  { name: 'Accum. Savings', value: -accumulatedSavings },
  { name: 'NPV', value: Math.max(npv, 0) },
  { name: 'Savings PV', value: savingsPV },
];

  const cashFlowData = Array.from({ length: 13 }, (_, idx) => {
    const year = 2025 + idx;
    return {
      year,
      cashFlow: totalCapex + annualValue * idx,
    };
  });

  const opexData = [
    { year: 2025, savings: annualValue, euSavings: annualValue * 0.3 },
    { year: 2026, savings: annualValue, euSavings: annualValue * 0.3 },
    { year: 2027, savings: annualValue, euSavings: annualValue * 0.3 },
    { year: 2028, savings: annualValue, euSavings: annualValue * 0.35 },
    { year: 2029, savings: annualValue, euSavings: annualValue * 0.35 },
    { year: 2030, savings: annualValue, euSavings: annualValue * 0.35 },
    { year: 2031, savings: annualValue, euSavings: annualValue * 0.4 },
    { year: 2032, savings: annualValue, euSavings: annualValue * 0.4 },
   
  ];

  const CATEGORY_NAMES = {
  hull: "Hydrodynamic Upgrades",
  propulsion: "Hydrodynamic Upgrades",

  engine: "Main Engine Upgrades",

  auxiliary: "Electrical Upgrades",

  operations: "Thermodynamic Upgrades",
};

 const groupedEsds = {};

ESD_LIBRARY.forEach((esd) => {
  const key = CATEGORY_NAMES[esd.category.toLowerCase()] || esd.category;

  if (!groupedEsds[key]) {
    groupedEsds[key] = [];
  }

  groupedEsds[key].push(esd);
});

  return (
    <div className="tracker-wrapper">
      {/* Navigation */}
      <nav className="nav">
        <a href="#" className="nav-brand">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect width="22" height="22" rx="5" fill="#1D9E75"/>
      <path d="M4 13 Q11 8 18 13" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M4 13 L6 17 L16 17 L18 13" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,.15)" stroke-linejoin="round"/>
      <ellipse cx="6" cy="15.5" rx="1.5" ry="1.5" fill="white" opacity=".6"/>
    </svg>
          <span>Azolla ESD Platform</span>
          <span className="nav-badge">Decarbonisation Suite</span>
        </a>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'vessels' ? 'on' : ''}`}
            onClick={() => setActiveTab('vessels')}
          >
            Vessels
          </button>
          <button
            className={`nav-tab ${activeTab === 'simulator' ? 'on' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            ESD Simulator
          </button>
        </div>
        <div className="nav-right">
          <span className="user-email">{userEmail}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container">
        {/* ===== VESSELS PAGE ===== */}
        {activeTab === 'vessels' && (
          <div className="page-content">
            <div className="sec-hd">
              <div>
                <div className="sec-title">Vessel Fleet</div>
                <div className="sec-sub">Manage and track vessels onboarded to the platform</div>
              </div>
              <button className="btn btn-primary" onClick={() => openOnboardModal()}>
                + Onboard Vessel
              </button>
            </div>

            <div className="card">
              <div className="card-hd">
                <span className="card-title">Vessels ({vessels.length})</span>
              </div>
              <div className="card-body">
                {vesselsLoading ? (
                  <div className="empty-state">
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                    Loading vessels…
                  </div>
                ) : vesselsError ? (
                  <div className="empty-state">
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
                    Couldn't load vessels: {vesselsError}
                  </div>
                ) : vessels.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚢</div>
                    No vessels onboarded yet
                  </div>
                ) : (
                  <table className="vessel-table">
                    <thead>
                      <tr>
                        <th>Vessel</th>
                        <th>Type</th>
                        <th>IMO</th>
                        <th>DWT</th>
                        <th>Annual Fuel</th>
                        <th>CII</th>
                        <th>FEUM Penalty</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vessels.map((vessel) => {
                        const ageYrs = new Date().getFullYear() - vessel.buildYear;
                        const annualFuel = (vessel.costDO || 0) + (vessel.costLFO || 0) + (vessel.costHFO || 0);
                        return (
                          <tr key={vessel.id}>
                            <td>
                              <div className="vessel-row-name">{vessel.vesselName}</div>
                              <div className="vessel-row-sub">
                                {vessel.owner} · {vessel.flag} · Built {vessel.buildYear} ({ageYrs}yr)
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-blue">{vessel.vesselType}</span>
                            </td>
                            <td className="mono">{vessel.imoNumber}</td>
                            <td>{formatNumber(vessel.deadWeight)} t</td>
                            <td>{formatNumber(annualFuel)} MT/yr</td>
                            <td>
                              <span
                                className="cii-rating"
                                style={{
                                  color: {
                                    A: '#059669',
                                    B: '#65A30D',
                                    C: '#D97706',
                                    D: '#DC2626',
                                    E: '#991B1B',
                                  }[vessel.ciiRating],
                                }}
                              >
                                {vessel.ciiRating}
                              </span>
                            </td>
                            <td style={{ color: '#DC2626' }}>
                              ${formatNumber(vessel.feumPenalty)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openOnboardModal(vessel.id)}
                                >
                                  ✏️ Edit
                                </button>
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={() => openSimulator(vessel.id)}
                                >
                                  ⚙️ Simulate
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm"
                                  onClick={() => deleteVessel(vessel.id)}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== SIMULATOR PAGE ===== */}
        {activeTab === 'simulator' && (
          <div className="page-content simulator-page report-export">
            {/* Header with vessel badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A' }}>
                  Tenjun — IMO {vessel?.imoNumber}
                </div>
                <span style={{ fontSize: '11px', background: '#1D9E75', color: 'white', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                  🚢 Tenjun 9343390
                </span>
              </div>
              <button className="btn btn-secondary" style={{ gap: '6px' }} onClick={handleExportPdf} type="button">
                📥 Export PDF
              </button>
            </div>

            <div style={{
  marginBottom:'12px'
}}>
  <span style={{
     fontSize:'11px',
     color:'#999'
  }}>
     VESSEL:
  </span>

  <span className="badge badge-green">
     🚢 Tenjun 9343390
  </span>
</div>

<div className="simulator-layout">              {/* LEFT: ESD Library */}
<div className="card esd-library">                <div className="card-hd"><span className="card-title">ESD Library</span></div>
                <div>
                  {ESD_LIBRARY.reduce((acc, esd) => {
                    const catIdx = acc.findIndex(g => g.category === esd.category);
                    if (catIdx === -1) {
                      acc.push({ category: esd.category, items: [esd] });
                    } else {
                      acc[catIdx].items.push(esd);
                    }
                    return acc;
                  }, []).map((group) => (
                    <div key={group.category}>
                      <div style={{ padding: '8px 12px', fontWeight: '600', fontSize: '10px', color: getCategoryColor(group.category), backgroundColor: '#f9fafb', borderTop: '1px solid #E5E7EB' }}>
                        • {group.category}
                      </div>
                      {group.items.map((esd) => {
                        const isSelected = selectedEsds.includes(esd.id);
                        return (
                        <label key={esd.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 12px', borderBottom: '0.5px solid #E5E7EB', cursor: 'pointer', gap: '6px', backgroundColor: isSelected ? '#E8F7F2' : '#FFFFFF' }}>
                          <input
                            type="checkbox"
                            className="esd-checkbox"
                            checked={isSelected}
                            onChange={() => toggleEsd(esd.id)}
                            style={{ marginTop: '2px'  }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', fontSize: '11px' }}>{esd.name}</div>
                            <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '2px' }}>
                              +{esd.saving}% · ${(esd.capex / 1000).toFixed(0)}K
                            </div>
                          </div>
                        </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* CENTER: Charts & Content */}
{/* CENTER: Charts & Content */}
<div className="simulator-center">                {/* Selected ESDs */}
                <div className="card">
                  <div className="card-body" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                      Selected ESDs <span style={{ color: '#9CA3AF' }}>({selectedEsds.length} selected)</span>
                    </div>
                    {selectedEsdObjects.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {selectedEsdObjects.map((esd) => (
                            <div
                              key={esd.id}
                              style={{
                                background: '#F3F4F6',
                                border: '1px solid #E5E7EB',
                                borderRadius: '4px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#1A1A1A',
                              }}
                            >
                              {esd.name}
                              <button
                                onClick={() => removeSelectedEsd(esd.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#9CA3AF',
                                  padding: '0',
                                  fontSize: '12px',
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '6px' }}>
                          Click to remove
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                        Select an ESD to continue
                      </div>
                    )}
                  </div>
                </div>


                <div className="chart-row">

  <div className="card chart-card">

    <div className="card-hd">
      <span className="card-title">
        Investment Overview
      </span>
    </div>

    <div className="card-body">

<ResponsiveContainer width="100%" height={280}>
  <BarChart data={investmentData}>
    <CartesianGrid stroke="#E5E7EB" strokeOpacity={0.6} vertical={false} />
    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
    <YAxis tickFormatter={formatMillions} tick={{ fontSize: 11 }} />
    <Tooltip formatter={(value) => formatCurrencyShort(value)} />
    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
      {investmentData.map((entry, index) => (
        <Cell
          key={index}
          fill={entry.value < 0 ? "#e0746acb" : "#216ad8bb"}
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
    </div>

  </div>

  <div className="card chart-card">

    <div className="card-hd">
      <span className="card-title">
        Accumulated Cash Flow
      </span>
    </div>

    <div className="card-body">

<ResponsiveContainer width="100%" height={280}>
  <AreaChart data={cashFlowData}>
    <defs>
      <linearGradient id="cashFlowFill" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.12} />
        <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.32} />
      </linearGradient>
      <linearGradient id="cashFlowStroke" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stopColor="#5A84CA" />
        <stop offset="100%" stopColor="#216ad8bb" />
      </linearGradient>
    </defs>
    <CartesianGrid stroke="#E5E7EB" strokeOpacity={0.6} vertical={false} />
    <XAxis dataKey="year" ticks={[2025, 2028, 2031, 2034, 2037]} tick={{ fontSize: 11 }} />
    <YAxis domain={[200000, 'auto']} tickFormatter={formatMillions} tick={{ fontSize: 11 }} />
    <Tooltip formatter={(value) => formatCurrencyShort(value)} />
    <Area
      type="monotone"
      dataKey="cashFlow"
      stroke="url(#cashFlowStroke)"
      strokeWidth={2}
      fill="url(#cashFlowFill)"
      dot={{ r: 3, fill: '#2F6ECB' }}
      activeDot={{ r: 4 }}
    />
  </AreaChart>
</ResponsiveContainer>
    </div>

  </div>

</div>

<div className="card opex-card">

  <div className="card-hd">
    <span className="card-title">
      EET Yearly OpEx Savings
    </span>
  </div>

  <div className="card-body">

<ResponsiveContainer width="100%" height={320}>
  <BarChart data={opexData}>
    <CartesianGrid stroke="#E5E7EB" strokeOpacity={0.6} vertical={false} />
    <XAxis dataKey="year" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="savings" stackId="opex" fill="#216ad8bb" name="Savings" />
    <Bar dataKey="euSavings" stackId="opex" fill="#b1c5f1ce" name="EU Savings" />
    
  </BarChart>
</ResponsiveContainer>
  </div>

</div>
</div>

             
<div className="simulator-right"> 
              <div className="kpi-row">
               {/* Active ESDs */}
                <div className="kpi-card">
                  <div className="kpi-label">ESDs Active</div>
                  <div className="kpi-value" style={{ color: '#1D9E75' }}>{selectedEsds.length}</div>
                </div>

                {/* Total Saving */}
                <div className="kpi-card">
                  <div className="kpi-label">Total Saving</div>
                  <div className="kpi-value" style={{ color: '#1D9E75' }}>{totalSaving.toFixed(1)}%</div>
                </div>

                {/* Annual Value */}
                <div className="kpi-card">
                  <div className="kpi-label">Annual Value</div>
                  <div className="kpi-value" style={{ color: '#2C6FBF' }}>
                    ${(annualValue / 1000).toFixed(0)}K
                  </div>
                </div>

                {/* Total CAPEX */}
                <div className="kpi-card">
                  <div className="kpi-label">Total CAPEX</div>
                  <div className="kpi-value" style={{ color: '#D97706' }}>
                    ${(totalCapex / 1000).toFixed(0)}K
                  </div>
                </div>

                {/* Payback */}
                <div className="kpi-card">
                  <div className="kpi-label">Payback</div>
                  <div className="kpi-value" style={{ color: '#F59E0B' }}>{payback}y</div>
                </div>

                {/* Free Allowance */}
                <div className="kpi-card">
                  <div className="kpi-label">Free Allowance</div>
                  <div className="kpi-value" style={{ color: '#DC2626' }}>
                    ${formatNumber(30845)}
                  </div>
                </div>

                </div>
                                <div className="card" style={{ padding: '12px' }}>
                  <div className="kpi-label">CII Rating</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <div style={{ padding: '8px 12px', border: '2px solid #DC2626', borderRadius: '6px', fontWeight: '600', fontSize: '14px', color: '#DC2626', minWidth: '50px', textAlign: 'center' }}>
                      {vessel?.ciiRating || 'D'}
                    </div>
                    <div style={{ fontSize: '18px', color: '#9CA3AF' }}>→</div>
                    <div style={{ padding: '8px 12px', border: '2px solid #D97706', borderRadius: '6px', fontWeight: '600', fontSize: '14px', color: '#D97706', minWidth: '50px', textAlign: 'center' }}>
                      C
                    </div>
                  </div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '6px' }}>Improvement estimated</div>
                </div>

                {/* Impact Breakdown */}
                <div className="card" style={{ padding: '12px', height: '530px' }}>
                  <div className="kpi-label">Impact Breakdown</div>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedEsdObjects.map((esd) => (
                      <div key={esd.id} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
                        <span style={{ color: '#1A1A1A', fontWeight: '500' }}>{esd.name}</span>
                        <span style={{ color: '#1D9E75', fontWeight: '600' }}>+{esd.saving}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CII Rating */}

              </div>

              
            </div>

            

           
          </div>
        )}
      </div>

      {/* ===== MODAL: Onboard Vessel ===== */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>
                  {editingId ? 'Edit Vessel' : 'Onboard New Vessel'}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                  Fill in the vessel details. Yellow-highlighted fields are required.
                </div>
              </div>
              <button className="btn btn-ghost" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="onboard-card">
              <div className="form-section">
                <div className="form-section-title">📅 Analysis Period</div>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Analysis Month <span className="req">*</span></label>
                    <select
                      name="month"
                      value={formData.month}
                      onChange={handleFormChange}
                      className="form-input"
                    >
                      <option value="">Select month</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Analysis Year <span className="req">*</span></label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleFormChange}
                      className="form-input"
                      min="2020"
                      max="2040"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Docking Month <span className="req">*</span></label>
                    <select
                      name="dockMonth"
                      value={formData.dockMonth}
                      onChange={handleFormChange}
                      className="form-input"
                    >
                      <option value="">Select month</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
                      </div>

                      <div className="onboard-card">
              <div className="form-section">
                <div className="form-section-title">🏷️ Vessel Identification</div>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Name of Owner <span className="req">*</span></label>
                    <input
                      type="text"
                      name="owner"
                      value={formData.owner}
                      onChange={handleFormChange}
                      placeholder="e.g. NYK Line"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vessel Name <span className="req">*</span></label>
                    <input
                      type="text"
                      name="vesselName"
                      value={formData.vesselName}
                      onChange={handleFormChange}
                      placeholder="e.g. Tenjun"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vessel Type <span className="req">*</span></label>
                    <select
                      name="vesselType"
                      value={formData.vesselType}
                      onChange={handleFormChange}
                      className="form-input"
                    >
                      <option value="">Select type</option>
                      <option>Tanker</option>
                      <option>Bulk Carrier</option>
                      <option>Container</option>
                      <option>General Cargo</option>
                      <option>LNG Carrier</option>
                      <option>RORO</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Build Year <span className="req">*</span></label>
                    <input
                      type="number"
                      name="buildYear"
                      value={formData.buildYear}
                      onChange={handleFormChange}
                      placeholder="2008"
                      className="form-input"
                      min="1960"
                      max="2030"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Flag <span className="req">*</span></label>
                    <input
                      type="text"
                      name="flag"
                      value={formData.flag}
                      onChange={handleFormChange}
                      placeholder="e.g. Panama"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Classification Society <span className="req">*</span></label>
                    <select
                      name="classificationSociety"
                      value={formData.classificationSociety}
                      onChange={handleFormChange}
                      className="form-input"
                    >
                      <option value="">Select</option>
                      <option>ABS</option>
                      <option>DNV</option>
                      <option>Lloyds</option>
                      <option>BV</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">IMO Number <span className="req">*</span></label>
                    <input
                      type="text"
                      name="imoNumber"
                      value={formData.imoNumber}
                      onChange={handleFormChange}
                      placeholder="9343390"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gross Tonnage (GT) <span className="req">*</span></label>
                    <input
                      type="number"
                      name="grossTonnage"
                      value={formData.grossTonnage}
                      onChange={handleFormChange}
                      placeholder="159927"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dead Weight (DWT) <span className="req">*</span></label>
                    <input
                      type="number"
                      name="deadWeight"
                      value={formData.deadWeight}
                      onChange={handleFormChange}
                      placeholder="302107"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
              </div>

              {/* Vessel Condition Profile */}
              <div className="onboard-card">
              <div className="form-section">
                <div className="form-section-title">📊 Vessel Condition Profile</div>
                <div className="form-grid form-grid-4">
                  <div className="form-group">
                    <label className="form-label">Sailing Days/Year <span className="req">*</span></label>
                    <input
                      type="number"
                      name="sailingDays"
                      value={formData.sailingDays}
                      onChange={handleFormChange}
                      placeholder="207"
                      className="form-input"
                    />
                    <div className="form-hint">Total operating days at sea</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Non-steaming Days/Year <span className="req">*</span></label>
                    <input
                      type="number"
                      name="nonSteamingDays"
                      value={formData.nonSteamingDays}
                      onChange={handleFormChange}
                      placeholder="158"
                      className="form-input"
                    />
                    <div className="form-hint">At port / idle</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">% EU Voyages <span className="req">*</span></label>
                    <input
                      type="number"
                      name="euPct"
                      value={formData.euPct}
                      onChange={handleFormChange}
                      placeholder="10"
                      className="form-input"
                    />
                    <div className="form-hint">For ETS / EUA calculation</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost of 1 EUA (USD) <span className="req">*</span></label>
                    <input
                      type="number"
                      name="euaCost"
                      value={formData.euaCost}
                      onChange={handleFormChange}
                      placeholder="70"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
              </div>

              {/* Fuel Particulars */}
              <div className="onboard-card">
              <div className="form-section">
  <div className="form-section-title">
    ⛽ Fuel Particulars
  </div>

  {machines.map((machine, machineIndex) => (

    <div className="fuel-machine-card" key={machineIndex}>

      <div className="fuel-machine-header">

        {machineIndex < 2 ? (

          <h4>{machine.machineName}</h4>

        ) : (

          <input
            className="fuel-machine-name-input"
            value={machine.machineName}
            placeholder="Machine name (e.g. Boiler)"
            onChange={(e) =>
              updateMachineName(machineIndex, e.target.value)
            }
          />

        )}

        <div>

          <button
            type="button"
            className="btn-add-fuel"
            onClick={() => addFuel(machineIndex)}
          >
            + Add fuel
          </button>

          {machineIndex >= 2 && (
            <button
              type="button"
              className="btn-remove-machine"
              onClick={() => removeMachine(machineIndex)}
            >
              🗑
            </button>
          )}

        </div>

      </div>

      <div className="fuel-col-labels">
        <span>Fuel name</span>
        <span>Consumption (MT)</span>
        <span>Price (USD/MT)</span>
        <span></span>
      </div>

      {machine.fuels.map((fuel, fuelIndex) => (

        <div
          className="fuel-row"
          key={fuelIndex}
        >

      <Select
                      value={fuel.fuel_name}
                      placeholder="Select fuel"
                      
                      listHeight={280}
                      virtual={false}
                      getPopupContainer={() => document.body}
                      onChange={(value) => updateFuel(fuel.id, 'fuel_name', value)}
                    >
                      <Option value="HFO">HFO</Option>
                      <Option value="VLSFO">VLSFO</Option>
                      <Option value="ULSFO">ULSFO</Option>
                      <Option value="LFO">LFO</Option>
                      <Option value="MDO">MDO</Option>
                      <Option value="LPG-AVERAGE">LPG-AVERAGE</Option>
                      <Option value="LNG-BOILER">LNG-BOILER</Option>
                      <Option value="LNG-OTHERS">LNG-OTHERS</Option>
                      <Option value="LNG-AE">LNG-AE</Option>
                      <Option value="LNG-ME">LNG-ME</Option>
                      <Option value="LPG-BUTANE">LPG-BUTANE</Option>
                      <Option value="LPG-PROPANE">LPG-PROPANE</Option>
                      <Option value="METHANOL">METHANOL</Option>
                      <Option value="ETHANOL">ETHANOL</Option>
                    </Select>

          <input
            placeholder="0.0"
            value={fuel.consumption}
            onChange={(e) =>
              updateFuel(
                machineIndex,
                fuelIndex,
                "consumption",
                e.target.value
              )
            }
          />

          <input
            placeholder="0"
            value={fuel.price}
            onChange={(e) =>
              updateFuel(
                machineIndex,
                fuelIndex,
                "price",
                e.target.value
              )
            }
          />

          <button
            type="button"
            className="fuel-row-delete"
            onClick={() =>
              removeFuel(machineIndex, fuelIndex)
            }
          >
            🗑
          </button>

        </div>

      ))}

    </div>

  ))}

  <button
    type="button"
    className="btn-add-machine"
    onClick={addMachine}
  >
    + Add machine
  </button>

</div>
              </div>

              {/* FEUM Penalty */}
              <div className="onboard-card">
              <div className="form-section">
                <div className="form-section-title">⚠️ FEUM Penalty</div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">FEUM Penalty (USD/yr) <span className="req">*</span></label>
                    <input
                      type="number"
                      name="feumPenalty"
                      value={formData.feumPenalty}
                      onChange={handleFormChange}
                      placeholder="83828"
                      className="form-input"
                    />
                    <div className="form-hint">From FEUM Calculations sheet</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current CII Rating</label>
                    <select
                      name="ciiRating"
                      value={formData.ciiRating}
                      onChange={handleFormChange}
                      className="form-input"
                    >
                      <option>A</option>
                      <option>B</option>
                      <option>C</option>
                      <option>D</option>
                      <option>E</option>
                    </select>
                  </div>
                </div>
              </div>
              </div>

              <div className="onboard-card">

  <div className="onboard-title">
    🍃 ESD Measures
    <span className="selected-badge">
      {selectedEsds.length} Selected
    </span>
  </div>

  <div className="esd-col-labels">
    <span>Measure</span>
    <span>Efficiency gain (%)</span>
    <span>Cost (USD)</span>
  </div>

{Object.entries(groupedEsds).map(([category, measures]) => (

  <div key={category} style={{ marginBottom: 20 }}>

    <Select
      style={{ width: "100%" }}
      placeholder={category}
      onSelect={(value) => toggleEsd(value)}
    >
      {measures.map((item) => (
        <Option
          key={item.id}
          value={item.id}
          disabled={selectedEsds.includes(item.id)}
        >
          {item.name}
        </Option>
      ))}
    </Select>

    {measures
      .filter(item => selectedEsds.includes(item.id))
      .map(item => (

        <div
          key={item.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            padding: "12px",
            border: "1px solid #D9E7FF",
            borderRadius: 8,
            background: "#EAF3FF"
          }}
        >

          <span style={{ flex: 1 }}>
            {item.name}
          </span>

          <input
            value={item.saving}
            disabled
            style={{
              width: 90,
              marginRight: 10
            }}
          />

          <input
            value={item.capex}
            disabled
            style={{
              width: 120
            }}
          />

        </div>

      ))}

  </div>

))}
</div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={saveVessel}>
                  ✓ Save Vessel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tracker;
