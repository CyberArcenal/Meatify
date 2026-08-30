// src/renderer/pages/Analytics/FinancialReports/components/ProfitLossChart.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  data: Array<{
    period: string;
    revenue: number;
    refunds: number;
    netRevenue: number;
    transactions: number;
    discounts: number;
    costOfGoods: number;
    profit: number;
  }>;
  groupBy: string;
  loading: boolean;
}

const ProfitLossChart: React.FC<Props> = ({ data, groupBy, loading }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-80 flex items-center justify-center animate-pulse">
        <div className="text-[var(--text-secondary)]">Loading profit/loss chart...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-80 flex items-center justify-center">
        <div className="text-[var(--text-tertiary)]">No profit/loss data available.</div>
      </div>
    );
  }

  const labels = data.map(item => {
    if (groupBy === 'day') return new Date(item.period).toLocaleDateString();
    if (groupBy === 'week') return `Week ${item.period}`;
    return item.period; // month: "2025-12"
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: data.map(item => item.revenue),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#22c55e',
      },
      {
        label: 'Net Revenue',
        data: data.map(item => item.netRevenue),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#3b82f6',
      },
      {
        label: 'Refunds',
        data: data.map(item => item.refunds),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#f97316',
        borderDash: [5, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-primary)',
          font: { size: 12 },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'var(--card-bg)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-secondary)',
        borderColor: 'var(--border-color)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'var(--border-light)' },
        ticks: {
          color: 'var(--text-secondary)',
          maxRotation: 45,
          font: { size: 10 },
        },
      },
      y: {
        grid: { color: 'var(--border-light)' },
        ticks: {
          color: 'var(--text-secondary)',
          callback: (value: any) => `₱${value.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent-gold)]">📈</span>
          Profit & Loss Over Time
        </h3>
        <span className="text-sm text-[var(--text-tertiary)]">
          Grouped by {groupBy}
        </span>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ProfitLossChart;