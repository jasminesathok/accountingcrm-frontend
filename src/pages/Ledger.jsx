import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAccounts } from '../api/accounts';
import { getLedger, exportLedgerPdf, emailLedgerStatement } from '../api/ledger';
import Navbar from '../components/Navbar';
import { downloadLedgerCsv } from '../utils/ledgerExport';

const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(n || 0));

const EMPTY_STATEMENT = {
  statementId: null,
  ledger: { ledgerId: null, ledgerName: '', ledgerCode: null, accountType: '' },
  financialYear: null,
  fromDate: null,
  toDate: null,
  currency: 'INR',
  openingBalance: 0,
  openingDate: null,
  openingBalanceType: 'Debit',
  transactions: [],
  totalDebit: 0,
  totalCredit: 0,
  closingBalance: 0,
  closingBalanceType: 'Debit',
  generatedBy: null,
  generatedDate: null,
  lastUpdated: null
};

const Ledger = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');

  // Basic Information / Report Filters
  const [financialYear, setFinancialYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('');
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [voucherType, setVoucherType] = useState('');

  const [statement, setStatement] = useState(EMPTY_STATEMENT);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await getAccounts();
      setAccounts(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accounts');
    } finally {
      setPageLoading(false);
    }
  }, []);

  const fetchLedger = useCallback(async (id, filters = {}) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getLedger(id, filters);
      setStatement(res.data);
      setAppliedFilters(filters);
      setHasLoaded(true);
    } catch (err) {
      setStatement(EMPTY_STATEMENT);
      setHasLoaded(false);
      setError(err.response?.data?.message || 'Failed to load ledger statement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accountId) {
      setSelectedAccountId(String(accountId));
      fetchLedger(accountId);
    }
  }, [accountId, fetchLedger]);

  const buildFilters = () => ({
    ...(financialYear ? { financialYear } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(currency ? { currency } : {}),
    ...(branch ? { branch } : {}),
    ...(department ? { department } : {}),
    ...(voucherType ? { voucherType } : {})
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setError('Please select a ledger');
      return;
    }
    navigate(`/ledger/${selectedAccountId}`);
    await fetchLedger(selectedAccountId, buildFilters());
  };

  const handleDownloadCsv = () => {
    downloadLedgerCsv(statement);
  };

  const handleDownloadPdf = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await exportLedgerPdf(selectedAccountId, appliedFilters);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledger-statement-${statement.ledger?.ledgerCode || selectedAccountId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const sendEmailStatement = async () => {
    if (!emailTo.trim()) {
      setEmailStatus('Enter a recipient email address');
      return;
    }
    setEmailing(true);
    setEmailStatus('');
    try {
      await emailLedgerStatement(selectedAccountId, emailTo.trim(), appliedFilters);
      setEmailStatus('Statement emailed successfully');
    } catch (err) {
      setEmailStatus(err.response?.data?.message || 'Failed to email statement');
    } finally {
      setEmailing(false);
    }
  };

  const hasData = hasLoaded && statement.ledger?.ledgerId;

  return (
    <div className="page">
      <Navbar title="Ledger Statement" />
      <div className="page-content">
        <div className="section-card">
          <form onSubmit={handleSubmit} className="modal-form" style={{ gap: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Ledger</label>
                <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} required>
                  <option value="">Select ledger...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Financial Year</label>
                <input placeholder="2025-26" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="">Default</option>
                  <option value="INR">INR</option><option value="USD">USD</option>
                  <option value="EUR">EUR</option><option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>From Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>To Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Voucher Type</label>
                <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)}>
                  <option value="">All</option>
                  <option value="journal">Journal</option>
                  <option value="payment">Payment</option>
                  <option value="receipt">Receipt</option>
                  <option value="sales">Sales</option>
                  <option value="purchase">Purchase</option>
                  <option value="contra">Contra</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Branch</label>
                <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={loading || pageLoading}>
                {loading ? 'Loading...' : 'View Statement'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleDownloadPdf} disabled={!hasData || exporting}>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleDownloadCsv} disabled={!hasData}>
                Export Excel
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()} disabled={!hasData}>
                Print Statement
              </button>
            </div>
          </form>

          {hasData && (
            <div className="form-row" style={{ marginTop: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label>Email Statement To</label>
                <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="form-group">
                <button type="button" className="btn btn-ghost" onClick={sendEmailStatement} disabled={emailing}>
                  {emailing ? 'Sending...' : 'Email Statement'}
                </button>
              </div>
              {emailStatus && <span style={{ alignSelf: 'center' }}>{emailStatus}</span>}
            </div>
          )}
        </div>

        {error && (
          <div className="section-card"><div className="alert alert-error">{error}</div></div>
        )}

        {hasData && (
          <>
            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">{statement.ledger.ledgerName}</h3>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.35rem' }}>
                {statement.statementId && <span>Statement ID: {statement.statementId}  |  </span>}
                {statement.ledger.ledgerCode && <span>Ledger Code: {statement.ledger.ledgerCode}  |  </span>}
                <span>Account Type: {statement.ledger.accountType}  |  </span>
                {statement.financialYear && <span>FY: {statement.financialYear}  |  </span>}
                <span>Currency: {statement.currency}</span>
              </div>
            </div>

            <div className="cards-grid" style={{ marginBottom: '1rem' }}>
              <div className="section-card">
                <h3 className="section-title">Opening Balance</h3>
                <div className="stat-value">{fmt(statement.openingBalance)} <small>{statement.openingBalanceType}</small></div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                  as of {statement.openingDate ? new Date(statement.openingDate).toLocaleDateString() : '-'}
                </div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Debit</h3>
                <div className="stat-value text-blue">{fmt(statement.totalDebit)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Credit</h3>
                <div className="stat-value text-green">{fmt(statement.totalCredit)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Closing Balance</h3>
                <div className="stat-value">{fmt(statement.closingBalance)} <small>{statement.closingBalanceType}</small></div>
              </div>
            </div>

            {loading ? (
              <div className="section-card">Loading statement...</div>
            ) : (
              <div className="section-card">
                <h3 className="section-title">Transaction Details</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Voucher #</th>
                        <th>Voucher Type</th>
                        <th>Reference #</th>
                        <th>Description</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.transactions.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center' }}>No ledger transactions found</td>
                        </tr>
                      ) : (
                        statement.transactions.map((row, index) => (
                          <tr key={`${row.date}-${index}`}>
                            <td>{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                            <td>{row.voucherNumber || '-'}</td>
                            <td>{row.voucherType || '-'}</td>
                            <td>{row.referenceNumber || '-'}</td>
                            <td>{row.description || '-'}</td>
                            <td>{fmt(row.debit)}</td>
                            <td>{fmt(row.credit)}</td>
                            <td><strong>{fmt(row.balance)}</strong></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="section-card" style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
              {statement.generatedBy && <span>Generated By: {statement.generatedBy}  |  </span>}
              {statement.generatedDate && <span>Generated Date: {new Date(statement.generatedDate).toLocaleString()}  |  </span>}
              {statement.lastUpdated && <span>Last Updated: {new Date(statement.lastUpdated).toLocaleString()}</span>}
            </div>
          </>
        )}

        {!hasData && !pageLoading && !error && (
          <div className="section-card">Select a ledger to view its statement.</div>
        )}
      </div>
    </div>
  );
};

export default Ledger;
