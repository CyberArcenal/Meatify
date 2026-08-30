// src/renderer/pages/Analytics/FinancialReports/components/SummaryCards.tsx
import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Receipt } from 'lucide-react';

interface SummaryData {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  totalTransactions: number;
  averageTransaction: number;
  totalDiscounts: number;
}

interface Props {
  summary: SummaryData | null;
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  // ✅ Safe number formatter – i-handle ang non-number values
  const safeFormatNumber = (val: any, formatter: (v: number) => string): string => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '0.00' : formatter(num);
  };

  // ✅ Safe toFixed handler
  const safeToFixed = (val: any, decimals: number = 2): string => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '0.00' : num.toFixed(decimals);
  };

  const cards = [
    {
      title: 'Total Revenue',
      value: summary.totalRevenue,
      icon: DollarSign,
      color: 'text-[var(--accent-green)]',
      bg: 'bg-[var(--status-completed-bg)]',
      format: (val: any) => safeFormatNumber(val, formatCurrency),
    },
    {
      title: 'Net Revenue',
      value: summary.netRevenue,
      icon: TrendingUp,
      color: 'text-[var(--accent-blue)]',
      bg: 'bg-[var(--accent-blue-light)]',
      format: (val: any) => safeFormatNumber(val, formatCurrency),
    },
    {
      title: 'Gross Profit',
      value: summary.grossProfit,
      icon: TrendingUp,
      color: 'text-[var(--accent-gold)]',
      bg: 'bg-[var(--accent-gold-light)]',
      format: (val: any) => safeFormatNumber(val, formatCurrency),
    },
    {
      title: 'Profit Margin',
      value: summary.profitMargin,
      icon: Percent,
      color: 'text-[var(--accent-purple)]',
      bg: 'bg-[var(--accent-purple-light)]',
      // ✅ FIX: gumamit ng safeToFixed
      format: (val: any) => `${safeToFixed(val, 2)}%`,
    },
    {
      title: 'Refunds',
      value: summary.totalRefunds,
      icon: TrendingDown,
      color: 'text-[var(--accent-amber)]',
      bg: 'bg-[var(--accent-amber-light)]',
      format: (val: any) => safeFormatNumber(val, formatCurrency),
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
                  {card.format(card.value)}
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