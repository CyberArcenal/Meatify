import React from 'react';
import { Filter, Search, X } from 'lucide-react';

interface Props {
  search: string;
  meatId?: number;
  supplierId?: number;
  status: string;
  expiryFrom: string;
  expiryTo: string;
  minRemaining?: number;
  maxRemaining?: number;
  onFilterChange: (filters: any) => void;
}

const FilterBar: React.FC<Props> = ({
  search,
  meatId,
  supplierId,
  status,
  expiryFrom,
  expiryTo,
  minRemaining,
  maxRemaining,
  onFilterChange,
}) => {
  const statuses = ['', 'active', 'depleted', 'expired', 'on_hold'];

  const handleChange = (name: string, value: string | number | undefined) => {
    onFilterChange({
      search: name === 'search' ? value : search,
      meatId: name === 'meatId' ? value : meatId,
      supplierId: name === 'supplierId' ? value : supplierId,
      status: name === 'status' ? value : status,
      expiryFrom: name === 'expiryFrom' ? value : expiryFrom,
      expiryTo: name === 'expiryTo' ? value : expiryTo,
      minRemaining: name === 'minRemaining' ? value : minRemaining,
      maxRemaining: name === 'maxRemaining' ? value : maxRemaining,
    });
  };

  const handleClear = () => {
    onFilterChange({
      search: '',
      meatId: undefined,
      supplierId: undefined,
      status: '',
      expiryFrom: '',
      expiryTo: '',
      minRemaining: undefined,
      maxRemaining: undefined,
    });
  };

  const hasFilters = search || meatId || supplierId || status || expiryFrom || expiryTo || minRemaining || maxRemaining;

  return (
    <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-[var(--text-secondary)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Filters</h3>
        {hasFilters && (
          <button
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--danger-color)]"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Batch code, note..."
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--input-focus)]"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Meat ID</label>
          <input
            type="number"
            value={meatId || ''}
            onChange={(e) => handleChange('meatId', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g., 3"
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--input-focus)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Supplier ID</label>
          <input
            type="number"
            value={supplierId || ''}
            onChange={(e) => handleChange('supplierId', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g., 2"
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--input-focus)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s || 'All'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Expiry From</label>
          <input
            type="date"
            value={expiryFrom}
            onChange={(e) => handleChange('expiryFrom', e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Expiry To</label>
          <input
            type="date"
            value={expiryTo}
            onChange={(e) => handleChange('expiryTo', e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Min Remaining</label>
          <input
            type="number"
            value={minRemaining || ''}
            onChange={(e) => handleChange('minRemaining', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--input-focus)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Max Remaining</label>
          <input
            type="number"
            value={maxRemaining || ''}
            onChange={(e) => handleChange('maxRemaining', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="1000"
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--input-focus)]"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterBar;