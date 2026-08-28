// src/renderer/pages/analytics/returns/components/ReturnViewDialog.tsx
import React from "react";
import { X, Beef, Calendar, Hash, FileText, Package } from "lucide-react";
import Decimal from "decimal.js";
import { format } from "date-fns";
import type { ReturnRefundReport } from "../../../../api/analytics/returnRefundReports";

interface ReturnViewDialogProps {
  isOpen: boolean;
  returnRefund: ReturnRefundReport | null;
  onClose: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending)]",
    processed: "bg-[var(--status-completed-bg)] text-[var(--status-completed)]",
    cancelled: "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]",
  };

  const style = styles[status as keyof typeof styles] || "";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const ReturnViewDialog: React.FC<ReturnViewDialogProps> = ({
  isOpen,
  returnRefund,
  onClose,
}) => {
  if (!isOpen || !returnRefund) return null;

  const totalWeight = returnRefund.items?.reduce((sum, item) => sum + item.weightKg, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--accent-gold)]" />
              Return #{returnRefund.referenceNo || returnRefund.id}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Reference</p>
                <p className="text-sm font-mono text-[var(--text-primary)]">
                  {returnRefund.referenceNo || `#${returnRefund.id}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Status</p>
                <StatusBadge status={returnRefund.status} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Date</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {format(new Date(returnRefund.createdAt), "MMM dd, yyyy h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Customer</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {returnRefund.customer?.name || returnRefund.customerName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Refund Method</p>
                <p className="text-sm text-[var(--text-primary)] capitalize">
                  {returnRefund.refundMethod}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Total Amount</p>
                <p className="text-lg font-bold text-[var(--accent-gold)]">
                  ₱{new Decimal(returnRefund.totalAmount).toFixed(2)}
                </p>
              </div>
              {returnRefund.reason && (
                <div className="col-span-2">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Reason</p>
                  <p className="text-sm text-[var(--text-primary)] bg-[var(--card-secondary-bg)] p-2 rounded">
                    {returnRefund.reason}
                  </p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Beef className="w-4 h-4 text-[var(--accent-gold)]" />
                  Returned Items
                </h3>
                <span className="text-xs text-[var(--text-tertiary)]">
                  Total Weight: {totalWeight.toFixed(2)} kg
                </span>
              </div>

              {returnRefund.items?.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-4">No items returned</p>
              ) : (
                <div className="bg-[var(--card-secondary-bg)] rounded-lg overflow-hidden border border-[var(--border-color)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--table-header-bg)]">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)]">
                          Meat
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-tertiary)]">
                          Weight (kg)
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-tertiary)]">
                          Unit Price
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-tertiary)]">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {returnRefund.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-[var(--text-primary)]">
                            {item.meat?.name || `Meat #${item.meatId}`}
                            <span className="text-xs text-[var(--text-tertiary)] ml-2">
                              {item.meat?.sku}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                            {item.weightKg.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--accent-gold)]">
                            ₱{new Decimal(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-[var(--accent-gold)]">
                            ₱{new Decimal(item.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--table-header-bg)]">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-[var(--accent-gold)]">
                          ₱{new Decimal(returnRefund.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Related Sale */}
            {returnRefund.sale && (
              <div className="pt-4 border-t border-[var(--border-color)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--accent-blue)]" />
                  Related Sale
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Sale ID</p>
                    <p className="text-sm font-mono text-[var(--text-primary)]">
                      #{returnRefund.saleId || returnRefund.sale?.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Total Amount</p>
                    <p className="text-sm font-semibold text-[var(--accent-gold)]">
                      ₱{new Decimal(returnRefund.sale?.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Info */}
            <div className="pt-4 border-t border-[var(--border-color)] flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>Created: {format(new Date(returnRefund.createdAt), "MMM dd, yyyy h:mm a")}</span>
              {returnRefund.updatedAt && (
                <span>Updated: {format(new Date(returnRefund.updatedAt), "MMM dd, yyyy h:mm a")}</span>
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