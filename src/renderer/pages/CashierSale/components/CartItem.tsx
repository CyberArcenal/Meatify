// src/renderer/pages/Cashier/components/CartItem.tsx
import React, { useMemo } from "react";
import { Trash2, Tag, Percent, Package, AlertCircle } from "lucide-react";
import Decimal from "decimal.js";
import type { CartItem as CartItemType } from "../types";
import { calculateLineTotal } from "../utils";
import { formatCurrency } from "../../../utils/formatters";
import BatchSelect from "../../../components/Selects/Batch";
import type { Batch } from "../../../api/core/batch";
import { useBatchCache } from "../hooks/useBatchCache";

interface CartItemProps {
  item: CartItemType;
  onUpdateWeight: (id: number, weightKg: number) => void;
  onRemove: (id: number) => void;
  onUpdateDiscount: (id: number, discount: number) => void;
  onUpdateTax: (id: number, tax: number) => void;
  onUpdateBatch: (
    id: number,
    batchId: number | null,
    batchCode: string | null,
    batchExpiryDate: string | null   // <-- pass expiry date
  ) => void;
  maxDiscount?: number;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateWeight,
  onRemove,
  onUpdateDiscount,
  onUpdateTax,
  onUpdateBatch,
  maxDiscount = 100,
}) => {
  const lineTotal = useMemo(() => calculateLineTotal(item), [item]);
  const { setBatchForMeat } = useBatchCache();

  // ✅ Check expiry by comparing expiryDate with today
  const isExpired = useMemo(() => {
    if (!item.batchExpiryDate) return false;
    return new Date(item.batchExpiryDate) < new Date();
  }, [item.batchExpiryDate]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    onUpdateWeight(item.id, val);
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    onUpdateDiscount(item.id, Math.min(maxDiscount, Math.max(0, val)));
  };

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    onUpdateTax(item.id, Math.min(100, Math.max(0, val)));
  };

  const handleBatchChange = (batchId: number | null, batch?: Batch) => {
    const newBatchId = batchId;
    const newBatchCode = batch?.batchCode || null;
    const newBatchExpiryDate = batch?.expiryDate || null; // <-- get expiry date
    onUpdateBatch(item.id, newBatchId, newBatchCode, newBatchExpiryDate);

    if (newBatchId !== null && newBatchCode !== null) {
      setBatchForMeat(item.id, newBatchId, newBatchCode);
    }
  };

  return (
    <div
      className={`
        bg-[var(--card-secondary-bg)] border rounded-xl p-3 
        transition-all duration-200 group
        ${isExpired 
          ? "border-red-500 bg-red-900/20 hover:border-red-400" 
          : "border-[var(--border-color)] hover:border-[var(--accent-gold)]"
        }
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={`
                font-semibold text-sm truncate transition-colors
                ${isExpired ? "text-red-400" : "text-[var(--text-primary)] group-hover:text-[var(--accent-gold)]"}
              `}
            >
              {item.name}
            </h4>
            {!item.batchId && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)] flex-shrink-0">
                No batch
              </span>
            )}
            {isExpired && (
              <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 flex-shrink-0">
                <AlertCircle className="w-3 h-3" />
                Expired
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-mono">{item.sku}</p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)] p-1 rounded-md hover:bg-[var(--status-cancelled-bg)] transition-colors flex-shrink-0 ml-2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Weight & total */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)] font-medium">Weight</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={item.weightKg}
            onChange={handleWeightChange}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)]"
          />
          <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">kg</span>
        </div>
        <div className="flex items-center justify-end">
          <span
            className={`text-sm font-bold ${isExpired ? "text-red-400" : "text-[var(--accent-gold)]"}`}
          >
            {formatCurrency(lineTotal.toFixed(2))}
          </span>
        </div>
      </div>

      {/* Batch select */}
      <div className="mt-2 flex items-center gap-2">
        <Package className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
        <BatchSelect
          meatId={item.id}
          statusFilter="active"
          value={item.batchId}
          onChange={handleBatchChange}
          className="flex-1"
          placeholder="Select batch..."
        />
        {item.batchCode && (
          <span
            className={`text-xs font-mono flex-shrink-0 ${
              isExpired ? "text-red-400" : "text-[var(--text-secondary)]"
            }`}
          >
            {item.batchCode}
          </span>
        )}
      </div>

      {/* Discount & Tax */}
      <div className="mt-2 flex gap-3 text-xs">
        <div className="flex items-center gap-1 bg-[var(--input-bg)] rounded-lg px-2 py-1 border border-[var(--border-color)]">
          <Tag className="w-3 h-3 text-[var(--accent-amber)]" />
          <input
            type="number"
            min="0"
            max={maxDiscount}
            value={item.lineDiscount}
            onChange={handleDiscountChange}
            className="w-14 bg-transparent text-[var(--text-primary)] focus:outline-none"
          />
          <span className="text-[var(--text-tertiary)]">%</span>
        </div>
        <div className="flex items-center gap-1 bg-[var(--input-bg)] rounded-lg px-2 py-1 border border-[var(--border-color)]">
          <Percent className="w-3 h-3 text-[var(--accent-blue)]" />
          <input
            type="number"
            min="0"
            max="100"
            value={item.lineTax}
            onChange={handleTaxChange}
            className="w-14 bg-transparent text-[var(--text-primary)] focus:outline-none"
          />
          <span className="text-[var(--text-tertiary)]">%</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CartItem);