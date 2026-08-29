// src/renderer/pages/inventory/purchases/components/PurchaseViewDialog.tsx
import React from "react";
import { Package, ShoppingCart, Loader2 } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Decimal from "decimal.js";
import type { Purchase, PurchaseItem } from "../../../api/core/purchase";

interface PurchaseViewDialogProps {
  purchase: Purchase | null;
  items: PurchaseItem[];
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-[var(--status-pending-bg)]", text: "text-[var(--status-pending)]" },
    approved: { bg: "bg-[var(--status-processing-bg)]", text: "text-[var(--status-processing)]" },
    completed: { bg: "bg-[var(--status-completed-bg)]", text: "text-[var(--status-completed)]" },
    cancelled: { bg: "bg-[var(--status-cancelled-bg)]", text: "text-[var(--status-cancelled)]" },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const PurchaseViewDialog: React.FC<PurchaseViewDialogProps> = ({
  purchase,
  items,
  loading,
  isOpen,
  onClose,
}) => {
  if (!purchase) return null;

  const totalAmount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Order: ${purchase.referenceNo || `#${purchase.id}`}`}
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Supplier</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {purchase.supplier?.name || "—"}
              </p>
            </div>
            <div className="bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Order Date</p>
              <p className="text-sm text-[var(--text-primary)]">
                {new Date(purchase.orderDate).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Status</p>
              <StatusBadge status={purchase.status} />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Items ({items.length})
            </h3>
            <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-[var(--table-header-bg)] sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                        {item.meat?.name || `Product #${item.meatId}`}
                        <span className="text-xs text-[var(--text-tertiary)] ml-2">
                          SKU: {item.meat?.sku}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-[var(--text-secondary)]">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-[var(--accent-gold)]">
                        ₱{new Decimal(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-[var(--accent-gold)]">
                        ₱{new Decimal(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[var(--table-header-bg)]">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-[var(--text-primary)]">
                      Total
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-[var(--accent-gold)]">
                      ₱{new Decimal(totalAmount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div className="bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Notes</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{purchase.notes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};