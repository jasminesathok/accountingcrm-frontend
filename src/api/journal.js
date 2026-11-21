import api from './axios';

export const getJournalEntries = (params) => api.get('/journal', { params });
export const getJournalEntry = (id) => api.get(`/journal/${id}`);
export const createJournalEntry = (data) => api.post('/journal', data);
export const updateJournalEntry = (id, data) => api.put(`/journal/${id}`, data);
export const deleteJournalEntry = (id) => api.delete(`/journal/${id}`);
