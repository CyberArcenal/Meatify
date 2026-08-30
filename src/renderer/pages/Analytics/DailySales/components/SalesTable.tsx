// src/renderer/pages/Analytics/DailySales/components/SalesTable.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, X, Calendar } from 'lucide-react';
import type { DailySale } from '../../../../api/analytics/dailySales';
import dailySalesAPI from '../../../../api/analytics/dailySales';

interface Props {
  data: Array<{ date: string; count: number; total: number; average: number; paidCount: number }>;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onViewDate?: (date: string) => void;
}

const SalesTable: React.FC<Props> = ({
  data,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onViewDate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [details, setDetails] = useState<DailySale[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const handleViewDetails = async (date: string) => {
    setSelectedDate(date);
    setLoadingDetails(true);
    setShowModal(true);
    if (onViewDate) onViewDate(date);
    try {
      const res = await dailySalesAPI.getData({ date, limit: 100 });
      if (res.status) {
        setDetails(res.data.sales);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      alert('Failed to load details: ' + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-[var(--status-completed-bg)] text-[var(--status-completed)]';
      case 'pending':
        return 'bg-[var(--status-pending-bg)] text-[var(--status-pending)]';
      case 'cancelled':
        return 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]';
      case 'refunded':
        return 'bg-[var(--status-refunded-bg)] text-[var(--status-refunded)]';
      default:
        return 'bg-[var(--border-light)] text-[var(--text-secondary)]';
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📋</span>
            Daily Sales Entries
          </h3>
          <div className="h-4 w-20 bg-[var(--card-secondary-bg)] animate-pulse rounded" />
        </div>
        <div className="p-8 text-center text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm hover:border-[var(--accent-gold)] transition-colors">
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📋</span>
            Daily Sales Entries
          </h3>
          <span className="text-sm text-[var(--text-tertiary)]">
            {total} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
              <tr>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
                <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Transactions</th>
                <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Total Amount</th>
                <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Average</th>
                <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Paid</th>
                <th className="text-center py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-tertiary)]">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
                    No sales data found.
                  </td>
                </tr>
              ) : (
                data.map(row => (
                  <tr
                    key={row.date}
                    className="hover:bg-[var(--table-row-hover)] hover:border-l-2 hover:border-l-[var(--accent-gold)] transition-all duration-150"
                  >
                    <td className="py-3 px-5 font-medium text-[var(--text-primary)]">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-5 text-right text-[var(--text-primary)]">{row.count}</td>
                    <td className="py-3 px-5 text-right font-semibold text-[var(--accent-gold)]">
                      {formatCurrency(row.total)}
                    </td>
                    <td className="py-3 px-5 text-right text-[var(--text-primary)]">
                      {formatCurrency(row.average)}
                    </td>
                    <td className="py-3 px-5 text-right text-[var(--text-primary)]">{row.paidCount}</td>
                    <td className="py-3 px-5 text-center">
                      <button
                        onClick={() => handleViewDetails(row.date)}
                        className="p-1.5 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-gold)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-[var(--text-primary)]">Page {page} of {totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-gold)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--card-secondary-bg)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--accent-gold)]">📄</span>
                Sales Details for {selectedDate && new Date(selectedDate).toLocaleDateString()}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 custom-scrollbar">
              {loadingDetails ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">Loading details...</div>
              ) : details.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-tertiary)]">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No transactions found for this day.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">ID</th>
                      <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Time</th>
                      <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Payment</th>
                      <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {details.map(item => (
                      <tr key={item.id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                        <td className="py-2 px-3 text-[var(--text-primary)] font-mono">#{item.id}</td>
                        <td className="py-2 px-3 text-[var(--text-primary)]">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[var(--text-primary)]">{item.paymentMethod}</td>
                        <td className="py-2 px-3 text-right font-medium text-[var(--accent-gold)]">
                          {formatCurrency(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-color)] flex justify-end bg-[var(--card-secondary-bg)]">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesTable;