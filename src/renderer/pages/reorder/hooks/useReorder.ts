// src/renderer/pages/inventory/reorder/hooks/useReorder.ts
import { useState, useEffect, useCallback } from "react";
import meatAPI, { type Meat } from "../../../api/core/meat";
import batchAPI, { type Batch } from "../../../api/core/batch";
import supplierAPI, { type Supplier } from "../../../api/core/supplier";

export interface LowStockMeat extends Meat {
  supplier: Supplier | null;
  currentStock: number; // total remaining from all batches
  reorderLevel: number; // default threshold (can be configured per meat)
  reorderQty: number;   // recommended order quantity
}

export interface SupplierGroup {
  supplier: Supplier;
  meats: LowStockMeat[];
  lowStockCount: number;
}

export const useReorder = (threshold?: number) => {
  const [meats, setMeats] = useState<LowStockMeat[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get all active meats with their suppliers
      const meatResponse = await meatAPI.getActive();
      if (!meatResponse.status) throw new Error(meatResponse.message);
      const activeMeats = meatResponse.data.items || [];

      // 2. Get all batches to calculate current stock
      const batchResponse = await batchAPI.getAll({
        status: "active",
        limit: 10000,
      });
      if (!batchResponse.status) throw new Error(batchResponse.message);
      const batches = batchResponse.data.items || [];

      // 3. Calculate current stock per meat
      const stockMap = new Map<number, number>();
      batches.forEach((batch) => {
        const current = stockMap.get(batch.meatId) || 0;
        stockMap.set(batch.meatId, current + batch.remainingQuantity);
      });

      // 4. Get all suppliers for reference
      const supplierResponse = await supplierAPI.getActive();
      const supplierMap = new Map<number, Supplier>();
      if (supplierResponse.status) {
        (supplierResponse.data.items || []).forEach((s) => {
          supplierMap.set(s.id, s);
        });
      }

      // 5. Build low stock list with supplier info
      const defaultThreshold = threshold || 10; // kg
      const lowStockMeats: LowStockMeat[] = [];

      activeMeats.forEach((meat) => {
        const currentStock = stockMap.get(meat.id) || 0;
        // Use meat-specific reorder level or default
        const reorderLevel = (meat as any).reorderLevel || defaultThreshold;
        const reorderQty = (meat as any).reorderQty || 20;

        if (currentStock <= reorderLevel) {
          const supplier = meat.supplierId
            ? supplierMap.get(meat.supplierId) || null
            : null;

          lowStockMeats.push({
            ...meat,
            supplier,
            currentStock,
            reorderLevel,
            reorderQty,
          });
        }
      });

      // 6. Group by supplier
      const groupsMap = new Map<number, SupplierGroup>();
      lowStockMeats.forEach((meat) => {
        const supplierId = meat.supplier?.id || 0;
        const supplier = meat.supplier || {
          id: 0,
          name: "Unassigned",
          isActive: true,
        } as Supplier;

        if (!groupsMap.has(supplierId)) {
          groupsMap.set(supplierId, {
            supplier,
            meats: [],
            lowStockCount: 0,
          });
        }
        groupsMap.get(supplierId)!.meats.push(meat);
      });

      // Compute counts
      groupsMap.forEach((group) => {
        group.lowStockCount = group.meats.length;
      });

      setMeats(lowStockMeats);
      setSupplierGroups(Array.from(groupsMap.values()));
    } catch (err: any) {
      setError(err.message || "Failed to fetch low stock data");
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  const reload = useCallback(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  return {
    meats,
    supplierGroups,
    loading,
    error,
    reload,
  };
};