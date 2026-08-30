// src/renderer/pages/Analytics/FinancialReports/components/RevenueBreakdown.tsx
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: Array<{ name: string; amount: number; count: number }>;
  groupBy: string;
  loading: boolean;
}

const RevenueBreakdown: React.FC<Props> = ({ data, groupBy, loading }) => {
  const formatCurrency = (val: number | string) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(val));

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-80 flex items-center justify-center animate-pulse">
        <div className="text-[var(--text-secondary)]">Loading revenue breakdown...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-80 flex items-center justify-center">
        <div className="text-[var(--text-tertiary)]">No revenue data available.</div>
      </div>
    );
  }

  const chartColors = [
    '#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899',
    '#06b6d4', '#eab308', '#84cc16', '#6366f1', '#14b8a6',
  ];

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        data: data.map(item => item.amount),
        backgroundColor: chartColors.slice(0, data.length),
        borderColor: 'var(--card-bg)',
        borderWidth: 2,
      },
    ],
  };

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent-gold)]">📊</span>
          Revenue by {groupBy === 'paymentMethod' ? 'Payment Method' : 'Product'}
        </h3>
        <span className="text-sm text-[var(--text-tertiary)]">
          Total: {formatCurrency(totalAmount)}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex items-center justify-center md:w-1/2">
          <div className="w-full max-w-xs">
            <Pie
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: 'var(--text-primary)',
                      font: { size: 11 },
                      padding: 10,
                    },
                  },
                  tooltip: {
                    backgroundColor: 'var(--card-bg)',
                    titleColor: 'var(--text-primary)',
                    bodyColor: 'var(--text-secondary)',
                    borderColor: 'var(--border-color)',
                    borderWidth: 1,
                    callbacks: {
                      label: (context: any) => {
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Name</th>
                <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Amount</th>
                <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">%</th>
                <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {data.map((item, idx) => {
                const percentage = totalAmount > 0 ? ((item.amount / totalAmount) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-[var(--table-row-hover)] transition-colors">
                    <td className="py-2 px-3 text-[var(--text-primary)]">{item.name}</td>
                    <td className="py-2 px-3 text-right text-[var(--accent-gold)] font-medium">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                      {percentage.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                      {item.count || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueBreakdown;