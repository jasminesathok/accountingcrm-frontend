import { useCallback, useEffect, useState } from 'react';
import { getProfitLoss, exportProfitLossPdf, emailProfitLoss } from '../api/reports';
import Navbar from '../components/Navbar';

const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(n || 0));

const EMPTY_REPORT = {
  report: { reportId: null, reportName: 'Profit & Loss Report', reportPeriod: null, financialYear: null, fromDate: null, toDate: null, currency: 'INR', reportStatus: 'Generated' },
  income: { salesRevenue: 0, serviceRevenue: 0, otherIncome: 0, interestIncome: 0, totalIncome: 0 },
  cogs: { openingStock: 0, purchases: 0, purchaseReturns: 0, closingStock: 0, directCostOfGoodsSold: 0, costOfGoodsSold: 0 },
  operatingExpenses: { salaryExpense: 0, rentExpense: 0, utilityExpense: 0, travelExpense: 0, marketingExpense: 0, officeExpense: 0, depreciation: 0, otherExpenses: 0, totalOperatingExpenses: 0 },
  profit: { grossProfit: 0, operatingProfit: 0, netProfitBeforeTax: 0, taxExpense: 0, netProfitAfterTax: 0, netLoss: 0 },
  comparison: { previousPeriodProfit: null, currentPeriodProfit: 0, profitGrowthPercent: null, varianceAmount: null },
  filters: {},
  exportOptions: {},
  generatedBy: null,
  generatedDate: null,
  approvedBy: null,
  approvedDate: null,
  lastUpdated: null
};

const ProfitLoss = () => {
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
  const [project, setProject] = useState('');
  const [client, setClient] = useState('');
  const [category, setCategory] = useState('');
  // Profit calculation input
  const [taxRate, setTaxRate] = useState('');

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
      const res = await getProfitLoss(filters);
      setData(res.data);
      setAppliedFilters(filters);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profit and loss report');
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
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(currency ? { currency } : {}),
      ...(reportStatus ? { reportStatus } : {}),
      ...(branch ? { branch } : {}),
      ...(department ? { department } : {}),
      ...(project ? { project } : {}),
      ...(client ? { client } : {}),
      ...(category ? { category } : {}),
      ...(taxRate ? { taxRate } : {})
    });
  };

  const hasData = data.income.totalIncome !== 0 || data.operatingExpenses.totalOperatingExpenses !== 0 || data.cogs.costOfGoodsSold !== 0;

  const exportCsv = () => {
    const rows = [
      ['Section', 'Field', 'Amount'],
      ['Income Details', 'Sales Revenue', data.income.salesRevenue],
      ['Income Details', 'Service Revenue', data.income.serviceRevenue],
      ['Income Details', 'Other Income', data.income.otherIncome],
      ['Income Details', 'Interest Income', data.income.interestIncome],
      ['Income Details', 'Total Income', data.income.totalIncome],
      ['COGS', 'Opening Stock', data.cogs.openingStock],
      ['COGS', 'Purchases', data.cogs.purchases],
      ['COGS', 'Purchase Returns', data.cogs.purchaseReturns],
      ['COGS', 'Closing Stock', data.cogs.closingStock],
      ['COGS', 'Cost of Goods Sold', data.cogs.costOfGoodsSold],
      ['Operating Expenses', 'Salary Expense', data.operatingExpenses.salaryExpense],
      ['Operating Expenses', 'Rent Expense', data.operatingExpenses.rentExpense],
      ['Operating Expenses', 'Utility Expense', data.operatingExpenses.utilityExpense],
      ['Operating Expenses', 'Travel Expense', data.operatingExpenses.travelExpense],
      ['Operating Expenses', 'Marketing Expense', data.operatingExpenses.marketingExpense],
      ['Operating Expenses', 'Office Expense', data.operatingExpenses.officeExpense],
      ['Operating Expenses', 'Depreciation', data.operatingExpenses.depreciation],
      ['Operating Expenses', 'Other Expenses', data.operatingExpenses.otherExpenses],
      ['Operating Expenses', 'Total Operating Expenses', data.operatingExpenses.totalOperatingExpenses],
      ['Profit Calculation', 'Gross Profit', data.profit.grossProfit],
      ['Profit Calculation', 'Operating Profit', data.profit.operatingProfit],
      ['Profit Calculation', 'Net Profit Before Tax', data.profit.netProfitBeforeTax],
      ['Profit Calculation', 'Tax Expense', data.profit.taxExpense],
      ['Profit Calculation', 'Net Profit After Tax', data.profit.netProfitAfterTax],
      ['Profit Calculation', 'Net Loss', data.profit.netLoss],
      ['Comparison Details', 'Previous Period Profit', data.comparison.previousPeriodProfit ?? ''],
      ['Comparison Details', 'Current Period Profit', data.comparison.currentPeriodProfit],
      ['Comparison Details', 'Profit Growth (%)', data.comparison.profitGrowthPercent ?? ''],
      ['Comparison Details', 'Variance Amount', data.comparison.varianceAmount ?? '']
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'profit-loss.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await exportProfitLossPdf(appliedFilters);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'profit-loss.pdf';
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
      await emailProfitLoss(emailTo.trim(), appliedFilters);
      setEmailStatus('Report emailed successfully');
    } catch (err) {
      setEmailStatus(err.response?.data?.message || 'Failed to email report');
    } finally {
      setEmailing(false);
    }
  };

  const isProfit = data.profit.netProfitAfterTax >= 0;

  return (
    <div className="page">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { background: #fff !important; }
          .page-content { padding: 0 !important; }
          .section-card { box-shadow: none !important; border: 1px solid #ddd !important; }
          .data-table { color: #000 !important; }
        }
      `}</style>
      <Navbar title="Profit & Loss" />
      <div className="page-content">
        <div className="section-card no-print" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleSubmit} className="modal-form" style={{ gap: '1rem' }}>
            <div className="form-row">
              <div className="form-group"><label>Financial Year</label><input value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} placeholder="e.g. 2026-2027" /></div>
              <div className="form-group"><label>Report Period</label>
                <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
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
            <div className="form-row">
              <div className="form-group"><label>Project</label><input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Optional" /></div>
              <div className="form-group"><label>Client</label><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Name or ID, optional" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Category</label><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Sales Revenue" /></div>
              <div className="form-group"><label>Tax Rate (%)</label><input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="Optional, applied to profit before tax" /></div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={fetching}>{fetching ? 'Generating...' : 'Generate Report'}</button>
              <button type="button" className="btn btn-ghost" onClick={exportPdf} disabled={loading || exporting}>{exporting ? 'Exporting...' : 'Export PDF'}</button>
              <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={loading}>Export Excel</button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()} disabled={loading}>Print Report</button>
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
          <div className="section-card">Loading report...</div>
        ) : error ? (
          <div className="section-card"><div className="alert alert-error">{error}</div></div>
        ) : (
          <>
            {/* Basic information / System fields */}
            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">{data.report.reportName}</h3>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
                {data.report.reportId && <>Report ID: {data.report.reportId}  |  </>}
                {data.report.financialYear && <>Financial Year: {data.report.financialYear}  |  </>}
                {data.report.reportPeriod && <>Period: {data.report.reportPeriod}  |  </>}
                Currency: {data.report.currency}
              </div>
              <span className="status-badge">{data.report.reportStatus}</span>
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                {data.generatedBy && <span>Generated By: {data.generatedBy}  |  </span>}
                {data.generatedDate && <span>Generated Date: {new Date(data.generatedDate).toLocaleString()}  |  </span>}
                {data.approvedBy && <span>Approved By: {data.approvedBy}  |  </span>}
                {data.approvedDate && <span>Approved Date: {new Date(data.approvedDate).toLocaleString()}  |  </span>}
                {data.lastUpdated && <span>Last Updated: {new Date(data.lastUpdated).toLocaleString()}</span>}
              </div>
            </div>

            {/* Top summary cards */}
            <div className="cards-grid" style={{ marginBottom: '1rem' }}>
              <div className="section-card">
                <h3 className="section-title">Total Income</h3>
                <div className="stat-value text-green">{fmt(data.income.totalIncome)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Cost of Goods Sold</h3>
                <div className="stat-value text-red">{fmt(data.cogs.costOfGoodsSold)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">Total Operating Expenses</h3>
                <div className="stat-value text-red">{fmt(data.operatingExpenses.totalOperatingExpenses)}</div>
              </div>
              <div className="section-card">
                <h3 className="section-title">{isProfit ? 'Net Profit After Tax' : 'Net Loss'}</h3>
                <div className={`stat-value ${isProfit ? 'text-green' : 'text-red'}`}>
                  {fmt(isProfit ? data.profit.netProfitAfterTax : data.profit.netLoss)}
                </div>
              </div>
            </div>

            {/* Income Details */}
            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Income Details</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>
                    <tr><td>Sales Revenue</td><td className="text-green">{fmt(data.income.salesRevenue)}</td></tr>
                    <tr><td>Service Revenue</td><td className="text-green">{fmt(data.income.serviceRevenue)}</td></tr>
                    <tr><td>Other Income</td><td className="text-green">{fmt(data.income.otherIncome)}</td></tr>
                    <tr><td>Interest Income</td><td className="text-green">{fmt(data.income.interestIncome)}</td></tr>
                  </tbody>
                  <tfoot>
                    <tr><td><b>Total Income</b></td><td className="text-green"><b>{fmt(data.income.totalIncome)}</b></td></tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* COGS */}
            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Cost of Goods Sold (COGS)</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>
                    <tr><td>Opening Stock</td><td>{fmt(data.cogs.openingStock)}</td></tr>
                    <tr><td>Purchases</td><td>{fmt(data.cogs.purchases)}</td></tr>
                    <tr><td>Purchase Returns</td><td>{fmt(data.cogs.purchaseReturns)}</td></tr>
                    <tr><td>Closing Stock</td><td>{fmt(data.cogs.closingStock)}</td></tr>
                  </tbody>
                  <tfoot>
                    <tr><td><b>Cost of Goods Sold</b></td><td className="text-red"><b>{fmt(data.cogs.costOfGoodsSold)}</b></td></tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Operating Expenses</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>
                    <tr><td>Salary Expense</td><td>{fmt(data.operatingExpenses.salaryExpense)}</td></tr>
                    <tr><td>Rent Expense</td><td>{fmt(data.operatingExpenses.rentExpense)}</td></tr>
                    <tr><td>Utility Expense</td><td>{fmt(data.operatingExpenses.utilityExpense)}</td></tr>
                    <tr><td>Travel Expense</td><td>{fmt(data.operatingExpenses.travelExpense)}</td></tr>
                    <tr><td>Marketing Expense</td><td>{fmt(data.operatingExpenses.marketingExpense)}</td></tr>
                    <tr><td>Office Expense</td><td>{fmt(data.operatingExpenses.officeExpense)}</td></tr>
                    <tr><td>Depreciation</td><td>{fmt(data.operatingExpenses.depreciation)}</td></tr>
                    <tr><td>Other Expenses</td><td>{fmt(data.operatingExpenses.otherExpenses)}</td></tr>
                  </tbody>
                  <tfoot>
                    <tr><td><b>Total Operating Expenses</b></td><td className="text-red"><b>{fmt(data.operatingExpenses.totalOperatingExpenses)}</b></td></tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Profit Calculation */}
            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Profit Calculation</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>
                    <tr><td>Gross Profit (Income − COGS)</td><td className={data.profit.grossProfit >= 0 ? 'text-green' : 'text-red'}>{fmt(data.profit.grossProfit)}</td></tr>
                    <tr><td>Operating Profit (Gross Profit − Operating Expenses)</td><td className={data.profit.operatingProfit >= 0 ? 'text-green' : 'text-red'}>{fmt(data.profit.operatingProfit)}</td></tr>
                    <tr><td>Net Profit Before Tax</td><td className={data.profit.netProfitBeforeTax >= 0 ? 'text-green' : 'text-red'}>{fmt(data.profit.netProfitBeforeTax)}</td></tr>
                    <tr><td>Tax Expense</td><td>{fmt(data.profit.taxExpense)}</td></tr>
                    <tr><td><b>Net Profit After Tax</b></td><td className="text-green"><b>{fmt(data.profit.netProfitAfterTax)}</b></td></tr>
                    <tr><td><b>Net Loss</b></td><td className="text-red"><b>{fmt(data.profit.netLoss)}</b></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparison Details */}
            <div className="section-card">
              <h3 className="section-title">Comparison Details</h3>
              {data.comparison.previousPeriodProfit === null ? (
                <div style={{ color: '#888', fontSize: '0.9rem' }}>Set both From Date and To Date to compare against the equivalent prior period.</div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <tbody>
                      <tr><td>Previous Period Profit</td><td>{fmt(data.comparison.previousPeriodProfit)}</td></tr>
                      <tr><td>Current Period Profit</td><td>{fmt(data.comparison.currentPeriodProfit)}</td></tr>
                      <tr>
                        <td>Profit Growth (%)</td>
                        <td className={data.comparison.profitGrowthPercent >= 0 ? 'text-green' : 'text-red'}>
                          {data.comparison.profitGrowthPercent === null ? 'N/A' : `${data.comparison.profitGrowthPercent.toFixed(2)}%`}
                        </td>
                      </tr>
                      <tr>
                        <td>Variance Amount</td>
                        <td className={data.comparison.varianceAmount >= 0 ? 'text-green' : 'text-red'}>{fmt(data.comparison.varianceAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!hasData && (
              <div className="section-card" style={{ marginTop: '1rem' }}>
                <div className="empty-row">No Income or Expense journal entries found for the selected filters</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfitLoss;
