import React from 'react';
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Batch } from '../../../api/core/batch';

interface Props {
  data: Batch[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
  onView: (batch: Batch) => void;
}

const BatchTable: React.FC<Props> = ({
  data,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onEdit,
  onDelete,
  onView,
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[var(--status-completed-bg)] text-[var(--status-completed)]';
      case 'depleted':
        return 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]';
      case 'expired':
        return 'bg-[var(--danger-bg)] text-[var(--danger-color)]';
      case 'on_hold':
        return 'bg-[var(--status-pending-bg)] text-[var(--status-pending)]';
      default:
        return 'bg-[var(--border-light)] text-[var(--text-secondary)]';
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-64 flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">Loading batches...</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-color)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Batches List</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--card-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Batch Code</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Meat</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Supplier</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Received</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Expiry</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Initial Qty</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Remaining</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Unit Cost</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Status</th>
              <th className="text-center py-3 px-5 text-[var(--text-secondary)] font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={10} className="py-8 text-center text-[var(--text-secondary)]">No batches found.</td></tr>
            ) : (
              data.map(batch => (
                <tr key={batch.id} className="border-b border-[var(--border-light)] hover:bg-[var(--card-hover-bg)]">
                  <td className="py-3 px-5 text-[var(--text-primary)] font-mono">{batch.batchCode}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{batch.meat?.name || `#${batch.meatId}`}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{batch.supplier?.name || '-'}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{formatDate(batch.receivedDate)}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{formatDate(batch.expiryDate)}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{batch.initialQuantity}</td>
                  <td className="py-3 px-5">
                    <span className="px-2 py-1 rounded-full text-xs bg-[var(--accent-amber-light)] text-[var(--accent-amber)]">
                      {batch.remainingQuantity}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(batch.unitCost)}
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(batch.status)}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onView(batch)}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(batch)}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-amber)] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(batch)}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--danger-color)] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-[var(--border-color)] flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-2 bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--card-hover-bg)] disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--text-primary)]">Page {page} of {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2 bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--card-hover-bg)] disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchTable;