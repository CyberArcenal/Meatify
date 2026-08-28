import React from 'react';
import { Package, Layers, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import type { BatchStatistics } from '../../../api/core/batch';

interface Props {
  statistics: BatchStatistics | null;
  loading: boolean;
}

const SummaryCards: React.FC<Props> = ({ statistics, loading }) => {
  const colorClasses = {
    blue: 'bg-[var(--accent-blue-light)] text-[var(--accent-blue)] border-[var(--accent-blue)]/20',
    green: 'bg-[var(--accent-green-light)] text-[var(--accent-green)] border-[var(--accent-green)]/20',
    amber: 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)] border-[var(--accent-amber)]/20',
    red: 'bg-[var(--danger-bg)] text-[var(--danger-color)] border-[var(--danger-color)]/20',
  };

  if (loading || !statistics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse">
            <div className="h-4 bg-[var(--border-color)] rounded w-24 mb-2" />
            <div className="h-6 bg-[var(--border-color)] rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Batches',
      value: Object.values(statistics.byStatus).reduce((a, b) => a + b, 0),
      icon: Package,
      color: 'blue',
    },
    {
      title: 'Active',
      value: statistics.byStatus.active || 0,
      icon: CheckCircle,
      color: 'green',
    },
    {
      title: 'Depleted',
      value: statistics.byStatus.depleted || 0,
      icon: Layers,
      color: 'blue',
    },
    {
      title: 'Expired',
      value: statistics.byStatus.expired || 0,
      icon: XCircle,
      color: 'red',
    },
    {
      title: 'Expiring Soon',
      value: statistics.expiringSoon,
      icon: AlertTriangle,
      color: 'amber',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-xl p-5 border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
            colorClasses[card.color as keyof typeof colorClasses]
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{card.title}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
            <div className="p-2 rounded-lg bg-black/10">
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;