import { useCallback, useEffect, useState } from 'react';
import { getBalanceSheet, exportBalanceSheetPdf, emailBalanceSheet } from '../api/balanceSheet';
import Navbar from '../components/Navbar';

const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(n || 0));

const EMPTY_REPORT = {
  report: { reportId: null, reportName: 'Balance Sheet', financialYear: null, reportPeriod: null, asOnDate: null, currency: 'INR', reportStatus: 'Generated' },
  assets: { cashInHand: 0, bankBalance: 0, accountsReceivable: 0, inventory: 0, prepaidExpenses: 0, otherAssets: 0, fixedAssets: 0, investments: 0, totalCurrentAssets: 0, totalNonCurrentAssets: 0, totalAssets: 0 },
  liabilities: { accountsPayable: 0, shortTermLoans: 0, longTermLoans: 0, taxesPayable: 0, accruedExpenses: 0, otherLiabilities: 0, totalCurrentLiabilities: 0, totalNonCurrentLiabilities: 0, totalLiabilities: 0 },
  equity: { ownersCapital: 0, retainedEarnings: 0, currentYearProfitLoss: 0, drawings: 0, totalEquity: 0 },
  balanceSummary: { totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalLiabilitiesAndEquity: 0, balanceStatus: 'Balanced' },
  filters: {},
  exportOptions: {},
  generatedBy: null,
  generatedDate: null,
  approvedBy: null,
  approvedDate: null,
  lastUpdated: null
};

const BalanceSheet = () => {
  // Basic information filters
  const [financialYear, setFinancialYear] = useState('');
  const [reportPeriod, setReportPeriod] = useState('');
  const [asOnDate, setAsOnDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [reportStatus, setReportStatus] = useState('');
  // Report filters
  const [fromDate, setFromDate] = useState('');
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [project, setProject] = useState('');
  // System fields
  const [approvedBy, setApprovedBy] = useState('');
  const [approvedDate, setApprovedDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(EMPTY_REPORT);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  const loadReport = useCallback(async (filters = {}) => {
    setFetching(true);
    setError('');
    try {
      const res = await getBalanceSheet(filters);
      setData({ ...EMPTY_REPORT, ...res.data });
      setAppliedFilters(filters);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load balance sheet');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleSubmit = (e) => {
    e.preventDefault();
    loadReport({
      ...(financialYear ? { financialYear } : {}),
      ...(reportPeriod ? { reportPeriod } : {}),
      ...(asOnDate ? { asOnDate } : {}),
      ...(currency ? { currency } : {}),
      ...(reportStatus ? { reportStatus } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(branch ? { branch } : {}),
      ...(department ? { department } : {}),
      ...(project ? { project } : {}),
      ...(approvedBy ? { approvedBy } : {}),
      ...(approvedDate ? { approvedDate } : {})
    });
  };

  const isBalanced = data.balanceSummary.balanceStatus === 'Balanced';

  const exportCsv = () => {
    const { assets, liabilities, equity, balanceSummary } = data;
    const rows = [
      ['Section', 'Field', 'Amount'],
      ['Assets', 'Cash in Hand', assets.cashInHand],
      ['Assets', 'Bank Balance', assets.bankBalance],
      ['Assets', 'Accounts Receivable', assets.accountsReceivable],
      ['Assets', 'Inventory', assets.inventory],
      ['Assets', 'Prepaid Expenses', assets.prepaidExpenses],
      ['Assets', 'Other Assets', assets.otherAssets],
      ['Assets', 'Total Current Assets', assets.totalCurrentAssets],
      ['Assets', 'Fixed Assets', assets.fixedAssets],
      ['Assets', 'Investments', assets.investments],
      ['Assets', 'Total Non-Current Assets', assets.totalNonCurrentAssets],
      ['Assets', 'Total Assets', assets.totalAssets],
      ['Liabilities', 'Accounts Payable', liabilities.accountsPayable],
      ['Liabilities', 'Short-Term Loans', liabilities.shortTermLoans],
      ['Liabilities', 'Taxes Payable', liabilities.taxesPayable],
      ['Liabilities', 'Accrued Expenses', liabilities.accruedExpenses],
      ['Liabilities', 'Other Liabilities', liabilities.otherLiabilities],
      ['Liabilities', 'Total Current Liabilities', liabilities.totalCurrentLiabilities],
      ['Liabilities', 'Long-Term Loans', liabilities.longTermLoans],
      ['Liabilities', 'Total Non-Current Liabilities', liabilities.totalNonCurrentLiabilities],
      ['Liabilities', 'Total Liabilities', liabilities.totalLiabilities],
      ['Equity', "Owner's Capital", equity.ownersCapital],
      ['Equity', 'Retained Earnings', equity.retainedEarnings],
      ['Equity', 'Current Year Profit/Loss', equity.currentYearProfitLoss],
      ['Equity', 'Drawings', equity.drawings],
      ['Equity', 'Total Equity', equity.totalEquity],
      ['Summary', 'Total Liabilities & Equity', balanceSummary.totalLiabilitiesAndEquity],
      ['Summary', 'Balance Status', balanceSummary.balanceStatus]
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'balance-sheet.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await exportBalanceSheetPdf(appliedFilters);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'balance-sheet.pdf';
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
      await emailBalanceSheet(emailTo.trim(), appliedFilters);
      setEmailStatus('Report emailed successfully');
    } catch (err) {
      setEmailStatus(err.response?.data?.message || 'Failed to email report');
    } finally {
      setEmailing(false);
    }
  };

  const Row = ({ label, value, bold }) => (
    <tr>
      <td style={bold ? { fontWeight: 600 } : undefined}>{label}</td>
      <td style={bold ? { fontWeight: 600 } : undefined}>{fmt(value)}</td>
    </tr>
  );

  return (
    <div className="page">
      <Navbar title="Balance Sheet" />
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
              <div className="form-group"><label>As On Date</label><input type="date" value={asOnDate} onChange={(e) => setAsOnDate(e.target.value)} /></div>
              <div className="form-group"><label>From Date (optional window)</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                </select>
              </div>
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
              <div className="form-group"><label>Project</label><input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Approved By</label><input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Optional" /></div>
              <div className="form-group"><label>Approved Date</label><input type="date" value={approvedDate} onChange={(e) => setApprovedDate(e.target.value)} /></div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={fetching}>{fetching ? 'Generating...' : 'Generate Report'}</button>
              <button type="button" className="btn btn-ghost" onClick={exportPdf} disabled={exporting}>{exporting ? 'Exporting...' : 'Export PDF'}</button>
              <button type="button" className="btn btn-ghost" onClick={exportCsv}>Export Excel</button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Print Report</button>
            </div>
          </form>

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
        </div>

        {loading ? (
          <div className="section-card">Loading balance sheet...</div>
        ) : error ? (
          <div className="section-card"><div className="alert alert-error">{error}</div></div>
        ) : (
          <>
            <div className="cards-grid" style={{ marginBottom: '1rem' }}>
              <div className="section-card">
                <h3 className="section-title">Total Assets</h3>
                <div className="stat-value text-blue">{fmt(data.balanceSummary.totalAssets)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Liabilities</h3>
                <div className="stat-value text-red">{fmt(data.balanceSummary.totalLiabilities)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Equity</h3>
                <div className="stat-value text-green">{fmt(data.balanceSummary.totalEquity)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Liabilities &amp; Equity</h3>
                <div className="stat-value">{fmt(data.balanceSummary.totalLiabilitiesAndEquity)}</div>
              </div>
            </div>

            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Balance Summary</h3>
              {data.report.reportId && (
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Report ID: {data.report.reportId}</div>
              )}
              <span className={`status-badge ${isBalanced ? 'status-badge-success' : 'status-badge-danger'}`}>
                {data.balanceSummary.balanceStatus}
              </span>
              {data.report.reportStatus && (
                <span className="status-badge" style={{ marginLeft: '0.5rem' }}>{data.report.reportStatus}</span>
              )}
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                {data.report.asOnDate && <span>As On Date: {data.report.asOnDate}  |  </span>}
                {data.generatedBy && <span>Generated By: {data.generatedBy}  |  </span>}
                {data.generatedDate && <span>Generated Date: {new Date(data.generatedDate).toLocaleString()}  |  </span>}
                {data.approvedBy && <span>Approved By: {data.approvedBy}  |  </span>}
                {data.approvedDate && <span>Approved Date: {data.approvedDate}  |  </span>}
                {data.lastUpdated && <span>Last Updated: {new Date(data.lastUpdated).toLocaleString()}</span>}
              </div>
            </div>

            <div className="cards-grid" style={{ alignItems: 'start' }}>
              <div className="section-card">
                <h3 className="section-title">Assets</h3>
                <div className="table-scroll">
                  <table className="data-table">
                    <tbody>
                      <Row label="Cash in Hand" value={data.assets.cashInHand} />
                      <Row label="Bank Balance" value={data.assets.bankBalance} />
                      <Row label="Accounts Receivable" value={data.assets.accountsReceivable} />
                      <Row label="Inventory" value={data.assets.inventory} />
                      <Row label="Prepaid Expenses" value={data.assets.prepaidExpenses} />
                      <Row label="Other Assets" value={data.assets.otherAssets} />
                      <Row label="Total Current Assets" value={data.assets.totalCurrentAssets} bold />
                      <Row label="Fixed Assets" value={data.assets.fixedAssets} />
                      <Row label="Investments" value={data.assets.investments} />
                      <Row label="Total Non-Current Assets" value={data.assets.totalNonCurrentAssets} bold />
                      <Row label="Total Assets" value={data.assets.totalAssets} bold />
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="section-card">
                <h3 className="section-title">Liabilities</h3>
                <div className="table-scroll">
                  <table className="data-table">
                    <tbody>
                      <Row label="Accounts Payable" value={data.liabilities.accountsPayable} />
                      <Row label="Short-Term Loans" value={data.liabilities.shortTermLoans} />
                      <Row label="Taxes Payable" value={data.liabilities.taxesPayable} />
                      <Row label="Accrued Expenses" value={data.liabilities.accruedExpenses} />
                      <Row label="Other Liabilities" value={data.liabilities.otherLiabilities} />
                      <Row label="Total Current Liabilities" value={data.liabilities.totalCurrentLiabilities} bold />
                      <Row label="Long-Term Loans" value={data.liabilities.longTermLoans} />
                      <Row label="Total Non-Current Liabilities" value={data.liabilities.totalNonCurrentLiabilities} bold />
                      <Row label="Total Liabilities" value={data.liabilities.totalLiabilities} bold />
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="section-card">
                <h3 className="section-title">Equity</h3>
                <div className="table-scroll">
                  <table className="data-table">
                    <tbody>
                      <Row label="Owner's Capital" value={data.equity.ownersCapital} />
                      <Row label="Retained Earnings" value={data.equity.retainedEarnings} />
                      <Row label="Current Year Profit/Loss" value={data.equity.currentYearProfitLoss} />
                      <Row label="Drawings" value={data.equity.drawings} />
                      <Row label="Total Equity" value={data.equity.totalEquity} bold />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BalanceSheet;
