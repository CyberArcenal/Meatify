// src/renderer/pages/Analytics/InventoryReports/components/SummaryCards.tsx
import React from 'react';
import { Package, Layers, DollarSign, AlertTriangle, XCircle } from 'lucide-react';
import type { InventorySummary } from '../../../../api/analytics/inventoryReports';

interface Props {
  summary: InventorySummary | null;
  loading: boolean;
}

const SummaryCards: React.FC<Props> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: 'Total Meats',
      value: summary.totalMeats,
      icon: Package,
      color: 'text-[var(--accent-blue)]',
      bg: 'bg-[var(--accent-blue-light)]',
    },
    {
      title: 'Total Stock',
      value: summary.totalStock.toFixed(1),
      icon: Layers,
      color: 'text-[var(--accent-green)]',
      bg: 'bg-[var(--status-completed-bg)]',
      suffix: ' kg',
    },
    {
      title: 'Total Value',
      value: summary.totalValue,
      icon: DollarSign,
      color: 'text-[var(--accent-gold)]',
      bg: 'bg-[var(--accent-gold-light)]',
      format: (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val),
    },
    {
      title: 'Low Stock',
      value: summary.lowStockCount,
      icon: AlertTriangle,
      color: 'text-[var(--accent-amber)]',
      bg: 'bg-[var(--accent-amber-light)]',
    },
    {
      title: 'Out of Stock',
      value: summary.outOfStockCount,
      icon: XCircle,
      color: 'text-[var(--danger-color)]',
      bg: 'bg-[var(--status-cancelled-bg)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:shadow-md hover:border-[var(--accent-gold)] transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {card.format ? card.format(card.value) : card.value + (card.suffix || '')}
                </p>
              </div>
              <div className={`p-2.5 rounded-full ${card.bg} group-hover:ring-2 group-hover:ring-[var(--accent-gold)]/30 transition-all`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;