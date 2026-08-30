// src/renderer/pages/Analytics/Customer/components/CustomerTable.tsx
import React from 'react';
import { Search, ChevronLeft, ChevronRight, X, Users } from 'lucide-react';
import type { CustomerInsight } from '../../../../api/analytics/customerInsights';

interface Props {
  customers: CustomerInsight[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: any) => void;
  filters?: {
    search: string;
    minPoints: number | undefined;
    maxPoints: number | undefined;
    hasLoyaltyPoints: boolean;
  };
}

// ✅ Default values para sa filters kung hindi naipasa
const defaultFilters = {
  search: '',
  minPoints: undefined,
  maxPoints: undefined,
  hasLoyaltyPoints: false,
};

const CustomerTable: React.FC<Props> = ({
  customers,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onFilterChange,
  filters = defaultFilters, // ✅ Fallback default
}) => {
  // ✅ Safe guard: kung walang filters, gamitin ang default
  const safeFilters = filters || defaultFilters;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value === '' ? undefined : Number(value);
    onFilterChange({ [name]: val });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      minPoints: undefined,
      maxPoints: undefined,
      hasLoyaltyPoints: false,
    });
  };

  const hasActiveFilters =
    safeFilters.search ||
    safeFilters.minPoints !== undefined ||
    safeFilters.maxPoints !== undefined ||
    safeFilters.hasLoyaltyPoints;

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Customer Directory</h3>
          {!loading && (
            <span className="text-sm text-[var(--text-tertiary)]">
              ({total} customers)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={safeFilters.search}
              onChange={handleSearchChange}
              className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-1.5 rounded-lg hover:bg-[var(--card-hover-bg)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Clear filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="px-5 py-3 bg-[var(--card-secondary-bg)] border-b border-[var(--border-color)] flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Min Points:</label>
          <input
            type="number"
            name="minPoints"
            value={safeFilters.minPoints ?? ''}
            onChange={handleFilterChange}
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-1 w-20 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
            placeholder="0"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Max Points:</label>
          <input
            type="number"
            name="maxPoints"
            value={safeFilters.maxPoints ?? ''}
            onChange={handleFilterChange}
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-1 w-20 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
            placeholder="∞"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            name="hasLoyaltyPoints"
            checked={safeFilters.hasLoyaltyPoints}
            onChange={handleFilterChange}
            className="rounded border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
          />
          Has points only
        </label>
        {hasActiveFilters && (
          <span className="text-xs text-[var(--accent-gold)] bg-[var(--accent-gold-light)] px-2 py-0.5 rounded-full">
            Filters active
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Name</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Contact</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Loyalty Points</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--text-secondary)]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
                    Loading customers...
                  </div>
                </td>
              </tr>
            ) : customers?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--text-tertiary)]">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No customers found
                </td>
              </tr>
            ) : (
              customers?.map((cust) => (
                <tr
                  key={cust.id}
                  className="hover:bg-[var(--table-row-hover)] hover:border-l-2 hover:border-l-[var(--accent-gold)] transition-all duration-150"
                >
                  <td className="py-3 px-5 font-medium text-[var(--text-primary)]">{cust.name}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">
                    {cust.email || cust.phone || '-'}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cust.loyaltyPointsBalance > 1000
                        ? 'bg-[var(--accent-gold-light)] text-[var(--accent-gold)]'
                        : cust.loyaltyPointsBalance > 500
                        ? 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]'
                        : cust.loyaltyPointsBalance > 0
                        ? 'bg-[var(--accent-blue-light)] text-[var(--accent-blue)]'
                        : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
                    }`}>
                      {cust.loyaltyPointsBalance} pts
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cust.status === 'elite'
                        ? 'bg-[var(--accent-gold-light)] text-[var(--accent-gold)]'
                        : cust.status === 'vip'
                        ? 'bg-[var(--accent-purple-light)] text-[var(--accent-purple)]'
                        : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
                    }`}>
                      {cust.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right text-[var(--text-primary)]">
                    {new Date(cust.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-gold)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--text-primary)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-gold)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerTable;