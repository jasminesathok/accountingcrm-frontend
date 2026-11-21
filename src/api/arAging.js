import api from './axios';

export const getARAging = (params = {}) => api.get('/reports/ar-aging', { params });

// Export PDF — downloads the report as a PDF file (auth header handled by
// the shared axios instance; a plain <a href> can't attach that header).
export const exportARAgingPdf = (params = {}) =>
  api.get('/reports/ar-aging/export', { params, responseType: 'blob' });

// Email Report — sends the same PDF to the given address.
export const emailARAging = (to, filters = {}) =>
  api.post('/reports/ar-aging/email', { to, ...filters });
