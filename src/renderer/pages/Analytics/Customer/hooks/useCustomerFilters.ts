// src/renderer/pages/Analytics/Customer/hooks/useCustomerFilters.ts
import { useState, useCallback } from 'react';

export interface CustomerFilters {
  search: string;
  minPoints: number | undefined;
  maxPoints: number | undefined;
  hasLoyaltyPoints: boolean;
}

const initialFilters: CustomerFilters = {
  search: '',
  minPoints: undefined,
  maxPoints: undefined,
  hasLoyaltyPoints: false,
};

export const useCustomerFilters = () => {
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters);

  const updateFilters = useCallback((newFilters: Partial<CustomerFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasFilters = Object.values(filters).some(
    (val) => val !== '' && val !== undefined && val !== false
  );

  return { filters, updateFilters, resetFilters, hasFilters };
};