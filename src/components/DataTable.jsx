import { ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DataTable = ({ columns, data, loading, page, totalPages, onPageChange, emptyText = 'No records found' }) => {
  if (loading) return (
    <div className="table-loading">
      <div className="spinner"></div>
      <span>Loading...</span>
    </div>
  );

  return (
    <div className="table-wrapper">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={columns.length} className="empty-row">{emptyText}</td></tr>
            ) : data.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (
                      col.badge ? <StatusBadge status={row[col.key]} /> : (row[col.key] ?? '—')
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;
