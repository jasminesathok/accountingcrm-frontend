import api from './axios';

export const getLedger = (accountId, params = {}) => api.get(`/ledger/${accountId}`, { params });

// Export PDF — downloads the ledger statement as a PDF file (auth header
// handled by the shared axios instance; a plain <a href> can't attach it).
export const exportLedgerPdf = (accountId, params = {}) =>
  api.get(`/ledger/${accountId}/export`, { params, responseType: 'blob' });

// Email Statement — sends the same PDF to the given address.
export const emailLedgerStatement = (accountId, to, filters = {}) =>
  api.post(`/ledger/${accountId}/email`, { to, ...filters });
