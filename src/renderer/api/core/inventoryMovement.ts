// src/api/core/inventoryMovement.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface InventoryMovement {
  id: number;
  movementType: 'sale' | 'refund' | 'adjustment' | 'purchase' | 'expiry_write_off';
  qtyChange: number;
  notes: string | null;
  timestamp: string;
  meatId: number;
  batchId: number | null;
  saleId: number | null;
  meat?: {
    id: number;
    name: string;
    sku: string;
  } | null;
  batch?: {
    id: number;
    batchCode: string;
  } | null;
  sale?: {
    id: number;
    totalAmount: number;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedMovements {
  items: InventoryMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MovementStatistics {
  byType: Array<{
    type: string;
    count: number;
    totalChange: number;
  }>;
  totalNet: number;
  totalIn: number;
  totalOut: number;
  last7Days: number;
}

export interface BulkCreateResult {
  created: InventoryMovement[];
  errors: Array<{ movement: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: InventoryMovement[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: InventoryMovement[];
  errors: Array<{ row: any; error: string }>;
}

export interface MovementExportData {
  format: string;
  data: string | InventoryMovement[];
  filename: string;
}

export interface RecalcBatchResult {
  id: number;
  batchCode: string;
  initialQuantity: number;
  oldRemaining: number;
  newRemaining: number;
  status: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface MovementsResponse {
  status: boolean;
  message: string;
  data: PaginatedMovements;
}

export interface MovementResponse {
  status: boolean;
  message: string;
  data: InventoryMovement;
}

export interface MovementStatisticsResponse {
  status: boolean;
  message: string;
  data: MovementStatistics;
}

export interface MovementExportResponse {
  status: boolean;
  message: string;
  data: MovementExportData;
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

export interface RecalcBatchResponse {
  status: boolean;
  message: string;
  data: RecalcBatchResult;
}

// ----------------------------------------------------------------------
// 🧠 InventoryMovementAPI Class
// ----------------------------------------------------------------------

class InventoryMovementAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all inventory movements with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    meatId?: number;
    batchId?: number;
    saleId?: number;
    movementType?: string | string[];
    startDate?: string;
    endDate?: string;
    direction?: 'positive' | 'negative';
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<MovementsResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'getAllMovements',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch inventory movements');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch inventory movements');
    }
  }

  /**
   * Get a single inventory movement by ID
   */
  async getById(id: number): Promise<MovementResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'getMovementById',
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch inventory movement');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch inventory movement');
    }
  }

  /**
   * Get movements for a specific meat
   */
  async getByMeat(meatId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<MovementsResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'getMovementsByMeat',
        params: { meatId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch movements by meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch movements by meat');
    }
  }

  /**
   * Get movements for a specific batch
   */
  async getByBatch(batchId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<MovementsResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'getMovementsByBatch',
        params: { batchId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch movements by batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch movements by batch');
    }
  }

  /**
   * Get movements for a specific sale
   */
  async getBySale(saleId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<MovementsResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'getMovementsBySale',
        params: { saleId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch movements by sale');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch movements by sale');
    }
  }

  /**
   * Get inventory movement statistics
   */
  async getStatistics(): Promise<MovementStatisticsResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'getMovementStatistics',
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
   * Search inventory movements with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    meatId?: number;
    batchId?: number;
    saleId?: number;
    movementType?: string | string[];
    startDate?: string;
    endDate?: string;
    direction?: 'positive' | 'negative';
    page?: number;
    limit?: number;
  }): Promise<MovementsResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'searchMovements',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search movements');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search movements');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new inventory movement (manual adjustment)
   */
  async create(data: {
    meatId: number;
    batchId?: number;
    movementType: 'sale' | 'refund' | 'adjustment' | 'purchase' | 'expiry_write_off';
    qtyChange: number;
    notes?: string;
    saleId?: number;
  }): Promise<MovementResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'createMovement',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create movement');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create movement');
    }
  }

  /**
   * Update an existing inventory movement (only notes, movementType, timestamp)
   */
  async update(
    id: number,
    data: Partial<{
      movementType: string;
      notes: string;
      timestamp: string;
    }>
  ): Promise<MovementResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'updateMovement',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update movement');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update movement');
    }
  }

  /**
   * Delete an inventory movement (hard delete)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'deleteMovement',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Movement deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete movement');
    }
  }

  /**
   * Permanently delete an inventory movement
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'permanentlyDeleteMovement',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Movement permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete movement');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Recalculate a batch's remaining quantity from all its movements
   */
  async recalcBatchRemaining(batchId: number): Promise<RecalcBatchResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'recalcBatchRemaining',
        params: { batchId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to recalculate batch');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to recalculate batch');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create inventory movements
   */
  async bulkCreate(movementsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'bulkCreateMovements',
        params: { movementsArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create movements');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create movements');
    }
  }

  /**
   * Bulk update inventory movements
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'bulkUpdateMovements',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update movements');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update movements');
    }
  }

  /**
   * Import inventory movements from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'importMovementsCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import movements');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import movements');
    }
  }

  /**
   * Export inventory movements to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<MovementExportResponse> {
    try {
      if (!window.backendAPI?.inventoryMovement) {
        throw new Error('Electron API (inventoryMovement) not available');
      }

      const response = await window.backendAPI.inventoryMovement({
        method: 'exportMovements',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export movements');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export movements');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.inventoryMovement);
  }

  /**
   * Get net movement for a meat (total in - total out)
   */
  async getNetMovement(meatId: number): Promise<number> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      return response.data.items.reduce((sum, m) => sum + m.qtyChange, 0);
    } catch (error) {
      console.error('Error calculating net movement:', error);
      return 0;
    }
  }

  /**
   * Get total quantity moved (in + out) for a meat
   */
  async getTotalMoved(meatId: number): Promise<{ in: number; out: number }> {
    try {
      const response = await this.getByMeat(meatId, { limit: 1000 });
      const totalIn = response.data.items
        .filter(m => m.qtyChange > 0)
        .reduce((sum, m) => sum + m.qtyChange, 0);
      const totalOut = response.data.items
        .filter(m => m.qtyChange < 0)
        .reduce((sum, m) => sum + Math.abs(m.qtyChange), 0);
      return { in: totalIn, out: totalOut };
    } catch (error) {
      console.error('Error calculating total moved:', error);
      return { in: 0, out: 0 };
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const inventoryMovementAPI = new InventoryMovementAPI();
export default inventoryMovementAPI;