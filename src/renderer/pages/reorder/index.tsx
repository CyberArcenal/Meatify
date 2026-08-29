// src/renderer/pages/inventory/reorder/index.tsx
import React, { useState } from "react";
import {
  Loader2,
  AlertCircle,
  ShoppingCart,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import { useReorder } from "./hooks/useReorder";
import { VendorCard } from "./components/VendorCard";
import { ReorderTable } from "./components/ReorderTable";
import { ReorderSummaryCards } from "./components/ReorderSummaryCards";
import { dialogs } from "../../utils/dialogs";

import type { SupplierGroup } from "./hooks/useReorder";
import { PurchaseFormDialog } from "../purchase/components/PurchaseFormDialog";

const ReorderPage: React.FC = () => {
  const { supplierGroups, summary, loading, error, reload } = useReorder();
  const [selectedGroup, setSelectedGroup] = useState<SupplierGroup | null>(null);
  const [selectedMeatIds, setSelectedMeatIds] = useState<Set<number>>(new Set());
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<any>(null);
  const [showStats, setShowStats] = useState(true);

  const handleSelectGroup = (group: SupplierGroup) => {
    setSelectedGroup(group);
    setSelectedMeatIds(new Set());
  };

  const toggleMeat = (meatId: number) => {
    const newSet = new Set(selectedMeatIds);
    if (newSet.has(meatId)) {
      newSet.delete(meatId);
    } else {
      newSet.add(meatId);
    }
    setSelectedMeatIds(newSet);
  };

  const toggleSelectAll = () => {
    if (!selectedGroup) return;
    if (selectedMeatIds.size === selectedGroup.meats.length) {
      setSelectedMeatIds(new Set());
    } else {
      setSelectedMeatIds(new Set(selectedGroup.meats.map((m) => m.id)));
    }
  };

  const handleCreateOrder = () => {
    if (!selectedGroup || selectedMeatIds.size === 0) {
      dialogs.warning("Please select at least one meat product.");
      return;
    }

    const selectedMeats = selectedGroup.meats.filter((m) =>
      selectedMeatIds.has(m.id)
    );

    const items = selectedMeats.map((meat) => ({
      meatId: meat.id,
      quantity: meat.reorderQty,
      unitPrice: meat.pricePerKg,
    }));

    setOrderInitialData({
      supplierId: selectedGroup.supplier.id,
      items,
    });
    setOrderFormOpen(true);
  };

  const handleOrderSuccess = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
    dialogs.success("Purchase order created successfully.");
    reload();
  };

  const handleOrderClose = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 border border-[var(--border-color)] rounded-xl bg-[var(--card-bg)]">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--danger-color)]" />
        <p className="text-[var(--text-primary)] font-medium">Error loading reorder data</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
        <button
          onClick={reload}
          className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const hasLowStock = supplierGroups.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">🔄</span>
            Reorder & Vendor Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            View low-stock items and create purchase orders by supplier
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            title={showStats ? "Hide summary" : "Show summary"}
          >
            {showStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={reload}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && (
        <ReorderSummaryCards summary={summary} loading={loading} />
      )}

      {/* Main Content */}
      {!hasLowStock ? (
        <div className="text-center py-16 border border-[var(--border-color)] rounded-xl bg-[var(--card-bg)]">
          <ShoppingCart className="w-16 h-16 mx-auto mb-3 text-[var(--text-tertiary)]" />
          <p className="text-[var(--text-primary)] font-medium">No low-stock items found</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            All meats are above their reorder level. Good inventory management!
          </p>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 min-h-[500px]">
          {/* Left sidebar: Vendor cards */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
            <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-1 mb-1">
              Suppliers with Low Stock
            </div>
            {supplierGroups.map((group) => (
              <VendorCard
                key={group.supplier.id}
                group={group}
                isSelected={selectedGroup?.supplier.id === group.supplier.id}
                onSelect={() => handleSelectGroup(group)}
              />
            ))}
          </div>

          {/* Right side: Meats table and actions */}
          <div className="flex-1 flex flex-col min-h-0">
            {selectedGroup ? (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedGroup.supplier.name}
                    </h2>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      {selectedGroup.meats.length} item{selectedGroup.meats.length !== 1 ? "s" : ""} need reordering
                    </p>
                  </div>
                  <button
                    onClick={handleCreateOrder}
                    disabled={selectedMeatIds.size === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Create Purchase Order ({selectedMeatIds.size})
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <ReorderTable
                    meats={selectedGroup.meats}
                    selectedIds={selectedMeatIds}
                    onToggleSelect={toggleMeat}
                    onSelectAll={toggleSelectAll}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--card-secondary-bg)]">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium text-[var(--text-secondary)]">
                    Select a supplier to see low-stock items
                  </p>
                  <p className="text-sm text-[var(--text-tertiary)] mt-1">
                    Click on a vendor card on the left
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Form Dialog */}
      <PurchaseFormDialog
        isOpen={orderFormOpen}
        mode="add"
        purchaseId={undefined}
        initialData={orderInitialData}
        onClose={handleOrderClose}
        onSuccess={handleOrderSuccess}
      />
    </div>
  );
};

export default ReorderPage;