import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface PaginationState {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  visible: boolean;
}

interface PaginationContextType {
  pagination: PaginationState;
  setPagination: (data: Omit<PaginationState, 'visible'>) => void;
  clearPagination: () => void;
}

const defaultPagination: PaginationState = {
  currentPage: 1,
  totalItems: 0,
  pageSize: 10,
  onPageChange: () => {},
  visible: false,
};

const PaginationContext = createContext<PaginationContextType | undefined>(undefined);

export const PaginationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pagination, setPaginationState] = useState<PaginationState>(defaultPagination);

  const setPagination = useCallback((data: Omit<PaginationState, 'visible'>) => {
    setPaginationState(prev => {
      const prevData = { ...prev };
      delete (prevData as any).visible;

      // Compare primitive values and function references
      const same =
        prevData.currentPage === data.currentPage &&
        prevData.totalItems === data.totalItems &&
        prevData.pageSize === data.pageSize &&
        prevData.onPageChange === data.onPageChange &&
        prevData.onPageSizeChange === data.onPageSizeChange &&
        prevData.showPageSize === data.showPageSize &&
        JSON.stringify(prevData.pageSizeOptions) === JSON.stringify(data.pageSizeOptions);

      if (same) {
        return prev; // No change, avoid re-render
      }

      return {
        ...data,
        visible: true,
      };
    });
  }, []);

  const clearPagination = useCallback(() => {
    setPaginationState(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <PaginationContext.Provider value={{ pagination, setPagination, clearPagination }}>
      {children}
    </PaginationContext.Provider>
  );
};

export const usePagination = () => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error('usePagination must be used within a PaginationProvider');
  }
  return context;
};