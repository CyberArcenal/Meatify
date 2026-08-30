// src/renderer/pages/Cashier/components/ProductCard.tsx
import React, { useMemo, useCallback, useState, useRef } from "react";
import { Package, Loader2, Beef, Tag } from "lucide-react";
import Decimal from "decimal.js";
import type { Product } from "../types";
import { formatCurrency } from "../../../utils/formatters";
import { useStockAlertThreshold, useAllowNegativeStock } from "../../../utils/posUtils";
import { useBatchCache } from "../hooks/useBatchCache";
import { useBatchAutoSelect } from "../hooks/useBatchAutoSelect";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product, batchId: number | null, batchCode: string | null) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => {
  const stockAlertThreshold = useStockAlertThreshold();
  const allowNegativeStock = useAllowNegativeStock();
  const { getBestBatch } = useBatchAutoSelect();
  const { getBatchForMeat } = useBatchCache();
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = useRef(false); // ✅ Para maiwasan ang double-click

  const isDisabled = !allowNegativeStock && product.stockQty === 0;

  const stockStatus = useMemo(() => {
    if (product.stockQty === 0) return { label: "Out of Stock", color: "var(--danger-color)", bg: "var(--status-cancelled-bg)" };
    if (product.stockQty <= stockAlertThreshold) return { label: "Low Stock", color: "var(--warning-color)", bg: "var(--status-pending-bg)" };
    return { label: "In Stock", color: "var(--success-color)", bg: "var(--status-completed-bg)" };
  }, [product.stockQty, stockAlertThreshold]);

  const handleAdd = useCallback(async () => {
    // ✅ Agad na tignan ang ref para hindi na magpatuloy kung may ongoing na add
    if (isAddingRef.current || isDisabled) return;

    isAddingRef.current = true;
    setIsAdding(true);

    try {
      const cached = getBatchForMeat(product.id);
      if (cached) {
        onAdd(product, cached.batchId, cached.batchCode);
        return;
      }

      const batch = await getBestBatch(product.id);
      if (batch) {
        onAdd(product, batch.id, batch.batchCode);
      } else {
        onAdd(product, null, null);
      }
    } catch (error) {
      console.error("Failed to get batch for product:", error);
      onAdd(product, null, null);
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  }, [product, getBestBatch, getBatchForMeat, onAdd, isDisabled]);

  return (
    <button
      onClick={handleAdd}
      disabled={isDisabled || isAdding}
      className={`
        group relative rounded-xl overflow-hidden transition-all duration-200
        bg-[var(--card-bg)] border border-[var(--border-color)]
        hover:border-[var(--accent-gold)] hover:shadow-lg hover:-translate-y-1
        ${isDisabled || isAdding ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="p-4 flex flex-col items-center text-center min-h-[200px] relative">
        {/* Stock status badge */}
        <div className="absolute top-2 right-2">
          <span
            className="text-[9px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: stockStatus.bg, color: stockStatus.color }}
          >
            {stockStatus.label}
          </span>
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-[var(--card-secondary-bg)] flex items-center justify-center mb-3 group-hover:bg-[var(--accent-gold-light)] transition-colors border border-[var(--border-color)] group-hover:border-[var(--accent-gold)]">
          <Beef className="w-7 h-7 text-[var(--accent-gold)]" />
        </div>

        {/* Name */}
        <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 min-h-[2.5rem] group-hover:text-[var(--accent-gold)] transition-colors">
          {product.name}
        </h3>

        {/* SKU */}
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 font-mono">{product.sku}</p>

        {/* Price */}
        <p className="text-xl font-bold text-[var(--accent-gold)] mt-2">
          {formatCurrency(new Decimal(product.pricePerKg).toFixed(2))}
        </p>
        <p className="text-[10px] text-[var(--text-tertiary)] -mt-0.5">per kg</p>

        {/* Stock */}
        <p className="text-xs mt-1.5 font-medium" style={{ color: stockStatus.color }}>
          {product.stockQty.toFixed(2)} kg available
        </p>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-gold)]/0 to-[var(--accent-gold)]/0 group-hover:from-[var(--accent-gold)]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none rounded-xl" />

        {/* Loading overlay */}
        {isAdding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
              <span className="text-xs text-white font-medium">Adding...</span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default React.memo(ProductCard);