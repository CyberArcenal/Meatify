// src/api/core/returnRefundItem.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface ReturnRefundItem {
  id: number;
  weightKg: number;
  unitPrice: number;
  subtotal: number;
  reason: string | null;
  returnRefundId: number;
  meatId: number;
  batchId: number;
  returnRefund?: {
    id: number;
    referenceNo: string;
    status: string;
    totalAmount: number;
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

export interface PaginatedReturnRefundItems {
  items: ReturnRefundItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReturnRefundItemStatistics {
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
  itemsWithReason: number;
}

export interface BulkCreateResult {
  created: ReturnRefundItem[];
  errors: Array<{ item: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: ReturnRefundItem[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: ReturnRefundItem[];
  errors: Array<{ row: any; error: string }>;
}

export interface ReturnRefundItemExportData {
  format: string;
  data: string | ReturnRefundItem[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface ReturnRefundItemsResponse {
  status: boolean;
  message: string;
  data: PaginatedReturnRefundItems;
}

export interface ReturnRefundItemResponse {
  status: boolean;
  message: string;
  data: ReturnRefundItem;
}

export interface ReturnRefundItemStatisticsResponse {
  status: boolean;
  message: string;
  data: ReturnRefundItemStatistics;
}

export interface ReturnRefundItemExportResponse {
  status: boolean;
  message: string;
  data: ReturnRefundItemExportData;
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
// 🧠 ReturnRefundItemAPI Class
// ----------------------------------------------------------------------

class ReturnRefundItemAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all return refund items with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    returnRefundId?: number;
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
  }): Promise<ReturnRefundItemsResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
        method: 'getAllItems',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch return refund items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch return refund items');
    }
  }

  /**
   * Get a single return refund item by ID
   */
  async getById(id: number): Promise<ReturnRefundItemResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
        method: 'getItemById',
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch return refund item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch return refund item');
    }
  }

  /**
   * Get items for a specific return refund
   */
  async getByReturn(
    returnRefundId: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ReturnRefundItemsResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
        method: 'getItemsByReturn',
        params: { returnRefundId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch items by return');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch items by return');
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
  ): Promise<ReturnRefundItemsResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
  ): Promise<ReturnRefundItemsResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
   * Get return refund item statistics
   */
  async getStatistics(): Promise<ReturnRefundItemStatisticsResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
   * Search return refund items with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    returnRefundId?: number;
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
  }): Promise<ReturnRefundItemsResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
   * Create a new return refund item
   */
  async create(data: {
    returnRefundId: number;
    meatId: number;
    batchId: number;
    weightKg: number;
    unitPrice: number;
    subtotal?: number;
    reason?: string;
  }): Promise<ReturnRefundItemResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
        method: 'createItem',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create return refund item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create return refund item');
    }
  }

  /**
   * Update an existing return refund item (weight, unitPrice, subtotal, reason)
   */
  async update(
    id: number,
    data: Partial<{
      weightKg: number;
      unitPrice: number;
      subtotal: number;
      reason: string;
    }>
  ): Promise<ReturnRefundItemResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
        method: 'updateItem',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update return refund item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update return refund item');
    }
  }

  /**
   * Delete a return refund item (hard delete)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
        method: 'deleteItem',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Return refund item deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete return refund item');
    }
  }

  /**
   * Permanently delete a return refund item
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
        method: 'permanentlyDeleteItem',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Return refund item permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete return refund item');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create return refund items
   */
  async bulkCreate(itemsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
   * Bulk update return refund items
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
   * Import return refund items from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
   * Export return refund items to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<ReturnRefundItemExportResponse> {
    try {
      if (!window.backendAPI?.returnRefundItem) {
        throw new Error('Electron API (returnRefundItem) not available');
      }

      const response = await window.backendAPI.returnRefundItem({
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
    return !!(window.backendAPI?.returnRefundItem);
  }

  /**
   * Get total weight returned for a meat
   */
  async getTotalWeightReturned(meatId: number): Promise<number> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      return response.data.items.reduce((sum, item) => sum + item.weightKg, 0);
    } catch (error) {
      console.error('Error calculating total weight returned:', error);
      return 0;
    }
  }

  /**
   * Get total refund amount for a meat
   */
  async getTotalRefundAmount(meatId: number): Promise<number> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      return response.data.items.reduce((sum, item) => sum + item.subtotal, 0);
    } catch (error) {
      console.error('Error calculating total refund amount:', error);
      return 0;
    }
  }

  /**
   * Get items by date range (convenience method)
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    meatId?: number
  ): Promise<ReturnRefundItemsResponse> {
    return this.search({ startDate, endDate, meatId, limit: 1000 });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const returnRefundItemAPI = new ReturnRefundItemAPI();
export default returnRefundItemAPI;