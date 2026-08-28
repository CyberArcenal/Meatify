import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type {
  InventorySummary,
  MeatInventorySummary,
  InventorySummaryData,
  InventoryReportData,
  CategorySummary,
  SupplierSummary,
} from '../../../api/analytics/inventoryReports';
import FilterBar from './components/FilterBar';
import inventoryReportsAPI from '../../../api/analytics/inventoryReports';
import ExportButton from './components/ExportButton';
import LowStockTable from './components/LowStockTable';
import SummaryCards from './components/SummaryCards';
import OutOfStockTable from './components/OutOfStockTable';
import StatsCards from './components/StatsCards';
import MovementsTable from './components/MovementsTable';
import type { InventoryMovement } from '../../../api/core/inventoryMovement';

const InventoryReportsPage: React.FC = () => {
  // Filters
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data states
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<MeatInventorySummary[]>([]);
  const [outOfStock, setOutOfStock] = useState<MeatInventorySummary[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [stats, setStats] = useState<InventorySummaryData | null>(null); // we'll use summary data for stats cards
  const [topValueItems, setTopValueItems] = useState<MeatInventorySummary[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [supplierSummary, setSupplierSummary] = useState<SupplierSummary[]>([]);

  // Loading states
  const [loading, setLoading] = useState({
    summary: false,
    lowStock: false,
    outOfStock: false,
    movements: false,
    stats: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch functions
  const fetchSummary = useCallback(async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const res = await inventoryReportsAPI.getSummary({ categoryId, supplierId });
      if (res.status) {
        const data = res.data as InventorySummaryData;
        setSummary(data.summary);
        setLowStock(data.lowStockItems);
        setOutOfStock(data.outOfStockItems);
        setTopValueItems(data.topValueItems);
        setCategorySummary(data.categorySummary);
        setSupplierSummary(data.supplierSummary);
        setStats(data); // for StatsCards
      } else throw new Error(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [categoryId, supplierId]);

  const fetchMovements = useCallback(async () => {
    setLoading(prev => ({ ...prev, movements: true }));
    try {
      const res = await inventoryReportsAPI.getData({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeMovementHistory: true,
        categoryId,
        supplierId,
      });
      if (res.status) {
        setMovements(res.data.movementHistory);
      } else throw new Error(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, movements: false }));
    }
  }, [startDate, endDate, categoryId, supplierId]);

  // Initial load and filter changes
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleFilterChange = (filters: any) => {
    setCategoryId(filters.categoryId ? Number(filters.categoryId) : undefined);
    setSupplierId(filters.supplierId ? Number(filters.supplierId) : undefined);
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
  };

  const handleRefresh = () => {
    setError(null);
    fetchSummary();
    fetchMovements();
  };

  const anyLoading = Object.values(loading).some(v => v);

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Inventory Reports</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={anyLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportButton
            categoryId={categoryId}
            supplierId={supplierId}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      <FilterBar
        categoryId={categoryId}
        supplierId={supplierId}
        startDate={startDate}
        endDate={endDate}
        onFilterChange={handleFilterChange}
      />

      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger-color)] p-4 rounded-lg border border-[var(--danger-border)]">
          Error: {error}
        </div>
      )}

      <SummaryCards summary={summary} loading={loading.summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockTable data={lowStock} loading={loading.summary} />
        <OutOfStockTable data={outOfStock} loading={loading.summary} />
      </div>

      <StatsCards
        stats={stats}
        loading={loading.summary}
        topValueItems={topValueItems}
        categorySummary={categorySummary}
        supplierSummary={supplierSummary}
      />

      <MovementsTable data={movements} loading={loading.movements} />
    </div>
  );
};

export default InventoryReportsPage;