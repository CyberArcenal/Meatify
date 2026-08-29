// src/renderer/pages/Cashier/components/PaymentSuccessDialog.tsx
import React, { useState } from "react";
import { CheckCircle, X, Printer, Receipt } from "lucide-react";
import Decimal from "decimal.js";
import type { CartItem } from "../types";
import { formatCurrency } from "../../../utils/formatters";
import { useReceiptPrintingEnabled } from "../../../utils/posUtils";
import { hideLoading, showLoading } from "../../../utils/notification";
import { dialogs } from "../../../utils/dialogs";

interface PaymentSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
  total: Decimal;
  paidAmount?: number;
  change?: Decimal;
  paymentMethod: string;
  items: CartItem[];
}

const PaymentSuccessDialog: React.FC<PaymentSuccessDialogProps> = ({
  isOpen,
  onClose,
  saleId,
  total,
  paidAmount,
  change,
  paymentMethod,
  items,
}) => {
  const receiptPrintingEnabled = useReceiptPrintingEnabled();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const isCash = paymentMethod === "cash";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)] bg-gradient-to-r from-[var(--accent-gold-light)] to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[var(--status-completed-bg)]">
              <CheckCircle className="w-8 h-8 text-[var(--success-color)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Payment Successful!</h2>
              <p className="text-sm text-[var(--text-secondary)]">Transaction completed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] text-[var(--text-tertiary)] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Sale ID */}
          <div className="text-center">
            <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Sale Reference</div>
            <div className="text-3xl font-mono font-bold text-[var(--accent-gold)]">
              # {saleId.toString().padStart(6, "0")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center bg-[var(--card-secondary-bg)] rounded-xl p-4 border border-[var(--border-color)]">
              <div className="text-xs text-[var(--text-tertiary)] uppercase">Total</div>
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {formatCurrency(total.toFixed(2))}
              </div>
            </div>

            {isCash ? (
              <>
                <div className="text-center bg-[var(--card-secondary-bg)] rounded-xl p-4 border border-[var(--border-color)]">
                  <div className="text-xs text-[var(--text-tertiary)] uppercase">Amount Paid</div>
                  <div className="text-3xl font-bold text-[var(--success-color)]">
                    {formatCurrency((paidAmount || 0).toFixed(2))}
                  </div>
                </div>
                <div className="text-center col-span-2 bg-[var(--accent-gold-light)] rounded-xl p-5 border border-[var(--accent-gold)]/30">
                  <div className="text-xs text-[var(--text-tertiary)] uppercase">Change</div>
                  <div className="text-5xl font-bold text-[var(--accent-gold)]">
                    {formatCurrency(change?.toFixed(2) || "0.00")}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center col-span-2 bg-[var(--card-secondary-bg)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="text-xs text-[var(--text-tertiary)] uppercase">Payment Method</div>
                <div className="text-3xl font-bold text-[var(--accent-purple)] capitalize">
                  {paymentMethod}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-[var(--card-secondary-bg)] rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar border border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Items ({items.length})
            </p>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-[var(--border-color)] last:border-0">
                <span className="text-[var(--text-secondary)]">
                  {item.name} <span className="text-[var(--text-tertiary)]">×{item.weightKg.toFixed(2)}kg</span>
                </span>
                <span className="text-[var(--text-primary)] font-mono font-medium">
                  {formatCurrency(new Decimal(item.pricePerKg).times(item.weightKg).toFixed(2))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] transition-colors font-medium"
          >
            Close
          </button>
          {receiptPrintingEnabled && (
            <button
              onClick={async () => {
                try {
                  setIsLoading(true);
                  showLoading("Printing receipt...");
                  await window.backendAPI.printerPrint(saleId);
                  hideLoading();
                } catch (err) {
                  hideLoading();
                  await dialogs.error("Printer unavailable.", "Print Failed");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--accent-blue)] text-white font-semibold hover:bg-[var(--accent-blue-hover)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              {isLoading ? "Printing..." : "Print Receipt"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PaymentSuccessDialog);