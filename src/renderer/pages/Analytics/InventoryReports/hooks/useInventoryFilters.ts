// src/renderer/pages/Analytics/InventoryReports/hooks/useInventoryFilters.ts
import { useState, useCallback } from 'react';

export interface InventoryFilters {
  categoryId?: number;
  supplierId?: number;
  startDate: string;
  endDate: string;
}

const initialFilters: InventoryFilters = {
  categoryId: undefined,
  supplierId: undefined,
  startDate: '',
  endDate: '',
};

export const useInventoryFilters = () => {
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);

  const updateFilters = useCallback((newFilters: Partial<InventoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasFilters = Object.values(filters).some(
    (val) => val !== '' && val !== undefined && val !== null
  );

  return { filters, updateFilters, resetFilters, hasFilters };
};