// src/api/core/purchase.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface PurchaseItem {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  expiryDate: string;
  meatId: number;
  meat?: {
    id: number;
    name: string;
    sku: string;
    pricePerKg: number;
  } | null;
  createdAt: string;
}

export interface Purchase {
  id: number;
  referenceNo: string;
  orderDate: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  totalAmount: number;
  notes: string | null;
  supplierId: number;
  supplier?: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  } | null;
  purchaseItems: PurchaseItem[];
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedPurchases {
  items: Purchase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseStatistics {
  statusCounts: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  totalCompletedAmount: number;
  averageCompletedAmount: number;
  topSuppliers: Array<{
    supplierId: number;
    supplierName: string;
    purchaseCount: number;
    totalSpent: number;
  }>;
}

export interface BulkCreateResult {
  created: Purchase[];
  errors: Array<{ purchase: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Purchase[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Purchase[];
  errors: Array<{ row: any; error: string }>;
}

export interface PurchaseExportData {
  format: string;
  data: string | Purchase[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface PurchasesResponse {
  status: boolean;
  message: string;
  data: PaginatedPurchases;
}

export interface PurchaseResponse {
  status: boolean;
  message: string;
  data: Purchase;
}

export interface PurchaseStatisticsResponse {
  status: boolean;
  message: string;
  data: PurchaseStatistics;
}

export interface PurchaseExportResponse {
  status: boolean;
  message: string;
  data: PurchaseExportData;
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
// 🧠 PurchaseAPI Class
// ----------------------------------------------------------------------

class PurchaseAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all purchases with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    supplierId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PurchasesResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'getAllPurchases',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch purchases');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchases');
    }
  }

  /**
   * Get a single purchase by ID
   */
  async getById(id: number): Promise<PurchaseResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'getPurchaseById',
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchase');
    }
  }

  /**
   * Get purchases for a specific supplier
   */
  async getBySupplier(
    supplierId: number,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PurchasesResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'getPurchasesBySupplier',
        params: { supplierId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch purchases by supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchases by supplier');
    }
  }

  /**
   * Get purchases by status
   */
  async getByStatus(
    status: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<PurchasesResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'getPurchasesByStatus',
        params: { status, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch purchases by status');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchases by status');
    }
  }

  /**
   * Get purchase statistics
   */
  async getStatistics(): Promise<PurchaseStatisticsResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'getPurchaseStatistics',
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
   * Search purchases with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    supplierId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PurchasesResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'searchPurchases',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search purchases');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search purchases');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new purchase
   */
  async create(data: {
    supplierId: number;
    items: Array<{
      meatId: number;
      quantity: number;
      unitPrice: number;
      expiryDate: string;
    }>;
    referenceNo?: string;
    orderDate?: string;
    status?: 'pending' | 'approved' | 'completed' | 'cancelled';
    notes?: string;
  }): Promise<PurchaseResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'createPurchase',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create purchase');
    }
  }

  /**
   * Update an existing purchase
   */
  async update(
    id: number,
    data: Partial<{
      supplierId: number;
      items: Array<{
        meatId: number;
        quantity: number;
        unitPrice: number;
        expiryDate: string;
      }>;
      referenceNo: string;
      orderDate: string;
      status: 'pending' | 'approved' | 'completed' | 'cancelled';
      notes: string;
    }>
  ): Promise<PurchaseResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'updatePurchase',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update purchase');
    }
  }

  /**
   * Cancel a purchase (soft delete)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'deletePurchase',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Purchase cancelled successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to cancel purchase');
    }
  }

  /**
   * Restore a cancelled purchase (set status to pending)
   */
  async restore(id: number): Promise<PurchaseResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'restorePurchase',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore purchase');
    }
  }

  /**
   * Permanently delete a purchase
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'permanentlyDeletePurchase',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Purchase permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete purchase');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Approve a purchase
   */
  async approve(purchaseId: number): Promise<PurchaseResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'approvePurchase',
        params: { purchaseId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to approve purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve purchase');
    }
  }

  /**
   * Complete a purchase (creates batches, updates inventory)
   */
  async complete(purchaseId: number): Promise<PurchaseResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'completePurchase',
        params: { purchaseId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to complete purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete purchase');
    }
  }

  /**
   * Cancel a purchase (with reversal if already completed)
   */
  async cancel(purchaseId: number, reason?: string): Promise<PurchaseResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'cancelPurchase',
        params: { purchaseId, reason: reason || '', user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to cancel purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to cancel purchase');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create purchases
   */
  async bulkCreate(purchasesArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'bulkCreatePurchases',
        params: { purchasesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create purchases');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create purchases');
    }
  }

  /**
   * Bulk update purchases
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'bulkUpdatePurchases',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update purchases');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update purchases');
    }
  }

  /**
   * Import purchases from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'importPurchasesCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import purchases');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import purchases');
    }
  }

  /**
   * Export purchases to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<PurchaseExportResponse> {
    try {
      if (!window.backendAPI?.purchase) {
        throw new Error('Electron API (purchase) not available');
      }

      const response = await window.backendAPI.purchase({
        method: 'exportPurchases',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export purchases');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export purchases');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.purchase);
  }

  /**
   * Get total purchase amount for a supplier
   */
  async getSupplierTotal(supplierId: number): Promise<number> {
    try {
      const response = await this.getBySupplier(supplierId, { status: 'completed', limit: 1000 });
      return response.data.items.reduce((sum, p) => sum + p.totalAmount, 0);
    } catch (error) {
      console.error('Error calculating supplier total:', error);
      return 0;
    }
  }

  /**
   * Get pending purchases count
   */
  async getPendingCount(): Promise<number> {
    try {
      const response = await this.getByStatus('pending', { limit: 1 });
      return response.data.total;
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }
  }

  /**
   * Get purchases by date range (convenience method)
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    status?: string
  ): Promise<PurchasesResponse> {
    return this.search({ startDate, endDate, status, limit: 1000 });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const purchaseAPI = new PurchaseAPI();
export default purchaseAPI;