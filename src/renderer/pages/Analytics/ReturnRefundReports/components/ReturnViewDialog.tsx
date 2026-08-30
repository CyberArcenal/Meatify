// src/renderer/pages/analytics/returns/components/ReturnViewDialog.tsx
import React from "react";
import { X, Beef, Package, FileText } from "lucide-react";
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--card-secondary-bg)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">↩️</span>
            Return #{returnRefund.referenceNo || returnRefund.id}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)]">Reference</p>
                <p className="text-[var(--text-primary)] font-mono">
                  {returnRefund.referenceNo || `#${returnRefund.id}`}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)]">Status</p>
                <StatusBadge status={returnRefund.status} />
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)]">Date</p>
                <p className="text-[var(--text-primary)]">
                  {format(new Date(returnRefund.createdAt), "MMM dd, yyyy h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)]">Customer</p>
                <p className="text-[var(--text-primary)]">
                  {returnRefund.customer?.name || returnRefund.customerName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)]">Refund Method</p>
                <p className="text-[var(--text-primary)] capitalize">{returnRefund.refundMethod}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)]">Total Amount</p>
                <p className="text-xl font-bold text-[var(--accent-gold)]">
                  ₱{new Decimal(returnRefund.totalAmount).toFixed(2)}
                </p>
              </div>
              {returnRefund.reason && (
                <div className="col-span-2">
                  <p className="text-xs uppercase text-[var(--text-tertiary)]">Reason</p>
                  <p className="text-[var(--text-primary)] bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
                    {returnRefund.reason}
                  </p>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <span className="text-[var(--accent-gold)]">🥩</span>
                Returned Items
                <span className="text-xs text-[var(--text-tertiary)] font-normal ml-2">
                  Total Weight: {totalWeight.toFixed(2)} kg
                </span>
              </h4>
              {returnRefund.items?.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-4">No items returned</p>
              ) : (
                <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Meat</th>
                        <th className="text-right py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Weight (kg)</th>
                        <th className="text-right py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Unit Price</th>
                        <th className="text-right py-2 px-4 text-xs uppercase text-[var(--text-tertiary)]">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)]">
                      {returnRefund.items.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--table-row-hover)]">
                          <td className="py-2 px-4 text-[var(--text-primary)]">
                            {item.meat?.name || `Meat #${item.meatId}`}
                            <span className="text-xs text-[var(--text-tertiary)] ml-2">{item.meat?.sku}</span>
                          </td>
                          <td className="py-2 px-4 text-right text-[var(--text-primary)]">
                            {item.weightKg.toFixed(2)}
                          </td>
                          <td className="py-2 px-4 text-right text-[var(--accent-gold)]">
                            ₱{new Decimal(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="py-2 px-4 text-right font-semibold text-[var(--accent-gold)]">
                            ₱{new Decimal(item.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--table-header-bg)]">
                      <tr>
                        <td colSpan={3} className="py-2 px-4 text-right font-medium text-[var(--text-primary)]">
                          Total
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-[var(--accent-gold)]">
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
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--accent-blue)]" />
                  Related Sale
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
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
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-color)] flex justify-end bg-[var(--card-secondary-bg)]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};