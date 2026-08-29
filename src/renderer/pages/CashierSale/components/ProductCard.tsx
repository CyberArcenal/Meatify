// src/renderer/pages/Cashier/components/ProductCard.tsx
import React, { useMemo, useCallback, useState } from "react";
import { Package, Loader2 } from "lucide-react";
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

  const isDisabled = !allowNegativeStock && product.stockQty === 0;

  const stockStatusClass = useMemo(() => {
    if (product.stockQty === 0) return "text-[var(--stock-outstock)]";
    if (product.stockQty <= stockAlertThreshold) return "text-[var(--stock-lowstock)]";
    return "text-[var(--stock-instock)]";
  }, [product.stockQty, stockAlertThreshold]);

const handleAdd = useCallback(async () => {
  if (isAdding || isDisabled) return;

  setIsAdding(true);
  try {
    const cached = getBatchForMeat(product.id);
    console.log("[ProductCard] Cached batch for meat", product.id, cached); // ✅

    if (cached) {
      onAdd(product, cached.batchId, cached.batchCode);
      setIsAdding(false);
      return;
    }

    const batch = await getBestBatch(product.id);
    console.log("[ProductCard] Best batch for meat", product.id, batch); // ✅
    if (batch) {
      onAdd(product, batch.id, batch.batchCode);
    } else {
      onAdd(product, null, null);
      console.warn(`No active batch for ${product.name}`);
    }
  } catch (error) {
    console.error("Failed to get batch for product:", error);
    onAdd(product, null, null);
  } finally {
    setIsAdding(false);
  }
}, [product, getBestBatch, getBatchForMeat, onAdd, isAdding, isDisabled]);

  return (
    <button
      onClick={handleAdd}
      disabled={isDisabled || isAdding}
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        isDisabled || isAdding ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--product-card-bg)] to-[var(--card-bg)] border border-[var(--product-card-border)]" />
      <div className="relative z-10 p-4 flex flex-col items-center text-center min-h-[200px]">
        <Package className="w-10 h-10 text-[var(--accent-blue)] mb-2" />
        <h3 className="font-medium text-sm text-[var(--text-primary)] line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{product.sku}</p>
        <p className="text-lg font-bold text-[var(--accent-green)] mt-2">
          {formatCurrency(new Decimal(product.pricePerKg).toFixed(2))}
        </p>
        <p className={`text-xs mt-1 font-medium ${stockStatusClass}`}>
          Stock: {product.stockQty} kg
        </p>
        {isAdding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>
    </button>
  );
};

export default React.memo(ProductCard);