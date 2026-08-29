// src/renderer/pages/Cashier/components/LoyaltyRedemption.tsx
import React, { useState } from "react";
import { Gift, Sparkles } from "lucide-react";

interface LoyaltyRedemptionProps {
  selectedCustomer: boolean;
  loyaltyPointsAvailable: number;
  useLoyalty: boolean;
  loyaltyPointsToRedeem: number;
  maxRedeemable: number;
  onUseLoyaltyChange: (checked: boolean) => void;
  onPointsChange: (points: number) => void;
}

const LoyaltyRedemption: React.FC<LoyaltyRedemptionProps> = ({
  selectedCustomer,
  loyaltyPointsAvailable,
  useLoyalty,
  loyaltyPointsToRedeem,
  maxRedeemable,
  onUseLoyaltyChange,
  onPointsChange,
}) => {
  if (!selectedCustomer || loyaltyPointsAvailable <= 0) return null;

  const [isUseAll, setIsUseAll] = useState(false);

  const handleMax = () => {
    setIsUseAll(!isUseAll);
    onPointsChange(isUseAll ? 0 : maxRedeemable);
  };

  return (
    <div className="bg-[var(--card-secondary-bg)] rounded-xl p-3 border border-[var(--border-color)] space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-[var(--accent-purple)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Loyalty Points</span>
        </div>
        <span className="text-sm font-semibold text-[var(--accent-purple)]">
          {loyaltyPointsAvailable} available
        </span>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useLoyalty}
            onChange={(e) => onUseLoyaltyChange(e.target.checked)}
            className="rounded border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">Redeem points</span>
        </label>

        {useLoyalty && (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="number"
              min="0"
              max={maxRedeemable}
              value={loyaltyPointsToRedeem}
              onChange={(e) =>
                onPointsChange(
                  Math.min(maxRedeemable, parseFloat(e.target.value) || 0)
                )
              }
              className="w-20 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)]"
              placeholder="0"
            />
            <button
              onClick={handleMax}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isUseAll
                  ? "bg-[var(--accent-gold)] text-[var(--btn-primary-text)]"
                  : "bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-color)]"
              }`}
            >
              {isUseAll ? "Clear" : "Max"}
            </button>
          </div>
        )}
      </div>

      {useLoyalty && loyaltyPointsToRedeem > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
          <Sparkles className="w-3 h-3 text-[var(--accent-gold)]" />
          Redeeming {loyaltyPointsToRedeem} points
        </div>
      )}
    </div>
  );
};

export default React.memo(LoyaltyRedemption);