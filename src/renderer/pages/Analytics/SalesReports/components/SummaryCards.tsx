// src/renderer/pages/Analytics/SalesReports/components/SummaryCards.tsx
import React from 'react';
import { ShoppingBag, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import type { SalesReportSummaryData } from '../../../../api/analytics/salesReport';

interface Props {
  summary: SalesReportSummaryData | null;
  loading: boolean;
}

const SummaryCards: React.FC<Props> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: 'Total Transactions',
      value: summary.summary.totalTransactions,
      icon: ShoppingBag,
      color: 'text-[var(--accent-blue)]',
      bg: 'bg-[var(--accent-blue-light)]',
    },
    {
      title: 'Total Revenue',
      value: summary.summary.totalRevenue,
      icon: DollarSign,
      color: 'text-[var(--success-color)]',
      bg: 'bg-[var(--status-completed-bg)]',
      format: (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val),
    },
    {
      title: 'Average Ticket',
      value: summary.summary.averageTicket,
      icon: Receipt,
      color: 'text-[var(--accent-purple)]',
      bg: 'bg-[var(--accent-purple-light)]',
      format: (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val),
    },
    {
      title: 'Total Weight',
      value: summary.summary.totalWeight,
      icon: TrendingUp,
      color: 'text-[var(--accent-amber)]',
      bg: 'bg-[var(--accent-amber-light)]',
      format: (val: number) => `${val.toFixed(2)} kg`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
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
                {card.format ? card.format(card.value) : card.value}
              </p>
            </div>
            <div className={`p-2.5 rounded-full ${card.bg} group-hover:ring-2 group-hover:ring-[var(--accent-gold)]/30 transition-all`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;