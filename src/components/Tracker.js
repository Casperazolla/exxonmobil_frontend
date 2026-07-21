import React, { useEffect, useState } from 'react';
import { Select, Input } from "antd";

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
import './Simulator.css';
import { onboardingAPI, vesselAPI, simulationAPI, makeRequest } from '../services/apiService';
import SimulationWorkspace from './SimulationWorkspace';


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
    sailingDays: meta.sailing_days_per_year ?? raw.sailing_days_per_year ?? '',
    nonSteamingDays: meta.non_steaming_days_per_year ?? raw.non_steaming_days_per_year ?? '',
    distanceNm: meta.distance_nm ?? '',
    euPct: meta.eu_voyages_percent ?? raw.eu_voyages_percent ?? '',
    euaCost: meta.eua_cost_usd ?? raw.eua_cost_usd ?? '',
    lastReport: raw.last_report ?? raw.lastReport ?? null,
    lastReportDate: raw.last_report_date ?? null,
    machines,
    selectedEsds: esdMeasures.map((e) => e.id).filter(Boolean),
  };
};




function Tracker({ userEmail, onLogout }) {
  const [activeTab, setActiveTab] = useState('vessels');
  const [vessels, setVessels] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [simulatingId, setSimulatingId] = useState(null);
  const [selectedEsds, setSelectedEsds] = useState([]);
  const [vesselsLoading, setVesselsLoading] = useState(true);
  const [vesselsError, setVesselsError] = useState(null);
  const [simulationData, setSimulationData] = useState(null);
  const [selectedSection, setSelectedSection] = useState("esd");
  const [selectedItem, setSelectedItem] = useState(null);

  const [openMenu, setOpenMenu] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);


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
    sailingDays: '200',
    nonSteamingDays: '165',
    distanceNm: '60000',
    euPct: '30',
    euaCost: '75',
    fI: '1.0',
    fM: '1.0',
    fC: '1.0',
    fIvse: '1.0',
    vesselLifeYears: '25',
    discountRate: '0.10',
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
        sailingDays: '200',
        nonSteamingDays: '165',
        distanceNm: '60000',
        euPct: '30',
        euaCost: '75',
        fI: '1.0',
        fM: '1.0',
        fC: '1.0',
        fIvse: '1.0',
        vesselLifeYears: '25',
        discountRate: '0.10',
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
    console.log('[loadVessels] Starting API call...');
    setVesselsLoading(true);
    setVesselsError(null);

    try {
      const result = await vesselAPI.getAll();
      console.log('[loadVessels] API result:', result);

      if (!result.success) {
        setVesselsError(result.error);
        return;
      }

      const raw = result.data?.data || result.data;
      const vesselList = Array.isArray(raw) ? raw
        : raw?.vessels || raw?.results || [];
      console.log('[loadVessels] Parsed', vesselList.length, 'vessels');

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


  const loadSimulationData = async (vesselId) => {
    try {

      const result = await vesselAPI.getSimulationMeta(vesselId);



      if (!result.success) {
        console.log(result.error);
        return;
      }

      const data = result.data.data;

      setSimulationData(data);

      // initialize selected ESDs
      setSelectedEsds(
        data.voyage_meta.esd_recommended.selected_measures.map((esd, index) => ({
          id: `api-${index}`,
          name: esd.name,
          category: esd.category,
          efficiency_gain_percent: esd.efficiency_gain_percent,
          cost_usd: esd.cost_usd,
        }))
      );

    } catch (err) {
      console.log(err);
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
        sailing_days_per_year: parseInt(formData.sailingDays, 10) || 200,
        non_steaming_days_per_year: parseInt(formData.nonSteamingDays, 10) || 165,
        distance_nm: parseFloat(formData.distanceNm) || 60000,
        eu_voyages_percent: parseFloat(formData.euPct) || 30,
        eua_cost_usd: parseFloat(formData.euaCost) || 75,
        f_i: parseFloat(formData.fI) || 1.0,
        f_m: parseFloat(formData.fM) || 1.0,
        f_c: parseFloat(formData.fC) || 1.0,
        f_ivse: parseFloat(formData.fIvse) || 1.0,
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
        category: (esd.category || 'operations').toLowerCase(),
        name: esd.name,
        efficiency_gain_percent: esd.saving || esd.efficiency_gain_percent || 0,
        cost_usd: esd.capex || esd.cost_usd || 0,
        lead_time_months: esd.lead_time_months || 4,
        installation_req: esd.installation_req || 'in_sailing',
      })),
      vessel_life_years: parseInt(formData.vesselLifeYears, 10) || 25,
      discount_rate: parseFloat(formData.discountRate) || 0.10,
    };


    try {

      // Step 1: Delete existing reports for this vessel (if re-onboarding)
      if (formData.imoNumber) {
        // Find existing vessel by IMO to get its ID
        const existingVessel = vessels.find(v => v.imoNumber === formData.imoNumber);
        if (existingVessel?.id) {
          await simulationAPI.deleteReports(existingVessel.id);
          console.log('Existing reports deleted for vessel:', existingVessel.id);
        }
      }

      // Step 2: Onboard the vessel
      const response = await onboardingAPI.onboardVessel(payload);

      if (!response.success) {
        alert(response.error || "Failed to onboard vessel");
        return;
      }

      // Get the vessel ID from the response
      const newVesselId = response.data?.data?.vessel_id || response.data?.vessel_id;

      // Auto-simulate to create the base report
      if (newVesselId) {
        try {
          const simResult = await simulationAPI.simulate(payload, payload.esd_measures || []);
          if (simResult.success) {
            console.log('Base report created:', simResult.data?.data?.report_id || simResult.data?.report_id);
          } else {
            console.warn('Auto-simulate failed (base report not created):', simResult.error);
          }
        } catch (simErr) {
          console.warn('Auto-simulate error:', simErr.message);
        }
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

  const deleteVessel = async (vesselId) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!window.confirm(`Delete "${vessel?.vesselName || 'this vessel'}" and all its reports?\n\nThis cannot be undone.`)) return;
    try {
      // 1. Delete all reports for this vessel
      await simulationAPI.deleteReports(vesselId);
      // 2. Delete the vessel itself
      const result = await makeRequest('POST', '/home/delete-vessel/', { vessel_id: vesselId });
      console.log('[deleteVessel] Result:', result);
      // 3. Refresh vessel list from API
      await loadVessels();
    } catch (err) {
      console.error('[deleteVessel] Error:', err);
      alert('Failed to delete vessel: ' + (err.response?.data?.message || err.message));
    }
  };

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState('base');
  const [vesselReports, setVesselReports] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  const openSimulator = async (vesselId) => {
    setSimulatingId(vesselId);
    setSessionMode('base');
    setSessionLoading(true);
    setSessionModalOpen(true);

    // Fetch reports for this vessel to show base/latest options
    try {
      const reportsResult = await simulationAPI.listReports(vesselId);
      if (reportsResult.success) {
        const reports = reportsResult.data?.data || reportsResult.data || [];
        setVesselReports(Array.isArray(reports) ? reports : []);
      } else {
        setVesselReports([]);
      }
    } catch (err) {
      console.warn('Could not fetch reports:', err.message);
      setVesselReports([]);
    }
    setSessionLoading(false);
  };

  const [initialReport, setInitialReport] = useState(null);

  const confirmSession = async () => {
    setSessionModalOpen(false);
    setSessionLoading(true);

    let reportToLoad = null;

    if (vesselReports.length > 0) {
      if (sessionMode === 'base') {
        // Base mode: use the FIRST report's input (the original base report)
        reportToLoad = vesselReports[0];
      } else {
        // Latest mode: use the LAST report's input
        reportToLoad = vesselReports[vesselReports.length - 1];
      }

      // If we have a report_id, fetch full report data
      if (reportToLoad?.report_id) {
        try {
          const fullReport = await simulationAPI.getReport(reportToLoad.report_id);
          if (fullReport.success) {
            reportToLoad = fullReport.data?.data || fullReport.data;
          }
        } catch (err) {
          console.warn('Could not fetch full report:', err.message);
        }
      }
    }

    setInitialReport(reportToLoad);
    setSessionLoading(false);
    setActiveTab("simulator");
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

  const toggleEsd = (id) => {

    const exists = selectedEsds.find(esd => esd.id === id);

    if (exists) {
      setSelectedEsds(prev =>
        prev.filter(esd => esd.id !== id)
      );
      return;
    }

    const selected = ESD_LIBRARY.find(esd => esd.id === id);

    setSelectedEsds(prev => [
      ...prev,
      {
        ...selected,
        efficiency_gain_percent: selected.saving,
        cost_usd: selected.capex,
      }
    ]);

  };

  const removeSelectedEsd = (esdId) => {
    setSelectedEsds(prev => prev.filter(id => id !== esdId));
  };

  const getSimulatingVessel = () => vessels.find(v => v.id === simulatingId);

  const selectedEsdObjects = selectedEsds.map(id =>
    ESD_LIBRARY.find(e => e.id === id)
  ).filter(Boolean);

  // Financial calculations
  const totalCapex =
    selectedEsds.reduce(
      (sum, esd) => sum + Number(esd.cost_usd || 0),
      0
    );
  const totalSaving =
    selectedEsds.reduce(
      (sum, esd) => sum + Number(esd.efficiency_gain_percent || 0),
      0
    ); const vessel = getSimulatingVessel();
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

  console.log(vessels);
  return (
    <div className="tracker-wrapper">
      {/* Navigation */}
      <nav className="nav">
        <a href="#" className="nav-brand">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="5" fill="#1D9E75" />
            <path d="M4 13 Q11 8 18 13" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <path d="M4 13 L6 17 L16 17 L18 13" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,.15)" stroke-linejoin="round" />
            <ellipse cx="6" cy="15.5" rx="1.5" ry="1.5" fill="white" opacity=".6" />
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
            onClick={() => { if(simulatingId) setActiveTab('simulator'); }}
            style={activeTab==='simulator'?{background:'#1D9E75',color:'#fff',borderRadius:6,fontWeight:600}:{}}
          >
            {getSimulatingVessel()?.vesselName || 'ESD Simulator'}
          </button>
        </div>
        <div className="nav-right">
          <span className="user-email">{userEmail}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* ===== SIMULATOR — rendered outside container for full width ===== */}
      {activeTab === 'simulator' && (
        <SimulationWorkspace
          vesselId={simulatingId}
          vesselName={getSimulatingVessel()?.vesselName}
          sessionMode={sessionMode}
          initialReport={initialReport}
          vesselReports={vesselReports}
          onBack={() => setActiveTab('vessels')}
        />
      )}

      {/* Main Content (vessels page only) */}
      {activeTab !== 'simulator' && (
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
                        <th>GT</th>
                        <th>Build Year</th>
                        <th>Sailing Days</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vessels.map((vessel) => {
                        const ageYrs = new Date().getFullYear() - vessel.buildYear;
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
                            <td>{formatNumber(vessel.grossTonnage)} t</td>
                            <td>{vessel.buildYear} <span style={{fontSize:10,color:'#9CA3AF'}}>({ageYrs}yr)</span></td>
                            <td>{vessel.sailingDays || '—'} days</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {/* <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openOnboardModal(vessel.id)}
                                >
                                  ✏️ Edit
                                </button> */}
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={async () => {
                                    await loadSimulationData(vessel.id);
                                    openSimulator(vessel.id);
                                  }}
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

      </div>
      )} {/* end container for non-simulator pages */}

      {/* ===== MODAL: Start Session ===== */}
      {sessionModalOpen && (
        <div className="modal-overlay" onClick={()=>setSessionModalOpen(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:'min(480px, 90vw)',width:'100%',maxHeight:'90vh', minHeight:'55vh',overflowY:'auto',margin:'5vh auto'}}>
            <div style={{padding:'clamp(14px, 3vw, 20px) clamp(16px, 3vw, 24px)'}}>
              <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>Start Simulation Session</div>
              <div style={{fontSize:11,color:'var(--ink3)',marginBottom:14}}>
                {getSimulatingVessel()?.vesselName || '—'} · IMO {getSimulatingVessel()?.imoNumber || '—'}
              </div>

              <div
                onClick={()=>setSessionMode('base')}
                style={{border:sessionMode==='base'?'2px solid #1D9E75':'1px solid var(--bd)',borderRadius:6,padding:'10px 12px',marginBottom:8,cursor:'pointer',background:sessionMode==='base'?'#FEFCE8':'#fff'}}
              >
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:16}}>📋</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:12}}>Start from base report</div>
                    <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>Use original onboarding data. A <b>new report ID</b> is issued on first run.</div>
                  </div>
                </div>
              </div>

              <div
                onClick={()=>setSessionMode('last')}
                style={{border:sessionMode==='last'?'2px solid #1D9E75':'1px solid var(--bd)',borderRadius:6,padding:'10px 12px',marginBottom:12,cursor:'pointer',background:sessionMode==='last'?'#FEFCE8':'#fff',opacity:vesselReports.length>0?1:0.5,pointerEvents:vesselReports.length>0?'auto':'none'}}
              >
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:16}}>🔄</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:12}}>Continue from last simulation</div>
                    <div style={{fontSize:10,color:'var(--ink3)',marginTop:1}}>
                      {vesselReports.length > 0 ? (
                        <>Last report: <b style={{color:'#1D9E75',fontFamily:'monospace'}}>{vesselReports[vesselReports.length-1]?.report_id || '—'}</b>. All edits update this same ID.</>
                      ) : (
                        <>No previous reports found. Onboard the vessel first.</>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{background:'#FEF3C7',border:'1px solid #FDE68A',borderRadius:5,padding:'6px 10px',fontSize:9,color:'#92400E',marginBottom:8}}>
                <b>Session lock:</b> All edits update the <b>same report ID</b>. A new ID only generates when starting from base.
              </div>
              <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:5,padding:'6px 10px',fontSize:9,color:'#1E40AF'}}>
                <b>Editable:</b> Sailing days · Non-sailing days · EUA cost · Fuel consumption &amp; prices · ESD selection
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
                <button className="btn btn-secondary" onClick={()=>setSessionModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmSession} disabled={sessionLoading}>
                  {sessionLoading ? '⏳ Loading…' : '▶ Start Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        placeholder="200"
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
                        placeholder="165"
                        className="form-input"
                      />
                      <div className="form-hint">At port / idle</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Distance (NM/Year) <span className="req">*</span></label>
                      <input
                        type="number"
                        name="distanceNm"
                        value={formData.distanceNm}
                        onChange={handleFormChange}
                        placeholder="60000"
                        className="form-input"
                      />
                      <div className="form-hint">Annual voyage distance for CII</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">% EU Voyages <span className="req">*</span></label>
                      <input
                        type="number"
                        name="euPct"
                        value={formData.euPct}
                        onChange={handleFormChange}
                        placeholder="30"
                        className="form-input"
                      />
                      <div className="form-hint">For ETS / EUA calculation</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">EUA Cost (USD/t) <span className="req">*</span></label>
                      <input
                        type="number"
                        name="euaCost"
                        value={formData.euaCost}
                        onChange={handleFormChange}
                        placeholder="75"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vessel Life (Years)</label>
                      <input
                        type="number"
                        name="vesselLifeYears"
                        value={formData.vesselLifeYears}
                        onChange={handleFormChange}
                        placeholder="25"
                        className="form-input"
                        min="5" max="40"
                      />
                      <div className="form-hint">For payback / NPV calc</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Discount Rate</label>
                      <input
                        type="number"
                        name="discountRate"
                        value={formData.discountRate}
                        onChange={handleFormChange}
                        placeholder="0.10"
                        className="form-input"
                        step="0.01" min="0" max="1"
                      />
                      <div className="form-hint">For NPV (e.g. 0.10 = 10%)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CII Correction Factors */}
              <div className="onboard-card">
                <div className="form-section">
                  <div className="form-section-title">📐 CII Correction Factors <span style={{fontSize:10,fontWeight:400,color:'#9CA3AF'}}>(leave at 1.0 for standard vessels)</span></div>
                  <div className="form-grid form-grid-4">
                    <div className="form-group">
                      <label className="form-label">f_i (Capacity)</label>
                      <input type="number" name="fI" value={formData.fI} onChange={handleFormChange} placeholder="1.0" className="form-input" step="0.01" />
                      <div className="form-hint">Capacity correction</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">f_m (Ice Class)</label>
                      <input type="number" name="fM" value={formData.fM} onChange={handleFormChange} placeholder="1.0" className="form-input" step="0.01" />
                      <div className="form-hint">Ice-class correction</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">f_c (Shuttle)</label>
                      <input type="number" name="fC" value={formData.fC} onChange={handleFormChange} placeholder="1.0" className="form-input" step="0.01" />
                      <div className="form-hint">Shuttle tanker correction</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">f_ivse (EEDI/VSE)</label>
                      <input type="number" name="fIvse" value={formData.fIvse} onChange={handleFormChange} placeholder="1.0" className="form-input" step="0.01" />
                      <div className="form-hint">Voluntary structural enhancement</div>
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
                    <details
                      style={{
                        border: "1px solid #D9D9D9",
                        borderRadius: 8,
                        padding: "10px 14px",
                        background: "#fff"
                      }}
                    >

                      <summary
                        style={{
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 15
                        }}
                      >
                        {category}
                      </summary>

                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10
                        }}
                      >

                        {measures.map(item => (

                          <label
                            key={item.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              cursor: "pointer"
                            }}
                          >

                            <input
                              type="checkbox"
                              checked={selectedEsds.some(esd => esd.id === item.id)} onChange={() => toggleEsd(item.id)}
                            />

                            {item.name}

                          </label>

                        ))}

                      </div>

                    </details>

                    {measures
                      .filter(item =>
                        selectedEsds.some(esd => esd.id === item.id)
                      ).map(item => (

                        <div
                          key={item.id}
                          className="selected-esd-card"
                        >

                          <div className="selected-esd-header">

                            <div className="selected-esd-title">
                              {item.name}
                            </div>

                            <button
                              className="selected-esd-remove"
                              onClick={() => toggleEsd(item.id)}
                            >
                              ✕
                            </button>

                          </div>

                          <div className="selected-esd-fields">

                            <div className="selected-esd-field">

                              <label>Efficiency Gain (%)</label>

                              <input
                                value={
                                  selectedEsds.find(esd => esd.id === item.id)
                                    ?.efficiency_gain_percent || ""
                                }
                                onChange={(e) => {

                                  setSelectedEsds(prev =>
                                    prev.map(esd =>
                                      esd.id === item.id
                                        ? {
                                          ...esd,
                                          efficiency_gain_percent: e.target.value
                                        }
                                        : esd
                                    )
                                  );

                                }}
                              />

                            </div>

                            <div className="selected-esd-field">

                              <label>Cost (USD)</label>

                              <input
                                value={
                                  selectedEsds.find(esd => esd.id === item.id)
                                    ?.cost_usd || ""
                                }
                                onChange={(e) => {

                                  setSelectedEsds(prev =>
                                    prev.map(esd =>
                                      esd.id === item.id
                                        ? {
                                          ...esd,
                                          cost_usd: e.target.value
                                        }
                                        : esd
                                    )
                                  );

                                }}
                              />

                            </div>

                          </div>

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