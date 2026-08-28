import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import FilterBar from './components/FilterBar';
import SummaryCards from './components/SummaryCards';
import BatchTable from './components/BatchTable';
import BatchFormDialog from './components/BatchFormDialog';
import BatchViewDialog from './components/BatchViewDialog';
import ExportButton from './components/ExportButton';
import type { Batch, BatchStatistics } from '../../api/core/batch';
import batchAPI from '../../api/core/batch';

const BatchesPage: React.FC = () => {
  // Filters
  const [search, setSearch] = useState('');
  const [meatId, setMeatId] = useState<number | undefined>();
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [status, setStatus] = useState('');
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [minRemaining, setMinRemaining] = useState<number | undefined>();
  const [maxRemaining, setMaxRemaining] = useState<number | undefined>();

  // Data states
  const [batches, setBatches] = useState<Batch[]>([]);
  const [statistics, setStatistics] = useState<BatchStatistics | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await batchAPI.getAll({
        page,
        limit,
        search: search || undefined,
        meatId,
        supplierId,
        status: status || undefined,
        expiryDateFrom: expiryFrom || undefined,
        expiryDateTo: expiryTo || undefined,
        minRemaining,
        maxRemaining,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
      if (res.status) {
        setBatches(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, meatId, supplierId, status, expiryFrom, expiryTo, minRemaining, maxRemaining]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const res = await batchAPI.getStatistics();
      if (res.status) setStatistics(res.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleRefresh = () => {
    fetchBatches();
    fetchStatistics();
  };

  const handleFilterChange = (filters: any) => {
    setSearch(filters.search);
    setMeatId(filters.meatId ? Number(filters.meatId) : undefined);
    setSupplierId(filters.supplierId ? Number(filters.supplierId) : undefined);
    setStatus(filters.status);
    setExpiryFrom(filters.expiryFrom);
    setExpiryTo(filters.expiryTo);
    setMinRemaining(filters.minRemaining ? Number(filters.minRemaining) : undefined);
    setMaxRemaining(filters.maxRemaining ? Number(filters.maxRemaining) : undefined);
    setPage(1);
  };

  const handleCreate = () => {
    setEditingBatch(null);
    setShowForm(true);
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setShowForm(true);
  };

  const handleDelete = async (batch: Batch) => {
    if (!confirm(`Are you sure you want to delete batch ${batch.batchCode}?`)) return;
    try {
      const res = await batchAPI.delete(batch.id);
      if (res.status) {
        handleRefresh();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleView = (batch: Batch) => {
    setViewingBatch(batch);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    handleRefresh();
  };

  const anyLoading = loading;

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Batch Management</h1>
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
            filters={{ search, meatId, supplierId, status, expiryDateFrom: expiryFrom, expiryDateTo: expiryTo, minRemaining, maxRemaining }}
          />
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Batch
          </button>
        </div>
      </div>

      <FilterBar
        search={search}
        meatId={meatId}
        supplierId={supplierId}
        status={status}
        expiryFrom={expiryFrom}
        expiryTo={expiryTo}
        minRemaining={minRemaining}
        maxRemaining={maxRemaining}
        onFilterChange={handleFilterChange}
      />

      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger-color)] p-4 rounded-lg border border-[var(--danger-border)]">
          Error: {error}
        </div>
      )}

      <SummaryCards statistics={statistics} loading={false} />

      <BatchTable
        data={batches}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
      />

      {showForm && (
        <BatchFormDialog
          batch={editingBatch}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {viewingBatch && (
        <BatchViewDialog
          batch={viewingBatch}
          onClose={() => setViewingBatch(null)}
        />
      )}
    </div>
  );
};

export default BatchesPage;