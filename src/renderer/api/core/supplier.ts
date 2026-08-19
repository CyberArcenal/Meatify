// src/api/core/supplier.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface Supplier {
  id: number;
  name: string;
  contactInfo: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  meats?: Array<{
    id: number;
    name: string;
    sku: string;
  }>;
}

export interface PaginatedSuppliers {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupplierStatistics {
  totalActive: number;
  totalInactive: number;
  suppliersWithMeats: Array<{
    id: number;
    name: string;
    meatCount: number;
  }>;
  topSuppliersBySpend: Array<{
    supplierId: number;
    supplierName: string;
    purchaseCount: number;
    totalSpent: number;
  }>;
  supplierBatches: Array<{
    supplierId: number;
    supplierName: string;
    batchCount: number;
    totalRemaining: number;
  }>;
}

export interface SupplierMergeResult {
  sourceSupplier: Supplier;
  targetSupplier: Supplier;
  meatsReassigned: number;
  purchasesReassigned: number;
  batchesReassigned: number;
}

export interface BulkCreateResult {
  created: Supplier[];
  errors: Array<{ supplier: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Supplier[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Supplier[];
  errors: Array<{ row: any; error: string }>;
}

export interface SupplierExportData {
  format: string;
  data: string | Supplier[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface SuppliersResponse {
  status: boolean;
  message: string;
  data: PaginatedSuppliers;
}

export interface SupplierResponse {
  status: boolean;
  message: string;
  data: Supplier;
}

export interface SupplierStatisticsResponse {
  status: boolean;
  message: string;
  data: SupplierStatistics;
}

export interface SupplierMergeResponse {
  status: boolean;
  message: string;
  data: SupplierMergeResult;
}

export interface SupplierExportResponse {
  status: boolean;
  message: string;
  data: SupplierExportData;
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

export interface NotifySupplierResponse {
  status: boolean;
  message: string;
  data: Supplier;
}

// ----------------------------------------------------------------------
// 🧠 SupplierAPI Class
// ----------------------------------------------------------------------

class SupplierAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all suppliers with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<SuppliersResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'getAllSuppliers',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch suppliers');
    }
  }

  /**
   * Get a single supplier by ID
   */
  async getById(id: number, includeInactive: boolean = false): Promise<SupplierResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'getSupplierById',
        params: { id, includeInactive },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch supplier');
    }
  }

  /**
   * Get active suppliers only
   */
  async getActive(): Promise<SuppliersResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'getActiveSuppliers',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch active suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch active suppliers');
    }
  }

  /**
   * Get supplier statistics
   */
  async getStatistics(): Promise<SupplierStatisticsResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'getSupplierStatistics',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch supplier statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch supplier statistics');
    }
  }

  /**
   * Search suppliers with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<SuppliersResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'searchSuppliers',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search suppliers');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new supplier
   */
  async create(data: {
    name: string;
    contactInfo?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<SupplierResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'createSupplier',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create supplier');
    }
  }

  /**
   * Update an existing supplier
   */
  async update(
    id: number,
    data: Partial<{
      name: string;
      contactInfo: string;
      email: string;
      phone: string;
      address: string;
      notes: string;
      isActive: boolean;
    }>
  ): Promise<SupplierResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'updateSupplier',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update supplier');
    }
  }

  /**
   * Soft delete a supplier (set isActive = false)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'deleteSupplier',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Supplier deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete supplier');
    }
  }

  /**
   * Restore a soft-deleted supplier
   */
  async restore(id: number): Promise<SupplierResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'restoreSupplier',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore supplier');
    }
  }

  /**
   * Permanently delete a supplier
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'permanentlyDeleteSupplier',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Supplier permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete supplier');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Activate a supplier (set isActive = true)
   */
  async activate(supplierId: number): Promise<SupplierResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'activateSupplier',
        params: { supplierId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to activate supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to activate supplier');
    }
  }

  /**
   * Deactivate a supplier (set isActive = false) with optional reassignment
   */
  async deactivate(
    supplierId: number,
    options?: {
      reassignToSupplierId?: number;
      allowWithPendingPurchases?: boolean;
    }
  ): Promise<SupplierResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'deactivateSupplier',
        params: { 
          supplierId, 
          ...options,
          user: 'system' 
        },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to deactivate supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to deactivate supplier');
    }
  }

  /**
   * Merge a source supplier into a target supplier
   */
  async mergeSuppliers(
    sourceSupplierId: number,
    targetSupplierId: number
  ): Promise<SupplierMergeResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'mergeSuppliers',
        params: { sourceSupplierId, targetSupplierId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to merge suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to merge suppliers');
    }
  }

  /**
   * Send notification to a supplier (email/SMS)
   */
  async notify(
    supplierId: number,
    subject: string,
    message: string
  ): Promise<NotifySupplierResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'notifySupplier',
        params: { supplierId, subject, message, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to notify supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to notify supplier');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create suppliers
   */
  async bulkCreate(suppliersArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'bulkCreateSuppliers',
        params: { suppliersArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create suppliers');
    }
  }

  /**
   * Bulk update suppliers
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'bulkUpdateSuppliers',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update suppliers');
    }
  }

  /**
   * Import suppliers from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'importSuppliersCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import suppliers');
    }
  }

  /**
   * Export suppliers to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<SupplierExportResponse> {
    try {
      if (!window.backendAPI?.supplier) {
        throw new Error('Electron API (supplier) not available');
      }

      const response = await window.backendAPI.supplier({
        method: 'exportSuppliers',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export suppliers');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.supplier);
  }

  /**
   * Get total count of active suppliers
   */
  async getActiveCount(): Promise<number> {
    try {
      const response = await this.getStatistics();
      return response.data.totalActive;
    } catch (error) {
      console.error('Error fetching active supplier count:', error);
      return 0;
    }
  }

  /**
   * Get supplier by name (convenience method)
   */
  async getByName(name: string): Promise<Supplier | null> {
    try {
      const response = await this.search({ searchTerm: name, limit: 1 });
      return response.data.items[0] || null;
    } catch (error) {
      console.error('Error fetching supplier by name:', error);
      return null;
    }
  }

  /**
   * Get supplier by email (convenience method)
   */
  async getByEmail(email: string): Promise<Supplier | null> {
    try {
      const response = await this.search({ searchTerm: email, limit: 1 });
      return response.data.items[0] || null;
    } catch (error) {
      console.error('Error fetching supplier by email:', error);
      return null;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const supplierAPI = new SupplierAPI();
export default supplierAPI;