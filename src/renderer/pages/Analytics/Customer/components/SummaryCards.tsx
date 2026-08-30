// src/renderer/pages/Analytics/Customer/components/SummaryCards.tsx
import React from 'react';
import { Users, Award, TrendingUp, UserPlus } from 'lucide-react';
import type { CustomerSummary } from '../hooks/useCustomerInsights';

interface Props {
  summary: CustomerSummary;
  isLoading?: boolean;
}

const SummaryCards: React.FC<Props> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Customers',
      value: summary.totalCustomers.toLocaleString(),
      icon: Users,
      color: 'text-[var(--accent-blue)]',
      bg: 'bg-[var(--accent-blue-light)]',
    },
    {
      title: 'Active Customers',
      value: summary.activeCustomers.toLocaleString(),
      icon: TrendingUp,
      color: 'text-[var(--success-color)]',
      bg: 'bg-[var(--status-completed-bg)]',
    },
    {
      title: 'Avg Loyalty Points',
      value: summary.averageLoyaltyPoints.toFixed(1),
      icon: Award,
      color: 'text-[var(--accent-gold)]',
      bg: 'bg-[var(--accent-gold-light)]',
    },
    {
      title: 'New This Month',
      value: summary.newCustomersThisMonth.toLocaleString(),
      icon: UserPlus,
      color: 'text-[var(--accent-purple)]',
      bg: 'bg-[var(--accent-purple-light)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {card.value}
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