// src/renderer/pages/Analytics/DailySales/components/SummaryCards.tsx
import React from "react";
import { DollarSign, Calendar, TrendingUp, ShoppingBag } from "lucide-react";

interface Stats {
  totalRevenue: number;
  totalSales: number;
  averageDailySales: number;
  bestDay: { date: string; total: number } | null;
}

interface Props {
  stats: Stats | null;
  loading: boolean;
}

const SummaryCards: React.FC<Props> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(val);

  const cards = [
    {
      title: "Total Revenue",
      value: stats.totalRevenue,
      icon: DollarSign,
      color: "text-[var(--accent-gold)]",
      bg: "bg-[var(--accent-gold-light)]",
      format: formatCurrency,
    },
    {
      title: "Total Sales",
      value: stats.totalSales,
      icon: ShoppingBag,
      color: "text-[var(--accent-blue)]",
      bg: "bg-[var(--accent-blue-light)]",
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: "Average Daily Sales",
      value: stats.averageDailySales,
      icon: TrendingUp,
      color: "text-[var(--accent-green)]",
      bg: "bg-[var(--status-completed-bg)]",
      format: formatCurrency,
    },
    {
      title: "Best Day",
      value: stats.bestDay
        ? `${new Date(stats.bestDay.date).toLocaleDateString()} (${formatCurrency(stats.bestDay.total)})`
        : "N/A",
      icon: Calendar,
      color: "text-[var(--accent-purple)]",
      bg: "bg-[var(--accent-purple-light)]",
      format: (val: string | number) => val,
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