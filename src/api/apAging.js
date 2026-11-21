import api from './axios';

export const getAPAging = (params = {}) => api.get('/reports/ap-aging', { params });

// Export PDF — downloads the report as a PDF file (auth header handled by
// the shared axios instance; a plain <a href> can't attach that header).
export const exportAPAgingPdf = (params = {}) =>
  api.get('/reports/ap-aging/export', { params, responseType: 'blob' });

// Email Report — sends the same PDF to the given address.
export const emailAPAging = (to, filters = {}) =>
  api.post('/reports/ap-aging/email', { to, ...filters });
