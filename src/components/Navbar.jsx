import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ title }) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="navbar-right">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search..." />
        </div>
        <button className="icon-btn" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn"><Bell size={18} /></button>
        <div className="nav-avatar">{user?.name?.[0]?.toUpperCase()}</div>
      </div>
    </header>
  );
};

export default Navbar;
