import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api` });

// Attach Supabase token to every request
api.interceptors.request.use(async (cfg) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    cfg.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) supabase.auth.signOut();
    return Promise.reject(err);
  }
);

export const uploadCall = (formData) => api.post('/calls', formData);
export const getCalls = () => api.get('/calls');
export const getCall = (id) => api.get(`/calls/${id}`);
export const getDashboard = () => api.get('/dashboard');
export const submitFeedback = (data) => api.post('/feedback', data);
export const analyzeTranscript = (formData) => api.post('/analyze', formData);
export const reevaluateCall = (id) => api.post(`/calls/${id}/reevaluate`);
