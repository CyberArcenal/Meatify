// src/renderer/pages/inventory/meat/components/MeatSummaryCards.tsx
import React from "react";
import { Beef, Package, TrendingUp, Layers } from "lucide-react";

interface MeatSummaryCardsProps {
  totalActive: number;
  totalInactive: number;
  averagePrice: number;
  byCategory: Array<{ categoryId: number; categoryName: string; count: number }>;
}

const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;

const MeatSummaryCards: React.FC<MeatSummaryCardsProps> = ({
  totalActive,
  totalInactive,
  averagePrice,
  byCategory,
}) => {
  const topCategory = byCategory.length > 0
    ? byCategory.reduce((a, b) => (a.count > b.count ? a : b))
    : null;

  const cards = [
    {
      title: "Active Meats",
      value: totalActive,
      icon: Beef,
      color: "text-[var(--success-color)]",
      bg: "bg-[var(--status-completed-bg)]",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Inactive Meats",
      value: totalInactive,
      icon: Package,
      color: "text-[var(--text-tertiary)]",
      bg: "bg-[var(--status-cancelled-bg)]",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Avg. Price / kg",
      value: averagePrice,
      icon: TrendingUp,
      color: "text-[var(--accent-gold)]",
      bg: "bg-[var(--accent-gold-light)]",
      format: formatCurrency,
    },
    {
      title: "Top Category",
      value: topCategory ? `${topCategory.categoryName} (${topCategory.count})` : "—",
      icon: Layers,
      color: "text-[var(--accent-purple)]",
      bg: "bg-[var(--accent-purple-light)]",
      format: (v: string) => v,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                {card.title}
              </p>
              <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {card.format(card.value)}
              </p>
            </div>
            <div className={`p-2.5 rounded-full ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MeatSummaryCards;