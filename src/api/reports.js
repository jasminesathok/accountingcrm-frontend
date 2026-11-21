import api from './axios';

export const getProfitLoss = (params = {}) => api.get('/reports/profit-loss', { params });

// Export PDF — downloads the report as a PDF file (auth header handled by
// the shared axios instance; a plain <a href> can't attach that header).
export const exportProfitLossPdf = (params = {}) =>
  api.get('/reports/profit-loss/export', { params, responseType: 'blob' });

// Email Report — sends the same PDF to the given address.
export const emailProfitLoss = (to, filters = {}) =>
  api.post('/reports/profit-loss/email', { to, ...filters });
