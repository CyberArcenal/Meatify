// src/renderer/pages/inventory/suppliers/hooks/useSupplierView.ts
import { useState } from "react";
import type { Supplier } from "../../../api/core/supplier";
import type { Meat } from "../../../api/core/meat";
import type { Purchase } from "../../../api/core/purchase";
import meatAPI from "../../../api/core/meat";
import purchaseAPI from "../../../api/core/purchase";

export const useSupplierView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [meats, setMeats] = useState<Meat[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    totalSpent: 0,
    purchaseCount: 0,
    averageOrderValue: 0,
  });

  const open = async (supplier: Supplier) => {
    setSupplier(supplier);
    setIsOpen(true);
    setLoading(true);

    try {
      // Fetch meats by supplier
      const meatsRes = await meatAPI.getAll({
        supplierId: supplier.id,
        isActive: true,
        limit: 1000,
      });
      if (meatsRes.status) {
        setMeats(meatsRes.data.items || []);
      }

      // Fetch purchases by supplier
      const purchasesRes = await purchaseAPI.getBySupplier(supplier.id, {
        limit: 1000,
      });
      if (purchasesRes.status) {
        const allPurchases = purchasesRes.data.items || [];
        setPurchases(allPurchases);

        // Compute metrics from completed purchases
        const completed = allPurchases.filter((p) => p.status === "completed");
        const totalSpent = completed.reduce(
          (sum, p) => sum + Number(p.totalAmount),
          0
        );
        setMetrics({
          totalSpent,
          purchaseCount: completed.length,
          averageOrderValue: completed.length ? totalSpent / completed.length : 0,
        });
      }
    } catch (error) {
      console.error("Error loading supplier details:", error);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setSupplier(null);
    setMeats([]);
    setPurchases([]);
    setMetrics({ totalSpent: 0, purchaseCount: 0, averageOrderValue: 0 });
  };

  return {
    isOpen,
    supplier,
    meats,
    purchases,
    metrics,
    loading,
    open,
    close,
  };
};