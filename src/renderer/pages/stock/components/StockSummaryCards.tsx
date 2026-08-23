// src/renderer/pages/inventory/stock/components/StockSummaryCards.tsx
import React from "react";
import { Beef, DollarSign, AlertTriangle, XCircle } from "lucide-react";
import type { StockMeat } from "../hooks/useStockLevels";
import Decimal from "decimal.js";

interface StockSummaryCardsProps {
  meats: StockMeat[];
}

export const StockSummaryCards: React.FC<StockSummaryCardsProps> = ({ meats }) => {
  const totalMeats = meats.length;
  const totalStockValue = meats.reduce(
    (sum, m) => sum + m.currentStock * m.pricePerKg,
    0
  );
  const lowStockCount = meats.filter(
    (m) => m.currentStock > 0 && m.currentStock <= m.reorderLevel
  ).length;
  const outOfStockCount = meats.filter((m) => m.currentStock === 0).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Total Meats</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {totalMeats}
            </p>
          </div>
          <Beef className="w-8 h-8 text-[var(--accent-gold)] opacity-70" />
        </div>
      </div>

      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Stock Value</p>
            <p className="text-2xl font-bold text-[var(--accent-gold)]">
              ₱{new Decimal(totalStockValue).toFixed(2)}
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-[var(--accent-gold)] opacity-70" />
        </div>
      </div>

      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Low Stock</p>
            <p className="text-2xl font-bold text-[var(--status-pending)]">
              {lowStockCount}
            </p>
          </div>
          <AlertTriangle className="w-8 h-8 text-[var(--status-pending)] opacity-70" />
        </div>
      </div>

      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Out of Stock</p>
            <p className="text-2xl font-bold text-[var(--status-cancelled)]">
              {outOfStockCount}
            </p>
          </div>
          <XCircle className="w-8 h-8 text-[var(--status-cancelled)] opacity-70" />
        </div>
      </div>
    </div>
  );
};