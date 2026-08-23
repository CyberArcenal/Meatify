// src/renderer/pages/inventory/reorder/index.tsx
import React, { useState } from "react";
import { Loader2, AlertCircle, ShoppingCart, RefreshCw } from "lucide-react";
import { useReorder, type SupplierGroup } from "./hooks/useReorder";
import { VendorCard } from "./components/VendorCard";
import { ReorderTable } from "./components/ReorderTable";
import type { LowStockMeat } from "./hooks/useReorder";
import { dialogs } from "../../utils/dialogs";
import { PurchaseFormDialog } from "../purchase/components/PurchaseFormDialog";

const ReorderPage: React.FC = () => {
  const { supplierGroups, loading, error, reload } = useReorder();
  const [selectedGroup, setSelectedGroup] = useState<SupplierGroup | null>(
    null
  );
  const [selectedMeatIds, setSelectedMeatIds] = useState<Set<number>>(
    new Set()
  );
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<any>(null);

  const handleSelectGroup = (group: SupplierGroup) => {
    setSelectedGroup(group);
    setSelectedMeatIds(new Set()); // clear selections when switching supplier
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
      dialogs.alert({
        title: "No Selection",
        message: "Please select at least one meat product.",
      });
      return;
    }

    const selectedMeats = selectedGroup.meats.filter((m) =>
      selectedMeatIds.has(m.id)
    );

    const items = selectedMeats.map((meat) => ({
      meatId: meat.id,
      quantity: meat.reorderQty,
      unitPrice: meat.pricePerKg,
      // expiryDate will be set in the form
    }));

    const initialData = {
      supplierId: selectedGroup.supplier.id,
      items,
    };

    setOrderInitialData(initialData);
    setOrderFormOpen(true);
  };

  const handleOrderSuccess = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
    dialogs.alert({
      title: "Success",
      message: "Purchase order created successfully.",
    });
    reload();
  };

  const handleOrderClose = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--background-color)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--background-color)]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--accent-red)]" />
          <p className="text-[var(--text-primary)] font-medium">
            Error loading reorder data
          </p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={reload}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
          Reorder & Vendor Management
        </h1>
        <button
          onClick={reload}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)] border border-[var(--border-color)]"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {supplierGroups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-[var(--text-primary)] font-medium">
              No low‑stock meats found
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              All meats are above their reorder level.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-6 min-h-0">
          {/* Left sidebar: Vendor cards */}
          <div className="w-80 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      Meats from {selectedGroup.supplier.name}
                    </h2>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      {selectedGroup.meats.length} meats need reordering
                    </p>
                  </div>
                  <button
                    onClick={handleCreateOrder}
                    disabled={selectedMeatIds.size === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
              <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)]">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">
                    Select a vendor to see low‑stock meats
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