// src/api/core/returnRefund.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface ReturnRefundItem {
  id: number;
  weightKg: number;
  unitPrice: number;
  subtotal: number;
  reason: string | null;
  meatId: number;
  batchId: number;
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
  } | null;
  createdAt: string;
}

export interface ReturnRefund {
  id: number;
  referenceNo: string;
  reason: string | null;
  refundMethod: string;
  totalAmount: number;
  status: 'pending' | 'processed' | 'cancelled';
  saleId: number;
  customerId: number;
  sale?: {
    id: number;
    totalAmount: number;
    status: string;
    timestamp: string;
  } | null;
  customer?: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  items: ReturnRefundItem[];
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedReturns {
  items: ReturnRefund[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReturnStatistics {
  statusCounts: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  totalProcessedAmount: number;
  averageProcessedAmount: number;
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    returnCount: number;
    totalRefunded: number;
  }>;
}

export interface BulkCreateResult {
  created: ReturnRefund[];
  errors: Array<{ return: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: ReturnRefund[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: ReturnRefund[];
  errors: Array<{ row: any; error: string }>;
}

export interface ReturnExportData {
  format: string;
  data: string | ReturnRefund[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface ReturnsResponse {
  status: boolean;
  message: string;
  data: PaginatedReturns;
}

export interface ReturnResponse {
  status: boolean;
  message: string;
  data: ReturnRefund;
}

export interface ReturnStatisticsResponse {
  status: boolean;
  message: string;
  data: ReturnStatistics;
}

export interface ReturnExportResponse {
  status: boolean;
  message: string;
  data: ReturnExportData;
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
// 🧠 ReturnRefundAPI Class
// ----------------------------------------------------------------------

class ReturnRefundAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all returns with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    saleId?: number;
    customerId?: number;
    status?: string;
    refundMethod?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<ReturnsResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'getAllReturns',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch returns');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch returns');
    }
  }

  /**
   * Get a single return by ID
   */
  async getById(id: number): Promise<ReturnResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'getReturnById',
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch return');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch return');
    }
  }

  /**
   * Get returns for a specific sale
   */
  async getBySale(
    saleId: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ReturnsResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'getReturnsBySale',
        params: { saleId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch returns by sale');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch returns by sale');
    }
  }

  /**
   * Get returns for a specific customer
   */
  async getByCustomer(
    customerId: number,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<ReturnsResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'getReturnsByCustomer',
        params: { customerId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch returns by customer');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch returns by customer');
    }
  }

  /**
   * Get returns by status
   */
  async getByStatus(
    status: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ReturnsResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'getReturnsByStatus',
        params: { status, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch returns by status');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch returns by status');
    }
  }

  /**
   * Get return statistics
   */
  async getStatistics(): Promise<ReturnStatisticsResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'getReturnStatistics',
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
   * Search returns with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    saleId?: number;
    customerId?: number;
    status?: string;
    refundMethod?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ReturnsResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'searchReturns',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search returns');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search returns');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new return (pending status)
   */
  async create(data: {
    saleId: number;
    customerId: number;
    refundMethod: string;
    items: Array<{
      meatId: number;
      batchId: number;
      weightKg: number;
      unitPrice: number;
      reason?: string;
    }>;
    reason?: string;
    referenceNo?: string;
  }): Promise<ReturnResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'createReturn',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create return');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create return');
    }
  }

  /**
   * Update an existing return (pending only)
   */
  async update(
    id: number,
    data: Partial<{
      saleId: number;
      customerId: number;
      reason: string;
      refundMethod: string;
      items: Array<{
        meatId: number;
        batchId: number;
        weightKg: number;
        unitPrice: number;
        reason?: string;
      }>;
    }>
  ): Promise<ReturnResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'updateReturn',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update return');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update return');
    }
  }

  /**
   * Cancel a return (soft delete)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'deleteReturn',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Return cancelled successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to cancel return');
    }
  }

  /**
   * Restore a cancelled return (set status to pending)
   */
  async restore(id: number): Promise<ReturnResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'restoreReturn',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore return');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore return');
    }
  }

  /**
   * Permanently delete a return
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'permanentlyDeleteReturn',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Return permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete return');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Process a return (pending -> processed, adds stock back)
   */
  async process(returnId: number): Promise<ReturnResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'processReturn',
        params: { returnId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to process return');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to process return');
    }
  }

  /**
   * Cancel a return (with reversal if already processed)
   */
  async cancel(returnId: number, reason?: string): Promise<ReturnResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'cancelReturn',
        params: { returnId, reason: reason || '', user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to cancel return');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to cancel return');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create returns
   */
  async bulkCreate(returnsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'bulkCreateReturns',
        params: { returnsArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create returns');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create returns');
    }
  }

  /**
   * Bulk update returns
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'bulkUpdateReturns',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update returns');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update returns');
    }
  }

  /**
   * Import returns from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'importReturnsCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import returns');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import returns');
    }
  }

  /**
   * Export returns to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<ReturnExportResponse> {
    try {
      if (!window.backendAPI?.returnRefund) {
        throw new Error('Electron API (returnRefund) not available');
      }

      const response = await window.backendAPI.returnRefund({
        method: 'exportReturns',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export returns');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export returns');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.returnRefund);
  }

  /**
   * Get total refunded amount for a customer
   */
  async getCustomerTotalRefunded(customerId: number): Promise<number> {
    try {
      const response = await this.getByCustomer(customerId, { status: 'processed', limit: 1000 });
      return response.data.items.reduce((sum, r) => sum + r.totalAmount, 0);
    } catch (error) {
      console.error('Error calculating customer total refunded:', error);
      return 0;
    }
  }

  /**
   * Get pending returns count
   */
  async getPendingCount(): Promise<number> {
    try {
      const response = await this.getByStatus('pending', { limit: 1 });
      return response.data.total;
    } catch (error) {
      console.error('Error fetching pending returns count:', error);
      return 0;
    }
  }

  /**
   * Get returns by date range (convenience method)
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    status?: string
  ): Promise<ReturnsResponse> {
    return this.search({ startDate, endDate, status, limit: 1000 });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const returnRefundAPI = new ReturnRefundAPI();
export default returnRefundAPI;