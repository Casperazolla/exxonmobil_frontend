
import axios from 'axios';
import { hostname } from '../config/apiConfig';

const api = axios.create({
  baseURL: hostname,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('Authorization');
    
    if (token) {
      config.headers.Authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    
    return response;
  },
  (error) => {
    
    if (error.response?.data?.detail === 'Given token not valid for any token type') {
     
      console.warn('Token invalid, logging out...');
      localStorage.removeItem('Authorization');
     
      window.location.href = '/login';
      return Promise.reject(error);
    }

    
 if (error.response?.status === 401) {
  console.error(
    "401 ERROR",
    error.config?.url,
    error.response?.data
  );

  return Promise.reject(error);
}

   
    return Promise.reject(error);
  }
);


const makeRequest = async (method, url, data = null) => {
  try {
    const response = await api({
      method,
      url,
      data,
    });
    return response.data; 
  } catch (error) {
    console.error(`API Error [${method} ${url}]:`, error.response?.data || error.message);
    throw error;
  }
};

export const authAPI = {

  signup: async (email, password, firstName, lastName, role = 'user') => {
    try {
      const response = await api.post('/users/signup/', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.data,
      };
    }
  },


  verifyOtp: async (email, otp) => {
    try {
      const response = await api.post('/users/signup/verify/', {
        email,
        otp,
      });
      if (response.data.access) {
        localStorage.setItem('Authorization', response.data.access);
      }
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.data,
      };
    }
  },

  
login: async (email, password) => {
  try {
    const response = await api.post('/users/login/', {
      email,
      password,
    });

    

    const token =
      response.data?.access ||
      response.data?.data?.access;

    if (token) {
      localStorage.setItem("Authorization", token);
     
    }

    return {
      success: true,
      data: response.data,
    };

  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || "Login failed",
      status: error.response?.data,
    };
  }
},
  
  logout: async () => {
    try {
      localStorage.removeItem('Authorization');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export const userAPI = {

  getProfile: async () => {
    try {
      const data = await makeRequest('GET', '/user/profile/');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  
  updateProfile: async (profileData) => {
    try {
      const data = await makeRequest('PUT', '/user/profile/', profileData);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },
};

export const vesselAPI = {

  getAll: async () => {
    try {
      const data = await makeRequest('GET', '/home/list-vessels/');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  getSimulationMeta: async (vesselId) => {
  try {
    const data = await makeRequest(
      "GET",
      `/simulation/vessel-meta/?vessel_id=${vesselId}`
    );

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
},


  

  getById: async (id) => {
    try {
      const data = await makeRequest('GET', `/vessels/${id}/`);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },
};

export const onboardingAPI = {

  onboardVessel: async (payload) => {
    try {
      const data = await makeRequest(
        'POST',
        '/home/onboard-vessel/',
        payload
      );

      return {
        success: true,
        data,
      };

    } catch (error) {

      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message,
      };

    }
  },

};

export const uploadAPI = {

  uploadFile: async (file, endpoint = '/upload/') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      
      const response = await api.post(endpoint, formData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },
};





export { api, makeRequest };
