import { useCallback, useEffect, useState } from 'react';
import { getARAging, exportARAgingPdf, emailARAging } from '../api/arAging';
import { getClients } from '../api/clients';
import Navbar from '../components/Navbar';

const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(n || 0));

const BUCKETS = [
  { key: 'current', label: 'Current' },
  { key: '1-30', label: '1–30 Days' },
  { key: '31-60', label: '31–60 Days' },
  { key: '61-90', label: '61–90 Days' },
  { key: '91-120', label: '91–120 Days' },
  { key: 'above120', label: 'Above 120 Days' }
];

const EMPTY_REPORT = {
  report: { reportId: null, reportName: 'Accounts Receivable Aging', reportDate: null, asOnDate: null, currency: 'INR', reportStatus: 'Generated' },
  summary: { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '91-120': 0, above120: 0, totalOutstanding: 0, totalOverdue: 0, totalCustomers: 0, averageCollectionDays: null },
  details: [],
  filters: {},
  exportOptions: {},
  generatedBy: null,
  generatedDate: null,
  lastUpdated: null
};

const ARAging = () => {
  // Basic information / report filters
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState([]);
  const [salesRepresentative, setSalesRepresentative] = useState('');
  const [branch, setBranch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [asOnDate, setAsOnDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [reportStatus, setReportStatus] = useState('');

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
      const res = await getARAging(filters);
      setData({ ...EMPTY_REPORT, ...res.data });
      setAppliedFilters(filters);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load A/R aging report');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  useEffect(() => {
    getClients({ limit: 100 }).then(res => setClients(res.data.rows || [])).catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    loadReport({
      ...(clientId ? { client: clientId } : {}),
      ...(salesRepresentative ? { salesRepresentative } : {}),
      ...(branch ? { branch } : {}),
      ...(invoiceStatus ? { invoiceStatus } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(asOnDate ? { asOnDate } : {}),
      ...(currency ? { currency } : {}),
      ...(reportStatus ? { reportStatus } : {})
    });
  };

  const exportCsv = () => {
    const header = ['Client Code', 'Client Name', 'Contact Person', 'Mobile', 'Email', 'Invoice #', 'Invoice Date', 'Due Date', 'Invoice Amount', 'Amount Paid', 'Outstanding Amount', 'Days Overdue', 'Aging Bucket'];
    const rows = data.details.map(r => [
      r.clientCode, r.clientName, r.contactPerson, r.mobileNumber, r.emailAddress,
      r.invoiceNumber, r.invoiceDate, r.dueDate, r.invoiceAmount, r.amountPaid, r.outstandingAmount, r.daysOverdue, r.bucket
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ar-aging.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await exportARAgingPdf(appliedFilters);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ar-aging.pdf';
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
      await emailARAging(emailTo.trim(), appliedFilters);
      setEmailStatus('Report emailed successfully');
    } catch (err) {
      setEmailStatus(err.response?.data?.message || 'Failed to email report');
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="page">
      <Navbar title="A/R Aging Report" />
      <div className="page-content">
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleSubmit} className="modal-form" style={{ gap: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Client</label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">All clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ')}{c.company_name ? ` – ${c.company_name}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sales Representative</label>
                <input value={salesRepresentative} onChange={(e) => setSalesRepresentative(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Invoice Status</label>
                <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="form-group">
                <label>From Date (Invoice)</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>To Date (Invoice)</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>As On Date</label>
                <input type="date" value={asOnDate} onChange={(e) => setAsOnDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                </select>
              </div>
              <div className="form-group">
                <label>Report Status</label>
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}>
                  <option value="">Generated (default)</option>
                  <option value="Draft">Draft</option>
                  <option value="Generated">Generated</option>
                  <option value="Finalized">Finalized</option>
                </select>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={fetching}>{fetching ? 'Generating...' : 'Generate Report'}</button>
              <button type="button" className="btn btn-ghost" onClick={exportPdf} disabled={data.details.length === 0 || exporting}>{exporting ? 'Exporting...' : 'Export PDF'}</button>
              <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={data.details.length === 0}>Export Excel</button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()} disabled={data.details.length === 0}>Print Report</button>
            </div>
          </form>

          {data.details.length > 0 && (
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
          <div className="section-card">Loading A/R aging report...</div>
        ) : error ? (
          <div className="section-card"><div className="alert alert-error">{error}</div></div>
        ) : (
          <>
            <div className="cards-grid" style={{ marginBottom: '1rem' }}>
              {BUCKETS.map(({ key, label }) => (
                <div className="section-card" key={key}>
                  <h3 className="section-title">{label}</h3>
                  <div className="stat-value text-blue">{fmt(data.summary[key])}</div>
                </div>
              ))}
            </div>

            <div className="cards-grid" style={{ marginBottom: '1rem' }}>
              <div className="section-card">
                <h3 className="section-title">Total Outstanding</h3>
                <div className="stat-value text-blue">{fmt(data.summary.totalOutstanding)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Overdue</h3>
                <div className="stat-value text-red">{fmt(data.summary.totalOverdue)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Customers</h3>
                <div className="stat-value">{data.summary.totalCustomers}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Avg Collection Days</h3>
                <div className="stat-value">{data.summary.averageCollectionDays ?? '—'}</div>
              </div>
            </div>

            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Report Info</h3>
              {data.report.reportId && (
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Report ID: {data.report.reportId}</div>
              )}
              {data.report.reportStatus && (
                <span className="status-badge">{data.report.reportStatus}</span>
              )}
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                {data.report.asOnDate && <span>As On Date: {data.report.asOnDate}  |  </span>}
                {data.generatedBy && <span>Generated By: {data.generatedBy}  |  </span>}
                {data.generatedDate && <span>Generated Date: {new Date(data.generatedDate).toLocaleString()}  |  </span>}
                {data.lastUpdated && <span>Last Updated: {new Date(data.lastUpdated).toLocaleString()}</span>}
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-title">Details</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Contact</th>
                      <th>Mobile</th>
                      <th>Email</th>
                      <th>Invoice #</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th>Invoice Amount</th>
                      <th>Amount Paid</th>
                      <th>Outstanding</th>
                      <th>Days Overdue</th>
                      <th>Aging Bucket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details.length === 0 ? (
                      <tr><td colSpan="12" className="empty-row">No outstanding invoices found</td></tr>
                    ) : data.details.map((row) => (
                      <tr key={`${row.invoiceId}-${row.bucket}`}>
                        <td>{row.clientName}{row.clientCode ? ` (${row.clientCode})` : ''}</td>
                        <td>{row.contactPerson || '-'}</td>
                        <td>{row.mobileNumber || '-'}</td>
                        <td>{row.emailAddress || '-'}</td>
                        <td>{row.invoiceNumber}</td>
                        <td>{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : '-'}</td>
                        <td>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-'}</td>
                        <td>{fmt(row.invoiceAmount)}</td>
                        <td>{fmt(row.amountPaid)}</td>
                        <td>{fmt(row.outstandingAmount)}</td>
                        <td>{row.daysOverdue}</td>
                        <td>{row.bucket}</td>
                      </tr>
                    ))}
                  </tbody>
                  {data.details.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan="9"><b>Total</b></td>
                        <td><b>{fmt(data.summary.totalOutstanding)}</b></td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ARAging;
