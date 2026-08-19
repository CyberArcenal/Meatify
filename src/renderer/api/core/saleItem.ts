// src/api/core/saleItem.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface SaleItem {
  id: number;
  weightKg: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
  saleId: number;
  meatId: number;
  batchId: number;
  sale?: {
    id: number;
    totalAmount: number;
    status: string;
    timestamp: string;
  } | null;
  meat?: {
    id: number;
    name: string;
    sku: string;
    pricePerKg: number;
  } | null;
  batch?: {
    id: number;
    batchCode: string;
    remainingQuantity: number;
    expiryDate: string;
  } | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedSaleItems {
  items: SaleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaleItemStatistics {
  totalWeight: number;
  totalAmount: number;
  averageWeight: number;
  topMeats: Array<{
    meatId: number;
    meatName: string;
    count: number;
    totalWeight: number;
    totalAmount: number;
  }>;
  itemsWithDiscount: number;
}

export interface BulkCreateResult {
  created: SaleItem[];
  errors: Array<{ item: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: SaleItem[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: SaleItem[];
  errors: Array<{ row: any; error: string }>;
}

export interface SaleItemExportData {
  format: string;
  data: string | SaleItem[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface SaleItemsResponse {
  status: boolean;
  message: string;
  data: PaginatedSaleItems;
}

export interface SaleItemResponse {
  status: boolean;
  message: string;
  data: SaleItem;
}

export interface SaleItemStatisticsResponse {
  status: boolean;
  message: string;
  data: SaleItemStatistics;
}

export interface SaleItemExportResponse {
  status: boolean;
  message: string;
  data: SaleItemExportData;
}

export interface BulkCreateResponse {
  status: boolean;
  message: string;
  data: BulkCreateResult;
}

export interface BulkUpdateResponse {
  status: boolean;
  message: string;
  data: BulkUpdateResult;
}

export interface ImportResponse {
  status: boolean;
  message: string;
  data: ImportResult;
}

// ----------------------------------------------------------------------
// 🧠 SaleItemAPI Class
// ----------------------------------------------------------------------

class SaleItemAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all sale items with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    saleId?: number;
    meatId?: number;
    batchId?: number;
    minWeight?: number;
    maxWeight?: number;
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<SaleItemsResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'getAllItems',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch sale items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch sale items');
    }
  }

  /**
   * Get a single sale item by ID
   */
  async getById(id: number): Promise<SaleItemResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'getItemById',
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch sale item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch sale item');
    }
  }

  /**
   * Get items for a specific sale
   */
  async getBySale(
    saleId: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<SaleItemsResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'getItemsBySale',
        params: { saleId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch items by sale');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch items by sale');
    }
  }

  /**
   * Get items for a specific meat
   */
  async getByMeat(
    meatId: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<SaleItemsResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'getItemsByMeat',
        params: { meatId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch items by meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch items by meat');
    }
  }

  /**
   * Get items for a specific batch
   */
  async getByBatch(
    batchId: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<SaleItemsResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'getItemsByBatch',
        params: { batchId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch items by batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch items by batch');
    }
  }

  /**
   * Get sale item statistics
   */
  async getStatistics(): Promise<SaleItemStatisticsResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'getItemStatistics',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch statistics');
    }
  }

  /**
   * Search sale items with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    saleId?: number;
    meatId?: number;
    batchId?: number;
    minWeight?: number;
    maxWeight?: number;
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<SaleItemsResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'searchItems',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search items');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new sale item
   */
  async create(data: {
    saleId: number;
    meatId: number;
    batchId: number;
    weightKg: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    lineTotal?: number;
  }): Promise<SaleItemResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'createItem',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create sale item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create sale item');
    }
  }

  /**
   * Update an existing sale item (weight, unitPrice, discount, tax)
   */
  async update(
    id: number,
    data: Partial<{
      weightKg: number;
      unitPrice: number;
      discount: number;
      tax: number;
      lineTotal: number;
    }>
  ): Promise<SaleItemResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'updateItem',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update sale item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update sale item');
    }
  }

  /**
   * Delete a sale item (hard delete)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'deleteItem',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Sale item deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete sale item');
    }
  }

  /**
   * Permanently delete a sale item
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'permanentlyDeleteItem',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Sale item permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete sale item');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create sale items
   */
  async bulkCreate(itemsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'bulkCreateItems',
        params: { itemsArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create items');
    }
  }

  /**
   * Bulk update sale items
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'bulkUpdateItems',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update items');
    }
  }

  /**
   * Import sale items from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'importItemsCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import items');
    }
  }

  /**
   * Export sale items to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<SaleItemExportResponse> {
    try {
      if (!window.backendAPI?.saleItem) {
        throw new Error('Electron API (saleItem) not available');
      }

      const response = await window.backendAPI.saleItem({
        method: 'exportItems',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export items');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.saleItem);
  }

  /**
   * Get total weight sold for a meat
   */
  async getTotalWeightSold(meatId: number): Promise<number> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      return response.data.items.reduce((sum, item) => sum + item.weightKg, 0);
    } catch (error) {
      console.error('Error calculating total weight sold:', error);
      return 0;
    }
  }

  /**
   * Get total revenue for a meat
   */
  async getTotalRevenue(meatId: number): Promise<number> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      return response.data.items.reduce((sum, item) => sum + item.lineTotal, 0);
    } catch (error) {
      console.error('Error calculating total revenue:', error);
      return 0;
    }
  }

  /**
   * Get items sold by date range
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    meatId?: number
  ): Promise<SaleItemsResponse> {
    return this.search({ startDate, endDate, meatId, limit: 1000 });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const saleItemAPI = new SaleItemAPI();
export default saleItemAPI;