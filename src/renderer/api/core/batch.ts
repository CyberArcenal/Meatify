// src/api/core/batch.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface Batch {
  id: number;
  batchCode: string;
  initialQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  expiryDate: string;
  receivedDate: string;
  status: 'active' | 'depleted' | 'expired' | 'on_hold';
  note: string | null;
  meatId: number;
  supplierId: number | null;
  meat?: {
    id: number;
    name: string;
    sku: string;
  } | null;
  supplier?: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedBatches {
  items: Batch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BatchStatistics {
  byStatus: Record<string, number>;
  totalRemaining: number;
  expiringSoon: number;
  expired: number;
}

export interface BatchFifoDeductionResult {
  batch: Batch;
  deductedWeight: number;
}

export interface BatchDeductionResult {
  batch: Batch;
  deductedWeight: number;
  newRemaining: number;
}

export interface BulkCreateResult {
  created: Batch[];
  errors: Array<{ batch: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Batch[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Batch[];
  errors: Array<{ row: any; error: string }>;
}

export interface BatchExportData {
  format: string;
  data: string | Batch[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface BatchesResponse {
  status: boolean;
  message: string;
  data: PaginatedBatches;
}

export interface BatchResponse {
  status: boolean;
  message: string;
  data: Batch;
}

export interface BatchStatisticsResponse {
  status: boolean;
  message: string;
  data: BatchStatistics;
}

export interface BatchDeductionResponse {
  status: boolean;
  message: string;
  data: BatchDeductionResult;
}

export interface BatchFifoResponse {
  status: boolean;
  message: string;
  data: BatchFifoDeductionResult[];
}

export interface BatchExportResponse {
  status: boolean;
  message: string;
  data: BatchExportData;
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
// 🧠 BatchAPI Class
// ----------------------------------------------------------------------

class BatchAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all batches with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    meatId?: number;
    supplierId?: number;
    status?: string | string[];
    expiryDateFrom?: string;
    expiryDateTo?: string;
    minRemaining?: number;
    maxRemaining?: number;
    search?: string;
    includeInactive?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<BatchesResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'getAllBatches',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch batches');
    }
  }

  /**
   * Get a single batch by ID
   */
  async getById(id: number, includeDeleted: boolean = false): Promise<BatchResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'getBatchById',
        params: { id, includeDeleted },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch batch');
    }
  }

  /**
   * Get all batches for a specific meat
   */
  async getByMeat(meatId: number, includeInactive: boolean = false): Promise<BatchesResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'getBatchesByMeat',
        params: { meatId, includeInactive },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch batches by meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch batches by meat');
    }
  }

  /**
   * Get active batches (with remaining quantity > 0) for a meat
   */
  async getActiveBatches(meatId: number): Promise<BatchesResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'getActiveBatches',
        params: { meatId },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch active batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch active batches');
    }
  }

  /**
   * Get batches expiring within a certain number of days
   */
  async getExpiringBatches(daysThreshold: number = 7): Promise<BatchesResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'getExpiringBatches',
        params: { daysThreshold },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch expiring batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch expiring batches');
    }
  }

  /**
   * Get batch statistics
   */
  async getStatistics(): Promise<BatchStatisticsResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'getBatchStatistics',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch batch statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch batch statistics');
    }
  }

  /**
   * Search batches with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    meatId?: number;
    supplierId?: number;
    status?: string | string[];
    expiryDateFrom?: string;
    expiryDateTo?: string;
    minRemaining?: number;
    maxRemaining?: number;
    page?: number;
    limit?: number;
  }): Promise<BatchesResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'searchBatches',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search batches');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new batch
   */
  async create(data: {
    meatId: number;
    quantity: number;
    unitCost: number;
    expiryDate: string;
    supplierId?: number;
    note?: string;
    batchCode?: string;
  }): Promise<BatchResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'createBatch',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create batch');
    }
  }

  /**
   * Update an existing batch
   */
  async update(
    id: number,
    data: Partial<{
      batchCode: string;
      note: string;
      expiryDate: string;
      unitCost: number;
    }>
  ): Promise<BatchResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'updateBatch',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update batch');
    }
  }

  /**
   * Soft delete a batch (set status to 'depleted' or 'expired')
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'deleteBatch',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Batch deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete batch');
    }
  }

  /**
   * Restore a soft-deleted batch
   */
  async restore(id: number): Promise<BatchResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'restoreBatch',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore batch');
    }
  }

  /**
   * Permanently delete a batch
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'permanentlyDeleteBatch',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Batch permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete batch');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Deduct a specific weight from a batch
   */
  async deductFromBatch(
    batchId: number,
    weightKg: number,
    reason: string = 'sale',
    metadata: any = {}
  ): Promise<BatchDeductionResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'deductFromBatch',
        params: { batchId, weightKg, reason, metadata, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to deduct from batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to deduct from batch');
    }
  }

  /**
   * Perform FIFO deduction across multiple batches for a meat
   */
  async fifoDeduct(
    meatId: number,
    totalWeight: number,
    reason: string = 'sale',
    metadata: any = {}
  ): Promise<BatchFifoResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'fifoDeduct',
        params: { meatId, totalWeight, reason, metadata, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to perform FIFO deduction');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to perform FIFO deduction');
    }
  }

  /**
   * Mark a batch as expired (cron job)
   */
  async markExpired(batchId: number): Promise<BatchResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'markBatchExpired',
        params: { batchId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to mark batch as expired');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark batch as expired');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create batches
   */
  async bulkCreate(batchesArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'bulkCreateBatches',
        params: { batchesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create batches');
    }
  }

  /**
   * Bulk update batches
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'bulkUpdateBatches',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update batches');
    }
  }

  /**
   * Import batches from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'importBatchesCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import batches');
    }
  }

  /**
   * Export batches to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<BatchExportResponse> {
    try {
      if (!window.backendAPI?.batch) {
        throw new Error('Electron API (batch) not available');
      }

      const response = await window.backendAPI.batch({
        method: 'exportBatches',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export batches');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.batch);
  }

  /**
   * Get total remaining quantity for a meat (all active batches)
   */
  async getTotalRemaining(meatId: number): Promise<number> {
    try {
      const response = await this.getActiveBatches(meatId);
      return response.data.items.reduce((sum, b) => sum + b.remainingQuantity, 0);
    } catch (error) {
      console.error('Error fetching total remaining:', error);
      return 0;
    }
  }

  /**
   * Check if a meat has any active batches
   */
  async hasActiveBatches(meatId: number): Promise<boolean> {
    try {
      const response = await this.getActiveBatches(meatId);
      return response.data.items.length > 0;
    } catch (error) {
      console.error('Error checking active batches:', error);
      return false;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const batchAPI = new BatchAPI();
export default batchAPI;