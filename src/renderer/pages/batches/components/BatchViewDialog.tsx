import React from 'react';
import { X } from 'lucide-react';
import type { Batch } from '../../../api/core/batch';

interface Props {
  batch: Batch;
  onClose: () => void;
}

const BatchViewDialog: React.FC<Props> = ({ batch, onClose }) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[var(--status-completed-bg)] text-[var(--status-completed)]';
      case 'depleted': return 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]';
      case 'expired': return 'bg-[var(--danger-bg)] text-[var(--danger-color)]';
      case 'on_hold': return 'bg-[var(--status-pending-bg)] text-[var(--status-pending)]';
      default: return 'bg-[var(--border-light)] text-[var(--text-secondary)]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              Batch Details - {batch.batchCode}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)]">
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Batch Code</p>
                <p className="text-sm font-mono text-[var(--text-primary)]">{batch.batchCode}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(batch.status)}`}>
                  {batch.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Meat</p>
                <p className="text-sm text-[var(--text-primary)]">{batch.meat?.name || `#${batch.meatId}`}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Supplier</p>
                <p className="text-sm text-[var(--text-primary)]">{batch.supplier?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Received Date</p>
                <p className="text-sm text-[var(--text-primary)]">{formatDate(batch.receivedDate)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Expiry Date</p>
                <p className="text-sm text-[var(--text-primary)]">{formatDate(batch.expiryDate)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Initial Quantity</p>
                <p className="text-sm text-[var(--text-primary)]">{batch.initialQuantity} kg</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Remaining Quantity</p>
                <p className="text-sm text-[var(--text-primary)]">{batch.remainingQuantity} kg</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Unit Cost</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(batch.unitCost)}
                </p>
              </div>
              {batch.note && (
                <div className="col-span-2">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Note</p>
                  <p className="text-sm text-[var(--text-primary)] bg-[var(--card-secondary-bg)] p-2 rounded">
                    {batch.note}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>Created: {formatDate(batch.createdAt)}</span>
              {batch.updatedAt && (
                <span>Updated: {formatDate(batch.updatedAt)}</span>
              )}
            </div>
          </div>

          <div className="flex justify-end p-6 border-t border-[var(--border-color)]">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchViewDialog;