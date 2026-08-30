// src/renderer/pages/Analytics/FinancialReports/hooks/useFinancialFilters.ts
import { useState, useCallback } from 'react';

export interface FinancialFilters {
  startDate: string;
  endDate: string;
  revenueGroupBy: 'paymentMethod' | 'product';
  profitGroupBy: 'day' | 'week' | 'month';
}

const initialFilters: FinancialFilters = {
  startDate: '',
  endDate: '',
  revenueGroupBy: 'paymentMethod',
  profitGroupBy: 'day',
};

export const useFinancialFilters = () => {
  const [filters, setFilters] = useState<FinancialFilters>(initialFilters);

  const updateFilters = useCallback((newFilters: Partial<FinancialFilters>) => {
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