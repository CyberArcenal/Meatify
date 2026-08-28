import React, { useState, useMemo, useCallback } from "react";
import { Package } from "lucide-react";
import Decimal from "decimal.js";
import type { Product } from "../types";
import { formatCurrency } from "../../../utils/formatters";
import { useStockAlertThreshold, useAllowNegativeStock } from "../../../utils/posUtils";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => {
  const stockAlertThreshold = useStockAlertThreshold();
  const allowNegativeStock = useAllowNegativeStock();
  const isDisabled = !allowNegativeStock && product.stockQty === 0;

  const stockStatusClass = useMemo(() => {
    if (product.stockQty === 0) return "text-[var(--stock-outstock)]";
    if (product.stockQty <= stockAlertThreshold) return "text-[var(--stock-lowstock)]";
    return "text-[var(--stock-instock)]";
  }, [product.stockQty, stockAlertThreshold]);

  const handleAdd = useCallback(() => {
    onAdd(product);
  }, [onAdd, product]);

  return (
    <button
      onClick={handleAdd}
      disabled={isDisabled}
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
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
      </div>
    </button>
  );
};

export default React.memo(ProductCard);