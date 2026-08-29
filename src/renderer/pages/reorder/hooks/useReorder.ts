// src/renderer/pages/inventory/reorder/hooks/useReorder.ts
import { useState, useEffect, useCallback } from "react";
import meatAPI, { type Meat } from "../../../api/core/meat";
import batchAPI, { type Batch } from "../../../api/core/batch";
import supplierAPI, { type Supplier } from "../../../api/core/supplier";

export interface LowStockMeat extends Meat {
  supplier: Supplier | null;
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
}

export interface SupplierGroup {
  supplier: Supplier;
  meats: LowStockMeat[];
  lowStockCount: number;
}

export interface ReorderSummary {
  totalLowStockItems: number;
  suppliersWithLowStock: number;
  totalReorderQty: number;
  totalValue: number;
}

export const useReorder = (threshold?: number) => {
  const [meats, setMeats] = useState<LowStockMeat[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([]);
  const [summary, setSummary] = useState<ReorderSummary>({
    totalLowStockItems: 0,
    suppliersWithLowStock: 0,
    totalReorderQty: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meatResponse = await meatAPI.getActive();
      if (!meatResponse.status) throw new Error(meatResponse.message);
      const activeMeats = meatResponse.data.items || [];

      const batchResponse = await batchAPI.getAll({
        status: "active",
        limit: 10000,
      });
      if (!batchResponse.status) throw new Error(batchResponse.message);
      const batches = batchResponse.data.items || [];

      const stockMap = new Map<number, number>();
      batches.forEach((batch) => {
        const current = stockMap.get(batch.meatId) || 0;
        stockMap.set(batch.meatId, current + batch.remainingQuantity);
      });

      const supplierResponse = await supplierAPI.getActive();
      const supplierMap = new Map<number, Supplier>();
      if (supplierResponse.status) {
        (supplierResponse.data.items || []).forEach((s) => {
          supplierMap.set(s.id, s);
        });
      }

      const defaultThreshold = threshold || 10;
      const lowStockMeats: LowStockMeat[] = [];

      activeMeats.forEach((meat) => {
        const currentStock = stockMap.get(meat.id) || 0;
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

      const groupsMap = new Map<number, SupplierGroup>();
      let totalReorderQty = 0;
      let totalValue = 0;

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
        totalReorderQty += meat.reorderQty;
        totalValue += meat.reorderQty * meat.pricePerKg;
      });

      groupsMap.forEach((group) => {
        group.lowStockCount = group.meats.length;
      });

      const groups = Array.from(groupsMap.values());
      setMeats(lowStockMeats);
      setSupplierGroups(groups);
      setSummary({
        totalLowStockItems: lowStockMeats.length,
        suppliersWithLowStock: groups.length,
        totalReorderQty,
        totalValue,
      });
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
    summary,
    loading,
    error,
    reload,
  };
};