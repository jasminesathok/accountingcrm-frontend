import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Vendors from './pages/Vendors';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Bills from './pages/Bills';
import Expenses from './pages/Expenses';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import JournalEntries from './pages/JournalEntries';
import BankAccounts from './pages/BankAccounts';
import PettyCash from './pages/PettyCash';
import Ledger from './pages/Ledger';
import Ledgers from './pages/Ledgers';
import ProfitLoss from './pages/ProfitLoss';
import BalanceSheet from './pages/BalanceSheet';
import ARAging from './pages/ARAging';
import APAging from './pages/APAging';
import TrialBalance from './pages/TrialBalance';

const AppLayout = () => (
  <div className="app-layout">
    <Sidebar />
    <main className="app-main">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes - Role Restricted */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Admin Only */}
            <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin']}><Clients /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute allowedRoles={['admin']}><Vendors /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute allowedRoles={['admin']}><Accounts /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin']}><Expenses /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute allowedRoles={['admin']}><Transactions /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute allowedRoles={['admin']}><JournalEntries /></ProtectedRoute>} />
            <Route path="/ledgers" element={<ProtectedRoute allowedRoles={['admin']}><Ledgers /></ProtectedRoute>} />
            <Route path="/ledger/:accountId?" element={<ProtectedRoute allowedRoles={['admin']}><Ledger /></ProtectedRoute>} />
            <Route path="/reports/profit-loss" element={<ProtectedRoute allowedRoles={['admin']}><ProfitLoss /></ProtectedRoute>} />
            <Route path="/reports/balance-sheet" element={<ProtectedRoute allowedRoles={['admin']}><BalanceSheet /></ProtectedRoute>} />
            <Route path="/reports/ar-aging" element={<ProtectedRoute allowedRoles={['admin']}><ARAging /></ProtectedRoute>} />
            <Route path="/reports/ap-aging" element={<ProtectedRoute allowedRoles={['admin']}><APAging /></ProtectedRoute>} />
            <Route path="/reports/trial-balance" element={<ProtectedRoute allowedRoles={['admin']}><TrialBalance /></ProtectedRoute>} />
            <Route path="/bank-accounts" element={<ProtectedRoute allowedRoles={['admin']}><BankAccounts /></ProtectedRoute>} />
            <Route path="/petty-cash" element={<ProtectedRoute allowedRoles={['admin']}><PettyCash /></ProtectedRoute>} />
            
            {/* Admin & Specific Roles */}
            <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin', 'user']}><Invoices /></ProtectedRoute>} />
            <Route path="/bills" element={<ProtectedRoute allowedRoles={['admin', 'vendor']}><Bills /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute allowedRoles={['admin', 'user', 'vendor']}><Payments /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
