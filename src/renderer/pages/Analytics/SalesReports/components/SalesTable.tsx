// src/renderer/pages/Analytics/SalesReports/components/SalesTable.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

type SaleEntry = {
  id: number;
  timestamp: string;
  customer?: { name: string } | null;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  notes?: string | null;
  saleItems?: Array<{
    id: number;
    productId: number;
    product?: { name: string } | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

interface Props {
  data: SaleEntry[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const SalesTable: React.FC<Props> = ({
  data,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
}) => {
  const [selectedSale, setSelectedSale] = useState<SaleEntry | null>(null);
  const [showModal, setShowModal] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
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

  const handleViewDetails = (sale: SaleEntry) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  return (
    <>
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📋</span>
            Sales Transactions
          </h3>
          <span className="text-sm text-[var(--text-tertiary)]">
            Total: {total} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
              <tr>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">ID</th>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Customer</th>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Payment</th>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Amount</th>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
                <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[var(--text-tertiary)]">No sales found.</td></tr>
              ) : (
                data.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--table-row-hover)] hover:border-l-2 hover:border-l-[var(--accent-gold)] transition-all duration-150 cursor-pointer"
                    onClick={() => handleViewDetails(item)}
                  >
                    <td className="py-3 px-5 text-[var(--text-primary)] font-medium">#{item.id}</td>
                    <td className="py-3 px-5 text-[var(--text-primary)]">{new Date(item.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-5 text-[var(--text-primary)]">{item.customer?.name || 'Guest'}</td>
                    <td className="py-3 px-5 text-[var(--text-primary)]">{item.paymentMethod}</td>
                    <td className="py-3 px-5 text-[var(--text-primary)] font-semibold text-[var(--accent-gold)]">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="py-3 px-5">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(item); }}
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

        {/* Pagination */}
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

      {/* Details Modal - improved with gold accents */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--card-secondary-bg)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--accent-gold)]">📄</span>
                Sale Details - #{selectedSale.id}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-[var(--text-tertiary)]">Sale ID</p>
                    <p className="text-[var(--text-primary)] font-medium">#{selectedSale.id}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--text-tertiary)]">Date & Time</p>
                    <p className="text-[var(--text-primary)]">{new Date(selectedSale.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--text-tertiary)]">Customer</p>
                    <p className="text-[var(--text-primary)]">{selectedSale.customer?.name || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--text-tertiary)]">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${getStatusBadge(selectedSale.status)}`}>
                      {selectedSale.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--text-tertiary)]">Payment Method</p>
                    <p className="text-[var(--text-primary)]">{selectedSale.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--text-tertiary)]">Total Amount</p>
                    <p className="text-xl font-bold text-[var(--accent-gold)]">{formatCurrency(selectedSale.totalAmount)}</p>
                  </div>
                  {selectedSale.notes && (
                    <div className="col-span-2">
                      <p className="text-xs uppercase text-[var(--text-tertiary)]">Notes</p>
                      <p className="text-[var(--text-primary)] bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
                        {selectedSale.notes}
                      </p>
                    </div>
                  )}
                </div>

                {selectedSale.saleItems && selectedSale.saleItems.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <span className="text-[var(--accent-gold)]">🛒</span> Items
                    </h4>
                    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
                          <tr>
                            <th className="text-left py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Product</th>
                            <th className="text-right py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Qty</th>
                            <th className="text-right py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Unit Price</th>
                            <th className="text-right py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-light)]">
                          {selectedSale.saleItems.map(item => (
                            <tr key={item.id} className="hover:bg-[var(--table-row-hover)]">
                              <td className="py-2 px-4 text-[var(--text-primary)]">{item.product?.name || `Product #${item.productId}`}</td>
                              <td className="py-2 px-4 text-right text-[var(--text-primary)]">{item.quantity}</td>
                              <td className="py-2 px-4 text-right text-[var(--text-primary)]">{formatCurrency(item.unitPrice)}</td>
                              <td className="py-2 px-4 text-right font-semibold text-[var(--accent-gold)]">{formatCurrency(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesTable;