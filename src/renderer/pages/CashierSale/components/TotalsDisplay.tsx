// src/renderer/pages/Cashier/components/TotalsDisplay.tsx
import React, { useMemo } from "react";
import Decimal from "decimal.js";
import { formatCurrency } from "../../../utils/formatters";
import { Minus, Plus, Gift } from "lucide-react";

interface TotalsDisplayProps {
  subtotal: Decimal;
  globalDiscount: number;
  globalTax: number;
  useLoyalty: boolean;
  loyaltyPointsToRedeem: number;
  total: Decimal;
}

const TotalsDisplay: React.FC<TotalsDisplayProps> = ({
  subtotal,
  globalDiscount,
  globalTax,
  useLoyalty,
  loyaltyPointsToRedeem,
  total,
}) => {
  const discountAmount = useMemo(
    () => (globalDiscount > 0 ? subtotal.times(globalDiscount / 100) : null),
    [subtotal, globalDiscount]
  );
  const taxAmount = useMemo(
    () => (globalTax > 0 ? subtotal.times(globalTax / 100) : null),
    [subtotal, globalTax]
  );

  return (
    <div className="space-y-1.5 bg-[var(--card-bg)] rounded-xl p-3 border border-[var(--border-color)]">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-tertiary)]">Subtotal</span>
        <span className="text-[var(--text-primary)] font-medium">{formatCurrency(subtotal.toFixed(2))}</span>
      </div>

      {globalDiscount > 0 && discountAmount && (
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-tertiary)] flex items-center gap-1">
            <Minus className="w-3 h-3 text-[var(--accent-amber)]" />
            Discount ({globalDiscount}%)
          </span>
          <span className="text-[var(--accent-amber)] font-medium">-{formatCurrency(discountAmount.toFixed(2))}</span>
        </div>
      )}

      {globalTax > 0 && taxAmount && (
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-tertiary)] flex items-center gap-1">
            <Plus className="w-3 h-3 text-[var(--accent-blue)]" />
            Tax ({globalTax}%)
          </span>
          <span className="text-[var(--accent-blue)] font-medium">+{formatCurrency(taxAmount.toFixed(2))}</span>
        </div>
      )}

      {useLoyalty && loyaltyPointsToRedeem > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-tertiary)] flex items-center gap-1">
            <Gift className="w-3 h-3 text-[var(--accent-purple)]" />
            Loyalty redemption
          </span>
          <span className="text-[var(--accent-purple)] font-medium">-{formatCurrency(loyaltyPointsToRedeem.toFixed(2))}</span>
        </div>
      )}

      <div className="flex justify-between text-base font-bold pt-2 border-t border-[var(--border-color)]">
        <span className="text-[var(--text-primary)]">Total</span>
        <span className="text-[var(--accent-gold)] text-lg">{formatCurrency(total.toFixed(2))}</span>
      </div>
    </div>
  );
};

export default React.memo(TotalsDisplay);