import axios from 'axios';
import { hostname } from '../config/apiConfig';
 
const api = axios.create({
  baseURL: hostname,
  withCredentials: true,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});
 
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('Authorization');
    if (token) {
      // Try Bearer first (SimpleJWT default), backend may also accept JWT
      const authValue = token.startsWith('Bearer ') || token.startsWith('JWT ')
        ? token
        : `Bearer ${token}`;
      config.headers.Authorization = authValue;
    }
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  (error) => Promise.reject(error)
);
 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    if (
      error.response?.data?.detail === 'Given token not valid for any token type' ||
      error.response?.data?.code === 'token_not_valid' ||
      error.response?.status === 401
    ) {
      console.warn('Token invalid/expired — clearing auth');
      localStorage.removeItem('Authorization');
      localStorage.removeItem('userEmail');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
 
const makeRequest = async (method, url, data = null) => {
  try {
    const response = await api({ method, url, data });
    return response.data;
  } catch (error) {
    console.error(`API Error [${method} ${url}]:`, error.response?.data || error.message);
    throw error;
  }
};
 
// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: async (email, password, firstName, lastName, role = 'user') => {
    try {
      const response = await api.post('/users/signup/', { email, password, first_name: firstName, last_name: lastName, role });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
 
  verifyOtp: async (email, otp) => {
    try {
      const response = await api.post('/users/signup/verify/', { email, otp });
      if (response.data.access) localStorage.setItem('Authorization', response.data.access);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
 
  login: async (email, password) => {
  try {
    const response = await api.post('/users/login/', { email, password });
    const raw = response.data;
    // Backend wraps the real payload as { status, data: { user, access, refresh } }
    // Unwrap it so callers always get { user, access, refresh } directly.
    const d = raw?.data && (raw.data.user || raw.data.access) ? raw.data : raw;
    const token = d?.access || d?.token;
    console.log('Login response:', { hasToken: !!token, hasUser: !!d?.user, role: d?.user?.role });
    if (token) {
      localStorage.setItem('Authorization', token);
    } else {
      console.warn('No token found in login response:', d);
    }
    return { success: true, data: d };
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.response?.data?.detail || 'Login failed' };
  }
},
 
  logout: async () => {
    localStorage.removeItem('Authorization');
    return { success: true };
  },
};
 
// ── VESSELS ───────────────────────────────────────────────────────────────────
export const vesselAPI = {
  getAll: async () => {
    try {
      console.log('[getAll] GET /home/list-vessels/');
      const data = await makeRequest('GET', '/home/list-vessels/');
      console.log(data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
 
  getSimulationMeta: async (vesselId) => {
    try {
      const data = await makeRequest('GET', `/simulation/vessel-meta/?vessel_id=${vesselId}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
};
 
// ── ONBOARDING ────────────────────────────────────────────────────────────────
export const onboardingAPI = {
  onboardVessel: async (payload) => {
    try {
      const data = await makeRequest('POST', '/home/onboard-vessel/', payload);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
};
 
// ── SIMULATION ────────────────────────────────────────────────────────────────
// Installation mapping for ESD categories (lead_time and installation_req defaults)
const ESD_INSTALL_DEFAULTS = {
  hull:       { lead_time_months: 8, installation_req: 'docking' },
  propulsion: { lead_time_months: 7, installation_req: 'docking' },
  engine:     { lead_time_months: 5, installation_req: 'in_sailing' },
  auxiliary:  { lead_time_months: 4, installation_req: 'in_sailing' },
  operations: { lead_time_months: 4, installation_req: 'in_sailing' },
};
 
export const simulationAPI = {
  /**
   * Build and POST the simulate-vessel payload.
   * @param {object} simulationData  — from vessel-meta (vessel, voyage_meta, machines)
   * @param {Array}  selectedEsds    — array of ESD objects with { name, category, efficiency_gain_percent, cost_usd }
   * @param {number} vesselLifeYears — default 25
   * @param {number} discountRate    — default 0.10
   */
  simulate: async (simulationData, selectedEsds = [], vesselLifeYears = 25, discountRate = 0.10) => {
    try {
      const inputPayload = {
        vessel: {
          name_of_owner:          simulationData.vessel?.name_of_owner          || '',
          vessel_name:            simulationData.vessel?.vessel_name            || '',
          vessel_type:            simulationData.vessel?.vessel_type            || '',
          build_year:             simulationData.vessel?.build_year             || 2000,
          flag:                   simulationData.vessel?.flag                   || '',
          classification_society: simulationData.vessel?.classification_society || '',
          imo_number:             simulationData.vessel?.imo_number             || '',
          gross_tonnage:          simulationData.vessel?.gross_tonnage          || 0,
          dead_weight:            simulationData.vessel?.dead_weight            || 0,
        },
        voyage_meta: {
          analysis_month:              simulationData.voyage_meta?.analysis_month              || 10,
          analysis_year:               simulationData.voyage_meta?.analysis_year               || new Date().getFullYear(),
          docking_month:                simulationData.voyage_meta?.docking_month               || 4,
          docking_year:                 simulationData.voyage_meta?.docking_year                || new Date().getFullYear(),
          common_impl_month:            simulationData.voyage_meta?.common_impl_month           || 8,
          common_impl_year:             simulationData.voyage_meta?.common_impl_year            || new Date().getFullYear(),
          sailing_days_per_year:       simulationData.voyage_meta?.sailing_days_per_year       || 200,
          non_steaming_days_per_year:  simulationData.voyage_meta?.non_steaming_days_per_year  || 165,
          distance_nm:                 simulationData.voyage_meta?.distance_nm                 || 60000,
          eu_voyages_percent:          simulationData.voyage_meta?.eu_voyages_percent          || 30,
          eua_cost_usd:                simulationData.voyage_meta?.eua_cost_usd                || 75,
 
          f_i:    simulationData.voyage_meta?.f_i    || 1.0,
          f_m:    simulationData.voyage_meta?.f_m    || 1.0,
          f_c:    simulationData.voyage_meta?.f_c    || 1.0,
          f_ivse: simulationData.voyage_meta?.f_ivse || 1.0,
        },
        machines: (simulationData.machines || []).map(m => ({
          machine_name: m.machine_name,
          fuel_particulars: (m.fuel_particulars || []).map(fp => ({
            fuel_name:             fp.fuel_name,
            consumption_mt:        fp.consumption_mt,
            fuel_price_usd_per_mt: fp.fuel_price_usd_per_mt,
          })),
        })),
        esd_measures: selectedEsds.map(esd => {
          const cat = (esd.category || 'operations').toLowerCase();
          const defaults = ESD_INSTALL_DEFAULTS[cat] || ESD_INSTALL_DEFAULTS.operations;
          return {
            category:                cat,
            name:                    esd.name,
            efficiency_gain_percent: Number(esd.efficiency_gain_percent || esd.saving || 0),
            cost_usd:                Number(esd.cost_usd || esd.capex || 0),
            lead_time_months:        esd.lead_time_months || defaults.lead_time_months,
            installation_req:        esd.installation_req || defaults.installation_req,
          };
        }),
        vessel_life_years: vesselLifeYears,
        vessel_end_year:   simulationData.vessel_end_year   || (new Date().getFullYear() + vesselLifeYears),
        vessel_end_month:  simulationData.vessel_end_month  || 3,
        discount_rate:     discountRate,
        sailing_profile_scenarios: null,
      };
 
      // Wrap in the format backend expects: { vessel_id, input: {...} }
      const vesselId = simulationData.vessel?.id || simulationData.vesselId;
      const payload = vesselId
        ? { vessel_id: vesselId, input: inputPayload }
        : inputPayload;  // fallback: send flat (backend will use IMO lookup)
 
      console.log('[simulate] POST /simulation/simulate-vessel/', { vessel_id: vesselId, hasInput: !!inputPayload });
      const data = await makeRequest('POST', '/simulation/simulate-vessel/', payload);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || error.message,
      };
    }
  },
  updateSimulation: async (reportId, payload) => {
    try {
      const data = await makeRequest('POST', '/simulation/update-simulation/', { report_id: reportId, ...payload });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
 
  listReports: async (vesselId) => {
    try {
      const data = await makeRequest('GET', `/simulation/list-reports/?vessel_id=${vesselId}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message, data: [] };
    }
  },
 
  getReport: async (reportId) => {
    try {
      const data = await makeRequest('GET', `/simulation/report/?report_id=${reportId}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
 
  deleteReports: async (vesselId) => {
    try {
      const data = await makeRequest('POST', '/simulation/delete-reports/', { vessel_id: vesselId });
      return { success: true, data };
    } catch (error) {
      // If endpoint doesn't exist yet, silently succeed
      console.warn('delete-reports API not available:', error.message);
      return { success: true, data: null };
    }
  },
};
 
export { api, makeRequest };
 
 