import { TrendingUp, TrendingDown } from 'lucide-react';

const DashboardCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => (
  <div className={`dash-card dash-card-${color}`}>
    <div className="dash-card-top">
      <div className="dash-card-icon"><Icon size={22} /></div>
      {trend !== undefined && (
        <span className={`dash-trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="dash-card-value">{value}</div>
    <div className="dash-card-title">{title}</div>
    {subtitle && <div className="dash-card-sub">{subtitle}</div>}
  </div>
);

export default DashboardCard;
