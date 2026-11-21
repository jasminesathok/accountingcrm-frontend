import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import heroImg from '../assets/hero.png';
import {
  TrendingUp, Sun, Moon, ArrowRight, BookOpen, FileText, PieChart,
  ShieldCheck, Landmark, ReceiptText, Users, Building2, CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Double-Entry Accounting',
    desc: 'Full general ledger with journal entries, chart of accounts, and automatic balancing.',
  },
  {
    icon: FileText,
    title: 'Invoices & Bills',
    desc: 'Create, send, and track client invoices and vendor bills in one place.',
  },
  {
    icon: ReceiptText,
    title: 'Payments & Expenses',
    desc: 'Log payments and expenses as they happen and keep every account reconciled.',
  },
  {
    icon: PieChart,
    title: 'Real-Time Reports',
    desc: 'Profit & Loss, Balance Sheet, AR/AP Aging — generated instantly from live data.',
  },
  {
    icon: Landmark,
    title: 'Bank Accounts & Ledger',
    desc: 'Track balances across accounts with a full drill-down transaction ledger.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    desc: 'Admins, users, and vendors each see exactly what they need — nothing more.',
  },
];

const STEPS = [
  { icon: Users, title: 'Create your account', desc: 'Register your organization and invite your team.' },
  { icon: Building2, title: 'Set up your books', desc: 'Add clients, vendors, and your chart of accounts.' },
  { icon: TrendingUp, title: 'Track everything', desc: 'Invoices, payments, and reports stay in sync automatically.' },
];

const Landing = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <div className="auth-brand-icon landing-brand-icon"><TrendingUp size={22} /></div>
          <span className="brand-name">AccountCRM</span>
        </div>
        <div className="landing-nav-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user ? (
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-badge">Complete Accounting & Bookkeeping Solution</span>
          <h1>Run your books with clarity and confidence</h1>
          <p>
            AccountCRM brings double-entry accounting, invoicing, payments, and real-time
            financial reports together in one clean, role-aware workspace for admins,
            clients, and vendors.
          </p>
          <div className="landing-hero-actions">
            <Link to={user ? '/dashboard' : '/register'} className="btn btn-primary btn-lg">
              {user ? 'Go to Dashboard' : 'Create Free Account'} <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">Sign In</Link>
          </div>
          <div className="landing-hero-trust">
            {['Double-Entry Ledger', 'Real-time Reports', 'Role-Based Access'].map((t) => (
              <span key={t}><CheckCircle2 size={14} /> {t}</span>
            ))}
          </div>
        </div>
        <div className="landing-hero-art">
          <img src={heroImg} alt="AccountCRM dashboard preview" />
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Everything your books need</h2>
          <p>From day-to-day bookkeeping to financial reporting, it's all built in.</p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div className="card landing-feature-card" key={title}>
              <div className="landing-feature-icon"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-steps-section">
        <div className="landing-section-head">
          <h2>Get set up in minutes</h2>
          <p>No spreadsheets, no imports — just start entering your books.</p>
        </div>
        <div className="landing-steps-grid">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div className="landing-step" key={title}>
              <div className="landing-step-num">{i + 1}</div>
              <div className="landing-feature-icon"><Icon size={18} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2>Ready to get your books in order?</h2>
        <p>Create your organization's account and invite your team today.</p>
        <Link to={user ? '/dashboard' : '/register'} className="btn btn-primary btn-lg">
          {user ? 'Go to Dashboard' : 'Get Started for Free'} <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} AccountCRM. All rights reserved.</span>
        <div className="landing-footer-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register">Register</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
