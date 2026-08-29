// src/renderer/pages/Cashier/components/CartItem.tsx
import React, { useCallback, useMemo } from "react";
import { Trash2, Tag, Percent } from "lucide-react";
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
  onUpdateBatch: (id: number, batchId: number | null, batchCode: string | null) => void;
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
  console.log("[CartItem] Batch changed for meat", item.id, "to", batchId, batch); // ✅
  const newBatchId = batchId;
  const newBatchCode = batch?.batchCode || null;
  onUpdateBatch(item.id, newBatchId, newBatchCode);

  if (newBatchId !== null && newBatchCode !== null) {
    setBatchForMeat(item.id, newBatchId, newBatchCode);
  }
};

  const hasBatch = item.batchId !== null && item.batchId !== undefined;

  return (
    <div className="relative bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-3 hover:border-[var(--accent-blue)] transition-colors overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-medium text-[var(--text-primary)]">{item.name}</h4>
            <p className="text-xs text-[var(--text-tertiary)]">{item.sku}</p>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="text-[var(--text-tertiary)] hover:text-[var(--accent-red)] p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">Weight</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.weightKg}
              onChange={handleWeightChange}
              className="w-20 bg-[var(--input-bg)]/80 border border-[var(--input-border)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-tertiary)]">kg</span>
          </div>
          <span className="font-bold text-[var(--accent-green)]">
            {formatCurrency(lineTotal.toFixed(2))}
          </span>
        </div>

        {/* Batch Select + indicator */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)]">Batch:</span>
          <BatchSelect
            meatId={item.id}
            statusFilter="active"
            value={item.batchId}
            onChange={handleBatchChange}
            className="w-48"
            placeholder="Select batch"
          />
          {item.batchCode && (
            <span className="text-xs text-[var(--text-secondary)]">{item.batchCode}</span>
          )}
          {!hasBatch && (
            <span className="text-xs text-[var(--accent-red)]">⚠️ No batch selected</span>
          )}
        </div>

        <div className="mt-2 flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-[var(--accent-amber)]" />
            <input
              type="number"
              min="0"
              max={maxDiscount}
              value={item.lineDiscount}
              onChange={handleDiscountChange}
              className="w-16 bg-[var(--input-bg)]/80 border border-[var(--input-border)] rounded px-1 py-0.5 text-[var(--text-primary)]"
            />
            <span className="text-[var(--text-tertiary)]">%</span>
          </div>
          <div className="flex items-center gap-1">
            <Percent className="w-3 h-3 text-[var(--accent-blue)]" />
            <input
              type="number"
              min="0"
              max="100"
              value={item.lineTax}
              onChange={handleTaxChange}
              className="w-16 bg-[var(--input-bg)]/80 border border-[var(--input-border)] rounded px-1 py-0.5 text-[var(--text-primary)]"
            />
            <span className="text-[var(--text-tertiary)]">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CartItem);