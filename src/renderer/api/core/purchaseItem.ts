// src/api/core/purchaseItem.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface PurchaseItem {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  expiryDate: string | null;
  purchaseId: number;
  meatId: number;
  purchase?: {
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
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedPurchaseItems {
  items: PurchaseItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseItemStatistics {
  totalQuantity: number;
  totalAmount: number;
  topMeats: Array<{
    meatId: number;
    meatName: string;
    count: number;
    totalQuantity: number;
    totalAmount: number;
  }>;
  itemsWithExpiry: number;
}

export interface BulkCreateResult {
  created: PurchaseItem[];
  errors: Array<{ item: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: PurchaseItem[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: PurchaseItem[];
  errors: Array<{ row: any; error: string }>;
}

export interface PurchaseItemExportData {
  format: string;
  data: string | PurchaseItem[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface PurchaseItemsResponse {
  status: boolean;
  message: string;
  data: PaginatedPurchaseItems;
}

export interface PurchaseItemResponse {
  status: boolean;
  message: string;
  data: PurchaseItem;
}

export interface PurchaseItemStatisticsResponse {
  status: boolean;
  message: string;
  data: PurchaseItemStatistics;
}

export interface PurchaseItemExportResponse {
  status: boolean;
  message: string;
  data: PurchaseItemExportData;
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
// 🧠 PurchaseItemAPI Class
// ----------------------------------------------------------------------

class PurchaseItemAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all purchase items with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    purchaseId?: number;
    meatId?: number;
    minQuantity?: number;
    maxQuantity?: number;
    expiryDateFrom?: string;
    expiryDateTo?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PurchaseItemsResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
        method: 'getAllItems',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch purchase items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchase items');
    }
  }

  /**
   * Get a single purchase item by ID
   */
  async getById(id: number): Promise<PurchaseItemResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
        method: 'getItemById',
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch purchase item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchase item');
    }
  }

  /**
   * Get items for a specific purchase
   */
  async getByPurchase(
    purchaseId: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<PurchaseItemsResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
        method: 'getItemsByPurchase',
        params: { purchaseId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch items by purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch items by purchase');
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
  ): Promise<PurchaseItemsResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
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
   * Get purchase item statistics
   */
  async getStatistics(): Promise<PurchaseItemStatisticsResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
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
   * Search purchase items with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    purchaseId?: number;
    meatId?: number;
    minQuantity?: number;
    maxQuantity?: number;
    expiryDateFrom?: string;
    expiryDateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PurchaseItemsResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
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
   * Create a new purchase item
   */
  async create(data: {
    purchaseId: number;
    meatId: number;
    quantity: number;
    unitPrice: number;
    subtotal?: number;
    expiryDate: string;
  }): Promise<PurchaseItemResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
        method: 'createItem',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create purchase item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create purchase item');
    }
  }

  /**
   * Update an existing purchase item (quantity, unitPrice, subtotal, expiryDate)
   */
  async update(
    id: number,
    data: Partial<{
      quantity: number;
      unitPrice: number;
      subtotal: number;
      expiryDate: string;
    }>
  ): Promise<PurchaseItemResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
        method: 'updateItem',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update purchase item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update purchase item');
    }
  }

  /**
   * Delete a purchase item (hard delete)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
        method: 'deleteItem',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Purchase item deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete purchase item');
    }
  }

  /**
   * Permanently delete a purchase item
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
        method: 'permanentlyDeleteItem',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Purchase item permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete purchase item');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create purchase items
   */
  async bulkCreate(itemsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
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
   * Bulk update purchase items
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
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
   * Import purchase items from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
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
   * Export purchase items to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<PurchaseItemExportResponse> {
    try {
      if (!window.backendAPI?.purchaseItem) {
        throw new Error('Electron API (purchaseItem) not available');
      }

      const response = await window.backendAPI.purchaseItem({
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
    return !!(window.backendAPI?.purchaseItem);
  }

  /**
   * Get total quantity purchased for a meat
   */
  async getTotalQuantityPurchased(meatId: number): Promise<number> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      return response.data.items.reduce((sum, item) => sum + item.quantity, 0);
    } catch (error) {
      console.error('Error calculating total quantity purchased:', error);
      return 0;
    }
  }

  /**
   * Get total amount spent on a meat
   */
  async getTotalAmountSpent(meatId: number): Promise<number> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      return response.data.items.reduce((sum, item) => sum + item.subtotal, 0);
    } catch (error) {
      console.error('Error calculating total amount spent:', error);
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
  ): Promise<PurchaseItemsResponse> {
    // Use search with date filters (if supported) or fallback to getAll
    return this.search({ 
      searchTerm: '',
      meatId,
      page: 1,
      limit: 1000
    });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const purchaseItemAPI = new PurchaseItemAPI();
export default purchaseItemAPI;