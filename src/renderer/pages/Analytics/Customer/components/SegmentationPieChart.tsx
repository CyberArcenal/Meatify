// src/renderer/pages/Analytics/Customer/components/SegmentationPieChart.tsx
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PieChart } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface CustomerSegmentation {
  highValue: number;
  mediumValue: number;
  lowValue: number;
  inactive: number;
}

interface Props {
  segmentation: CustomerSegmentation | null;
  isLoading?: boolean;
}

// ✅ Meatify theme colors (hex)
const COLORS = {
  highValue: '#22c55e',   // green
  mediumValue: '#3b82f6', // blue
  lowValue: '#f97316',    // amber/orange
  inactive: '#64748b',    // slate gray
};

const SegmentationPieChart: React.FC<Props> = ({ segmentation, isLoading }) => {
  // ─── Loading skeleton ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 h-full animate-pulse">
        <div className="h-6 w-40 bg-[var(--card-secondary-bg)] rounded mb-4" />
        <div className="flex items-center justify-center h-64">
          <div className="w-48 h-48 rounded-full bg-[var(--card-secondary-bg)]" />
        </div>
      </div>
    );
  }

  // ─── No data state ────────────────────────────────────────────
  if (!segmentation) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Customer Segmentation</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)]">
          No segmentation data available
        </div>
      </div>
    );
  }

  const total = segmentation.highValue + segmentation.mediumValue + segmentation.lowValue + segmentation.inactive;

  // ─── All zeros ────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Customer Segmentation</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)]">
          No customers to segment
        </div>
      </div>
    );
  }

  // ─── Chart data ──────────────────────────────────────────────
  const data = {
    labels: ['High Value', 'Medium Value', 'Low Value', 'Inactive'],
    datasets: [
      {
        data: [
          segmentation.highValue,
          segmentation.mediumValue,
          segmentation.lowValue,
          segmentation.inactive,
        ],
        backgroundColor: [
          COLORS.highValue,
          COLORS.mediumValue,
          COLORS.lowValue,
          COLORS.inactive,
        ],
        borderColor: 'var(--card-bg)',
        borderWidth: 3,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'var(--text-primary)',
          font: { size: 11 },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
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
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-[var(--accent-gold)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Customer Segmentation</h3>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-xs">
          <Pie data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

export default SegmentationPieChart;