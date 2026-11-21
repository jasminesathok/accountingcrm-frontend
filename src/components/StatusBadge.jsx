const StatusBadge = ({ status }) => {
  const map = {
    paid: 'badge-success',
    active: 'badge-success',
    pending: 'badge-warning',
    overdue: 'badge-danger',
    draft: 'badge-secondary',
    inactive: 'badge-secondary',
    income: 'badge-success',
    expense: 'badge-danger',
    transfer: 'badge-info',
    sent: 'badge-info',
    partially_paid: 'badge-warning',
    partial: 'badge-warning',
    cancelled: 'badge-danger',
    unpaid: 'badge-danger',
    posted: 'badge-success',
    approved: 'badge-success',
    rejected: 'badge-danger',
  };
  return (
    <span className={`badge ${map[status?.toLowerCase()] || 'badge-secondary'}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
