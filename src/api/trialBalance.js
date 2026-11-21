import api from './axios';

export const getTrialBalance = (params = {}) => api.get('/reports/trial-balance', { params });

// Export PDF — downloads the report as a PDF file (auth header handled by
// the shared axios instance; a plain <a href> can't attach that header).
export const exportTrialBalancePdf = (params = {}) =>
  api.get('/reports/trial-balance/export', { params, responseType: 'blob' });

// Email Report — sends the same PDF to the given address.
export const emailTrialBalance = (to, filters = {}) =>
  api.post('/reports/trial-balance/email', { to, ...filters });
