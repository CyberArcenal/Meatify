// src/renderer/pages/Analytics/SalesReports/hooks/useSalesFilters.ts
import { useState, useCallback } from 'react';

export interface SalesFilters {
  customerId?: number;
  status: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  searchTerm: string;
  minAmount?: number;
  maxAmount?: number;
}

const initialFilters: SalesFilters = {
  customerId: undefined,
  status: '',
  paymentMethod: '',
  startDate: '',
  endDate: '',
  searchTerm: '',
  minAmount: undefined,
  maxAmount: undefined,
};

export const useSalesFilters = () => {
  const [filters, setFilters] = useState<SalesFilters>(initialFilters);

  const updateFilters = useCallback((newFilters: Partial<SalesFilters>) => {
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