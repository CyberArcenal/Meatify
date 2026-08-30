// src/renderer/pages/Analytics/DailySales/components/SalesChart.tsx
import React from 'react';
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
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  data: Array<{ date: string; total: number; count: number }>;
  loading: boolean;
}

const SalesChart: React.FC<Props> = ({ data, loading }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(val);

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-80 flex items-center justify-center animate-pulse">
        <div className="text-[var(--text-secondary)]">Loading chart...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-80 flex items-center justify-center">
        <div className="text-[var(--text-tertiary)]">No data available for chart.</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Total Sales (₱)',
        data: data.map(item => item.total),
        borderColor: '#d4af37',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
        pointRadius: 4,
        pointBackgroundColor: '#d4af37',
      },
      {
        label: 'Transaction Count',
        data: data.map(item => item.count),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 3,
        pointBackgroundColor: '#3b82f6',
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
            if (context.dataset.label?.includes('₱')) {
              label += formatCurrency(context.parsed.y);
            } else {
              label += context.parsed.y;
            }
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
        type: 'linear' as const,
        position: 'left' as const,
        grid: { color: 'var(--border-light)' },
        ticks: {
          color: 'var(--text-secondary)',
          callback: (value: any) => `₱${value.toLocaleString()}`,
        },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: {
          color: 'var(--text-secondary)',
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent-gold)]">📈</span>
          Sales Trend
        </h3>
        <span className="text-sm text-[var(--text-tertiary)]">
          {data.length} days
        </span>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SalesChart;