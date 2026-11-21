import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, FileText, CreditCard,
  Receipt, ShoppingBag, BookOpen, ArrowLeftRight, BookMarked,
  LogOut, ChevronRight, Landmark, Wallet
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/bills', label: 'Bills', icon: ShoppingBag },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/accounts', label: 'Chart of Accounts', icon: BookOpen },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/journal', label: 'Journal Entries', icon: BookMarked },
  { to: '/ledgers', label: 'Ledgers', icon: BookMarked },
  { to: '/ledger', label: 'Ledger Statement', icon: BookOpen },
  { to: '/reports/profit-loss', label: 'Profit & Loss', icon: FileText },
  { to: '/reports/balance-sheet', label: 'Balance Sheet', icon: FileText },
  { to: '/reports/ar-aging', label: 'A/R Aging', icon: FileText },
  { to: '/reports/ap-aging', label: 'A/P Aging', icon: FileText },
  { to: '/reports/trial-balance', label: 'Trial Balance', icon: FileText },
  { to: '/bank-accounts', label: 'Bank Accounts', icon: Landmark },
  { to: '/petty-cash', label: 'Petty Cash', icon: Wallet },
];

const Sidebar = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">₹</div>
        <div>
          <span className="brand-name">AccountCRM</span>
          <span className="brand-sub">Finance Suite</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.filter(item => {
          if (!user?.role || user.role === 'admin') return true;
          if (user.role === 'vendor') return ['Dashboard', 'Bills', 'Payments'].includes(item.label);
          if (user.role === 'user') return ['Dashboard', 'Invoices', 'Payments'].includes(item.label);
          return item.label === 'Dashboard';
        }).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={14} className="nav-chevron" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
