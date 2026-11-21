import api from './axios';

export const getBalanceSheet = (params = {}) => api.get('/reports/balance-sheet', { params });

// Export PDF — downloads the report as a PDF file (auth header handled by
// the shared axios instance; a plain <a href> can't attach that header).
export const exportBalanceSheetPdf = (params = {}) =>
  api.get('/reports/balance-sheet/export', { params, responseType: 'blob' });

// Email Report — sends the same PDF to the given address.
export const emailBalanceSheet = (to, filters = {}) =>
  api.post('/reports/balance-sheet/email', { to, ...filters });
