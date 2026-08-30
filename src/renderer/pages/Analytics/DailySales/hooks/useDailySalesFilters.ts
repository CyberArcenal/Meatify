// src/renderer/pages/Analytics/DailySales/hooks/useDailySalesFilters.ts
import { useState, useCallback } from 'react';

export interface DailySalesFilters {
  startDate: string;
  endDate: string;
  paymentMethod: string;
  status: string;
}

const initialFilters: DailySalesFilters = {
  startDate: '',
  endDate: '',
  paymentMethod: '',
  status: '',
};

export const useDailySalesFilters = () => {
  const [filters, setFilters] = useState<DailySalesFilters>(initialFilters);

  const updateFilters = useCallback((newFilters: Partial<DailySalesFilters>) => {
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