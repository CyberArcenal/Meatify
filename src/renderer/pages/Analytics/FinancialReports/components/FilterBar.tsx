// src/renderer/pages/Analytics/FinancialReports/components/FilterBar.tsx
import React from 'react';
import { Filter, X } from 'lucide-react';

interface Props {
  startDate: string;
  endDate: string;
  revenueGroupBy: 'paymentMethod' | 'product';
  profitGroupBy: 'day' | 'week' | 'month';
  hasFilters: boolean;
  onFilterChange: (filters: any) => void;
  onReset: () => void;
}

const FilterBar: React.FC<Props> = ({
  startDate,
  endDate,
  revenueGroupBy,
  profitGroupBy,
  hasFilters,
  onFilterChange,
  onReset,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({
      startDate: name === 'startDate' ? value : startDate,
      endDate: name === 'endDate' ? value : endDate,
      revenueGroupBy: name === 'revenueGroupBy' ? value : revenueGroupBy,
      profitGroupBy: name === 'profitGroupBy' ? value : profitGroupBy,
    });
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Filters</h3>
          {hasFilters && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[var(--accent-gold-light)] text-[var(--accent-gold)]">
              Active
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={startDate}
            onChange={handleChange}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
          <input
            type="date"
            name="endDate"
            value={endDate}
            onChange={handleChange}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Revenue Group By</label>
          <select
            name="revenueGroupBy"
            value={revenueGroupBy}
            onChange={handleChange}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          >
            <option value="paymentMethod">Payment Method</option>
            <option value="product">Product</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Profit/Loss Group By</label>
          <select
            name="profitGroupBy"
            value={profitGroupBy}
            onChange={handleChange}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;