// src/renderer/pages/Cashier/components/CheckoutDialog.tsx
import React, { useState, useEffect, useRef } from "react";
import { X, ShoppingBag, CreditCard, Wallet, Loader2, CheckCircle } from "lucide-react";
import Decimal from "decimal.js";
import type { CartItem } from "../types";
import { formatCurrency } from "../../../utils/formatters";

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paidAmount?: number) => void;
  total: Decimal;
  cartItems?: CartItem[];
  paymentMethod?: string;
  isProcessing?: boolean;
}

const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  total,
  cartItems = [],
  paymentMethod = "cash",
  isProcessing = false,
}) => {
  const [paidAmount, setPaidAmount] = useState<number | null>(total.toNumber());
  const [isConfirmEnabled, setIsConfirmEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPaidAmount(total.toNumber());
      setIsConfirmEnabled(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      const timer = setTimeout(() => setIsConfirmEnabled(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const paymentMethodLabel =
    { cash: "Cash", card: "Card", wallet: "E-Wallet" }[paymentMethod] || paymentMethod;
  const totalWeight = cartItems.reduce((sum, item) => sum + (item.weightKg || 0), 0);
  const isCash = paymentMethod === "cash";
  const numericPaid = paidAmount ?? 0;
  const isValid = !isCash || numericPaid >= total.toNumber();

  const handleConfirm = () => {
    if (isCash) onConfirm(numericPaid);
    else onConfirm();
  };

  const handlePaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") setPaidAmount(null);
    else {
      const num = parseFloat(value);
      setPaidAmount(isNaN(num) ? null : num);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--accent-gold-light)]">
              <ShoppingBag className="w-5 h-5 text-[var(--accent-gold)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Confirm Checkout</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] text-[var(--text-tertiary)] transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Total Amount */}
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              Total Amount
            </div>
            <div className="text-4xl font-bold text-[var(--accent-gold)]">
              {formatCurrency(total.toFixed(2))}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {totalWeight.toFixed(2)} kg • {paymentMethodLabel}
            </div>
          </div>

          {/* Payment icon */}
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-[var(--card-secondary-bg)] border border-[var(--border-color)]">
              {paymentMethod === "cash" && <Wallet className="w-8 h-8 text-[var(--payment-cash)]" />}
              {paymentMethod === "card" && <CreditCard className="w-8 h-8 text-[var(--payment-card)]" />}
              {paymentMethod === "wallet" && <Wallet className="w-8 h-8 text-[var(--payment-digital)]" />}
            </div>
          </div>

          {/* Amount Paid (cash only) */}
          {isCash && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Amount Paid
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] font-semibold">₱</span>
                <input
                  ref={inputRef}
                  type="number"
                  min={total.toNumber()}
                  step="0.01"
                  value={paidAmount === null ? "" : paidAmount}
                  onChange={handlePaidChange}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-8 py-3 text-2xl font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              {!isValid && (
                <p className="text-xs text-[var(--danger-color)]">
                  Amount must be at least {formatCurrency(total.toFixed(2))}
                </p>
              )}
            </div>
          )}

          {/* Item summary */}
          {cartItems.length > 0 && (
            <div className="bg-[var(--card-secondary-bg)] rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar border border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Items ({cartItems.length})
              </p>
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1 border-b border-[var(--border-color)] last:border-0">
                  <span className="text-[var(--text-secondary)] truncate max-w-[150px]">
                    {item.name} <span className="text-[var(--text-tertiary)]">×{item.weightKg.toFixed(2)}kg</span>
                  </span>
                  <span className="text-[var(--text-primary)] font-mono font-medium">
                    {formatCurrency(
                      new Decimal(item.pricePerKg || 0).times(item.weightKg || 0).toFixed(2)
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !isValid || !isConfirmEnabled}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] text-[var(--btn-primary-text)] font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : !isConfirmEnabled ? (
              "Please wait..."
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirm Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CheckoutDialog);