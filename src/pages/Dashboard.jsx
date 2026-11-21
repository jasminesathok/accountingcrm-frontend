import { useState, useEffect } from 'react';
import { getDashboardSummary, getDashboardCharts } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import DashboardCard from '../components/DashboardCard';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, FileText, AlertCircle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardSummary(), getDashboardCharts()])
      .then(([s, c]) => { setSummary(s.data); setChartData(c.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <Navbar title="Dashboard" />
      <div className="page-content">
        {/* KPI Cards */}
        <div className="cards-grid">
          {user?.role === 'admin' ? (
            <>
              <DashboardCard title="Total Revenue" value={fmt(summary?.totalRevenue)} icon={TrendingUp} color="green" subtitle="All time income" />
              <DashboardCard title="Total Expenses" value={fmt(summary?.totalExpenses)} icon={TrendingDown} color="red" subtitle="All time expenses" />
              <DashboardCard title="Net Income" value={fmt(summary?.netIncome)} icon={DollarSign} color="blue" subtitle="Revenue - Expenses" />
              <DashboardCard title="Pending Invoices" value={fmt(summary?.pendingInvoices)} icon={FileText} color="orange" subtitle={`${summary?.totalInvoiceCount || 0} total invoices`} />
              <DashboardCard title="Overdue Invoices" value={fmt(summary?.overdueInvoices)} icon={AlertCircle} color="red" />
              <DashboardCard title="Paid Invoices" value={fmt(summary?.paidInvoices)} icon={TrendingUp} color="green" />
            </>
          ) : user?.role === 'vendor' ? (
            <>
              <DashboardCard title="Total Paid to You" value={fmt(summary?.totalExpenses)} icon={TrendingUp} color="green" subtitle="Completed payments" />
              <DashboardCard title="Outstanding Bills" value={fmt(summary?.pendingInvoices)} icon={AlertCircle} color="red" subtitle="Pending your action" />
              <DashboardCard title="Recent Billings" value={summary?.totalInvoiceCount || 0} icon={FileText} color="blue" subtitle="Total documents" />
            </>
          ) : (
            <>
              <DashboardCard title="Total Paid by You" value={fmt(summary?.totalRevenue)} icon={TrendingUp} color="green" subtitle="Completed payments" />
              <DashboardCard title="Pending Invoices" value={fmt(summary?.pendingInvoices)} icon={AlertCircle} color="orange" subtitle="Awaiting payment" />
              <DashboardCard title="Overdue" value={fmt(summary?.overdueInvoices)} icon={AlertCircle} color="red" />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3 className="chart-title">Revenue vs Expenses</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} />
                <Legend />
                <Area type="monotone" dataKey={user?.role === 'vendor' ? 'expense' : 'income'} stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name={user?.role === 'vendor' ? 'Paid to You' : 'Income'} />
                {user?.role === 'admin' && <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">Monthly Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="section-card">
          <h3 className="section-title">Recent Transactions</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Amount</th><th>Reference</th><th>Description</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recentTransactions || []).length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No transactions yet</td></tr>
                ) : summary.recentTransactions.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString()}</td>
                    <td><StatusBadge status={t.type} /></td>
                    <td className={t.type === 'income' ? 'text-green' : 'text-red'}>{fmt(t.amount)}</td>
                    <td>{t.reference_type} #{t.reference_id}</td>
                    <td>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
