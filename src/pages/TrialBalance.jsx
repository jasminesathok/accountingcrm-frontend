import { useCallback, useEffect, useState } from 'react';
import { getTrialBalance, exportTrialBalancePdf, emailTrialBalance } from '../api/trialBalance';
import { createAccount } from '../api/accounts';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { Plus } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(n || 0));

const EMPTY_REPORT = {
  report: { reportId: null, reportName: 'Trial Balance', financialYear: null, reportPeriod: null, fromDate: null, toDate: null, currency: 'INR', reportStatus: 'Generated' },
  accounts: [],
  summary: { totalDebit: 0, totalCredit: 0, difference: 0, balanceStatus: 'Balanced' },
  filters: {},
  exportOptions: {},
  generatedBy: null,
  generatedDate: null,
  lastUpdated: null
};

const TrialBalance = () => {
  // Basic information filters
  const [financialYear, setFinancialYear] = useState('');
  const [reportPeriod, setReportPeriod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [reportStatus, setReportStatus] = useState('');
  // Report filters
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [accountType, setAccountType] = useState('');
  const [ledger, setLedger] = useState('');

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(EMPTY_REPORT);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  // Quick "Add Entry" — a new ledger Account, since the accounts on this
  // report are what a Trial Balance actually lists.
  const [addModal, setAddModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'Asset', balance: '', branch: '', department: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const loadReport = useCallback(async (filters = {}) => {
    setFetching(true);
    setError('');
    try {
      const res = await getTrialBalance(filters);
      setData(res.data);
      setAppliedFilters(filters);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load trial balance');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const openAddAccount = () => {
    setAccountForm({ name: '', type: 'Asset', balance: '', branch: '', department: '' });
    setAddError('');
    setAddModal(true);
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError('');
    try {
      await createAccount(accountForm);
      setAddModal(false);
      loadReport(appliedFilters);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add account');
    } finally {
      setAddSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loadReport({
      ...(financialYear ? { financialYear } : {}),
      ...(reportPeriod ? { reportPeriod } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(currency ? { currency } : {}),
      ...(reportStatus ? { reportStatus } : {}),
      ...(branch ? { branch } : {}),
      ...(department ? { department } : {}),
      ...(accountType ? { accountType } : {}),
      ...(ledger ? { ledger } : {})
    });
  };

  const isBalanced = data.summary.balanceStatus === 'Balanced';

  const exportCsv = () => {
    const header = ['Account Code', 'Account Name', 'Account Type', 'Opening Debit', 'Opening Credit', 'Debit Amount', 'Credit Amount', 'Closing Debit', 'Closing Credit'];
    const rows = data.accounts.map(a => [
      a.accountCode, a.accountName, a.accountType,
      a.openingDebit, a.openingCredit, a.debitAmount, a.creditAmount, a.closingDebit, a.closingCredit
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trial-balance.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await exportTrialBalancePdf(appliedFilters);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'trial-balance.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const sendEmailReport = async () => {
    if (!emailTo.trim()) {
      setEmailStatus('Enter a recipient email address');
      return;
    }
    setEmailing(true);
    setEmailStatus('');
    try {
      await emailTrialBalance(emailTo.trim(), appliedFilters);
      setEmailStatus('Report emailed successfully');
    } catch (err) {
      setEmailStatus(err.response?.data?.message || 'Failed to email report');
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="page">
      <Navbar title="Trial Balance" />
      <div className="page-content">
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleSubmit} className="modal-form" style={{ gap: '1rem' }}>
            <div className="form-row">
              <div className="form-group"><label>Financial Year</label><input placeholder="2025-26" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} /></div>
              <div className="form-group"><label>Report Period</label>
                <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>From Date</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
              <div className="form-group"><label>To Date</label><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                </select>
              </div>
              <div className="form-group"><label>Account Type</label>
                <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                  <option value="">All</option>
                  <option value="Asset">Asset</option><option value="Liability">Liability</option>
                  <option value="Equity">Equity</option><option value="Income">Income</option><option value="Expense">Expense</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Report Status</label>
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}>
                  <option value="">Generated (default)</option>
                  <option value="Draft">Draft</option>
                  <option value="Generated">Generated</option>
                  <option value="Finalized">Finalized</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Branch</label><input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Optional" /></div>
              <div className="form-group"><label>Department</label><input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="form-group"><label>Ledger (Account)</label><input style={{ maxWidth: 240 }} value={ledger} onChange={(e) => setLedger(e.target.value)} placeholder="Account ID, optional" /></div>

            <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={fetching}>{fetching ? 'Generating...' : 'Generate Report'}</button>
              <button type="button" className="btn btn-primary" onClick={openAddAccount}><Plus size={16} /> Add Entry</button>
              <button type="button" className="btn btn-ghost" onClick={exportPdf} disabled={data.accounts.length === 0 || exporting}>{exporting ? 'Exporting...' : 'Export PDF'}</button>
              <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={data.accounts.length === 0}>Export Excel</button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()} disabled={data.accounts.length === 0}>Print Report</button>
            </div>
          </form>

          {data.accounts.length > 0 && (
            <div className="form-row" style={{ marginTop: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label>Email Report To</label>
                <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="form-group">
                <button type="button" className="btn btn-ghost" onClick={sendEmailReport} disabled={emailing}>{emailing ? 'Sending...' : 'Email Report'}</button>
              </div>
              {emailStatus && <span style={{ alignSelf: 'center' }}>{emailStatus}</span>}
            </div>
          )}
        </div>

        {loading ? (
          <div className="section-card">Loading trial balance...</div>
        ) : error ? (
          <div className="section-card"><div className="alert alert-error">{error}</div></div>
        ) : (
          <>
            <div className="cards-grid" style={{ marginBottom: '1rem' }}>
              <div className="section-card">
                <h3 className="section-title">Total Debit</h3>
                <div className="stat-value text-blue">{fmt(data.summary.totalDebit)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Credit</h3>
                <div className="stat-value text-green">{fmt(data.summary.totalCredit)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Difference</h3>
                <div className={`stat-value ${isBalanced ? 'text-green' : 'text-red'}`}>{fmt(data.summary.difference)}</div>
              </div>
            </div>

            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Balance Status</h3>
              {data.report.reportId && (
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Report ID: {data.report.reportId}</div>
              )}
              <span className={`status-badge ${isBalanced ? 'status-badge-success' : 'status-badge-danger'}`}>
                {data.summary.balanceStatus}
              </span>
              {data.report.reportStatus && (
                <span className="status-badge" style={{ marginLeft: '0.5rem' }}>{data.report.reportStatus}</span>
              )}
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                {data.generatedBy && <span>Generated By: {data.generatedBy}  |  </span>}
                {data.generatedDate && <span>Generated Date: {new Date(data.generatedDate).toLocaleString()}  |  </span>}
                {data.lastUpdated && <span>Last Updated: {new Date(data.lastUpdated).toLocaleString()}</span>}
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-title">Account Details</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account Code</th><th>Account Name</th><th>Account Type</th>
                      <th>Opening Debit</th><th>Opening Credit</th>
                      <th>Debit Amount</th><th>Credit Amount</th>
                      <th>Closing Debit</th><th>Closing Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.length === 0 ? (
                      <tr><td colSpan="9" className="empty-row">No accounts found for the selected filters</td></tr>
                    ) : data.accounts.map((row) => (
                      <tr key={row.accountCode}>
                        <td>{row.accountCode}</td>
                        <td>{row.accountName}</td>
                        <td>{row.accountType}</td>
                        <td>{fmt(row.openingDebit)}</td>
                        <td>{fmt(row.openingCredit)}</td>
                        <td>{fmt(row.debitAmount)}</td>
                        <td>{fmt(row.creditAmount)}</td>
                        <td>{fmt(row.closingDebit)}</td>
                        <td>{fmt(row.closingCredit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {data.accounts.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan="7"><b>Total</b></td>
                        <td><b>{fmt(data.summary.totalDebit)}</b></td>
                        <td><b>{fmt(data.summary.totalCredit)}</b></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Entry (New Account)">
        <form onSubmit={handleAddAccount} className="modal-form">
          {addError && <div className="alert alert-error">{addError}</div>}
          <div className="form-group"><label>Account Name</label>
            <input value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group"><label>Type</label>
              <select value={accountForm.type} onChange={e => setAccountForm({ ...accountForm, type: e.target.value })}>
                <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
              </select>
            </div>
            <div className="form-group"><label>Opening Balance (₹)</label>
              <input type="number" step="0.01" value={accountForm.balance} onChange={e => setAccountForm({ ...accountForm, balance: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Branch</label><input value={accountForm.branch} onChange={e => setAccountForm({ ...accountForm, branch: e.target.value })} placeholder="Optional" /></div>
            <div className="form-group"><label>Department</label><input value={accountForm.department} onChange={e => setAccountForm({ ...accountForm, department: e.target.value })} placeholder="Optional" /></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={addSaving}>{addSaving ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TrialBalance;
