// src/api/analytics/inventoryReports.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface BatchSummary {
  id: number;
  batchCode: string;
  remainingQuantity: number;
  unitCost: number;
  expiryDate: string;
  status: string;
  daysUntilExpiry: number;
}

export interface MeatInventory {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  pricePerKg: number;
  isActive: boolean;
  categoryId: number | null;
  supplierId: number | null;
  inventory: {
    totalStock: number;
    totalActiveStock: number;
    totalValue: number;
    avgCost: number;
    batchCount: number;
    activeBatchCount: number;
    expiringBatches: number;
    expiredBatches: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    hasBatches: boolean;
  };
  batches: BatchSummary[];
}

export interface InventorySummary {
  totalMeats: number;
  totalBatches: number;
  totalValue: number;
  totalStock: number;
  totalActiveStock: number;
  expiringCount: number;
  expiredCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  hasBatchesCount: number;
  averageValue: number;
  averageStock: number;
  averageActiveStock: number;
}

export interface MeatInventorySummary {
  meatId: number;
  meatName: string;
  sku: string;
  totalStock: number;
  totalActiveStock: number;
  totalValue: number;
  batchCount: number;
  activeBatchCount: number;
  expiring: number;
  expired: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  hasBatches: boolean;
  categoryName: string;
  supplierName: string;
}

export interface CategorySummary {
  category: string;
  count: number;
  totalValue: number;
  totalStock: number;
}

export interface SupplierSummary {
  supplier: string;
  count: number;
  totalValue: number;
  totalStock: number;
}

export interface InventoryReportData {
  meats: MeatInventory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  movementHistory: any[];
  summary: InventorySummary & {
    topMeatsByValue: any[];
    topMeatsByStock: any[];
    categoryBreakdown: CategorySummary[];
    supplierBreakdown: SupplierSummary[];
  };
  filters: {
    startDate?: string;
    endDate?: string;
    lowStockThreshold: number;
    categoryId?: number;
    supplierId?: number;
  };
}

export interface InventorySummaryData {
  summary: InventorySummary;
  lowStockItems: MeatInventorySummary[];
  outOfStockItems: MeatInventorySummary[];
  expiringItems: MeatInventorySummary[];
  topValueItems: MeatInventorySummary[];
  categorySummary: CategorySummary[];
  supplierSummary: SupplierSummary[];
  threshold: number;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface InventoryDataResponse {
  status: boolean;
  message: string;
  data: InventoryReportData;
}

export interface InventorySummaryResponse {
  status: boolean;
  message: string;
  data: InventorySummaryData;
}

// ----------------------------------------------------------------------
// 🧠 InventoryReportsAPI Class
// ----------------------------------------------------------------------

class InventoryReportsAPI {
  /**
   * Get detailed inventory data with pagination and filters
   */
  async getData(params?: {
    startDate?: string;
    endDate?: string;
    includeMovementHistory?: boolean;
    includeExpiryTracking?: boolean;
    lowStockThreshold?: number;
    categoryId?: number;
    supplierId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<InventoryDataResponse> {
    try {
      if (!window.backendAPI?.inventoryReports) {
        throw new Error('Electron API (inventoryReports) not available');
      }

      const response = await window.backendAPI.inventoryReports({
        method: 'getInventoryData',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch inventory data');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch inventory data');
    }
  }

  /**
   * Get inventory summary
   */
  async getSummary(params?: {
    lowStockThreshold?: number;
    categoryId?: number;
    supplierId?: number;
  }): Promise<InventorySummaryResponse> {
    try {
      if (!window.backendAPI?.inventoryReports) {
        throw new Error('Electron API (inventoryReports) not available');
      }

      const response = await window.backendAPI.inventoryReports({
        method: 'getInventorySummary',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch inventory summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch inventory summary');
    }
  }

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.inventoryReports);
  }

  /**
   * Get low stock items (convenience method)
   */
  async getLowStockItems(threshold: number = 5): Promise<MeatInventorySummary[]> {
    try {
      const response = await this.getSummary({ lowStockThreshold: threshold });
      return response.data.lowStockItems;
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      return [];
    }
  }

  /**
   * Get out of stock items (convenience method)
   */
  async getOutOfStockItems(): Promise<MeatInventorySummary[]> {
    try {
      const response = await this.getSummary();
      return response.data.outOfStockItems;
    } catch (error) {
      console.error('Error fetching out of stock items:', error);
      return [];
    }
  }

  /**
   * Get expiring items (convenience method)
   */
  async getExpiringItems(): Promise<MeatInventorySummary[]> {
    try {
      const response = await this.getSummary();
      return response.data.expiringItems;
    } catch (error) {
      console.error('Error fetching expiring items:', error);
      return [];
    }
  }

  /**
   * Get total inventory value (convenience method)
   */
  async getTotalValue(): Promise<number> {
    try {
      const response = await this.getSummary();
      return response.data.summary.totalValue;
    } catch (error) {
      console.error('Error fetching total inventory value:', error);
      return 0;
    }
  }

  /**
   * Get inventory by category (convenience method)
   */
  async getByCategory(categoryId: number): Promise<InventoryReportData> {
    try {
      const response = await this.getData({ categoryId, limit: 1000 });
      return response.data;
    } catch (error) {
      console.error(`Error fetching inventory for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Get inventory by supplier (convenience method)
   */
  async getBySupplier(supplierId: number): Promise<InventoryReportData> {
    try {
      const response = await this.getData({ supplierId, limit: 1000 });
      return response.data;
    } catch (error) {
      console.error(`Error fetching inventory for supplier ${supplierId}:`, error);
      throw error;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const inventoryReportsAPI = new InventoryReportsAPI();
export default inventoryReportsAPI;