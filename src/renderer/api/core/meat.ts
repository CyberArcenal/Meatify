// src/api/core/meat.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface Meat {
  id: number;
  sku: string;
  name: string;
  barcode: string | null;
  description: string | null;
  pricePerKg: number;
  image: string | null;
  isActive: boolean;
  categoryId?: number | null;
  supplierId?: number | null;
  category?: {
    id: number;
    name: string;
    isActive: boolean;
  } | null;
  supplier?: {
    id: number;
    name: string;
    isActive: boolean;
  } | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedMeats {
  items: Meat[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MeatStatistics {
  totalActive: number;
  totalInactive: number;
  averagePricePerKg: number;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    count: number;
  }>;
}

export interface BulkCreateResult {
  created: Meat[];
  errors: Array<{ meat: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Meat[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Meat[];
  errors: Array<{ row: any; error: string }>;
}

export interface MeatExportData {
  format: string;
  data: string | Meat[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface MeatsResponse {
  status: boolean;
  message: string;
  data: PaginatedMeats;
}

export interface MeatResponse {
  status: boolean;
  message: string;
  data: Meat;
}

export interface MeatStatisticsResponse {
  status: boolean;
  message: string;
  data: MeatStatistics;
}

export interface MeatExportResponse {
  status: boolean;
  message: string;
  data: MeatExportData;
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
// 🧠 MeatAPI Class
// ----------------------------------------------------------------------

class MeatAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all meats with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    categoryId?: number;
    supplierId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<MeatsResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'getAllMeats',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch meats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch meats');
    }
  }

  /**
   * Get a single meat by ID
   */
  async getById(id: number, includeInactive: boolean = false): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'getMeatById',
        params: { id, includeInactive },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch meat');
    }
  }

  /**
   * Get active meats only
   */
  async getActive(params?: {
    categoryId?: number;
    search?: string;
  }): Promise<MeatsResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'getActiveMeats',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch active meats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch active meats');
    }
  }

  /**
   * Get a meat by SKU
   */
  async getBySku(sku: string): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'getMeatBySku',
        params: { sku },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch meat by SKU');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch meat by SKU');
    }
  }

  /**
   * Get a meat by barcode
   */
  async getByBarcode(barcode: string): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'getMeatByBarcode',
        params: { barcode },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch meat by barcode');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch meat by barcode');
    }
  }

  /**
   * Get meat statistics
   */
  async getStatistics(): Promise<MeatStatisticsResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'getMeatStatistics',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch meat statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch meat statistics');
    }
  }

  /**
   * Search meats with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    categoryId?: number;
    supplierId?: number;
    isActive?: boolean;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }): Promise<MeatsResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'searchMeats',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search meats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search meats');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new meat
   */
  async create(data: {
    name: string;
    sku?: string;
    barcode?: string;
    description?: string;
    pricePerKg: number;
    isActive?: boolean;
    categoryId?: number;
    supplierId?: number;
    image?: string;
  }): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'createMeat',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create meat');
    }
  }

  /**
   * Update an existing meat
   */
  async update(
    id: number,
    data: Partial<{
      name: string;
      sku: string;
      barcode: string;
      description: string;
      pricePerKg: number;
      isActive: boolean;
      categoryId: number;
      supplierId: number;
      image: string;
    }>
  ): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'updateMeat',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update meat');
    }
  }

  /**
   * Soft delete a meat (set isActive = false)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'deleteMeat',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Meat deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete meat');
    }
  }

  /**
   * Restore a soft-deleted meat
   */
  async restore(id: number): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'restoreMeat',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore meat');
    }
  }

  /**
   * Permanently delete a meat
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'permanentlyDeleteMeat',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Meat permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete meat');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Activate a meat (set isActive = true)
   */
  async activate(meatId: number): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'activateMeat',
        params: { meatId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to activate meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to activate meat');
    }
  }

  /**
   * Deactivate a meat (set isActive = false)
   */
  async deactivate(meatId: number): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'deactivateMeat',
        params: { meatId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to deactivate meat');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to deactivate meat');
    }
  }

  /**
   * Update meat price per kg
   */
  async updatePrice(meatId: number, newPrice: number): Promise<MeatResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'updateMeatPrice',
        params: { meatId, newPrice, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update meat price');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update meat price');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create meats
   */
  async bulkCreate(meatsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'bulkCreateMeats',
        params: { meatsArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create meats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create meats');
    }
  }

  /**
   * Bulk update meats
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'bulkUpdateMeats',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update meats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update meats');
    }
  }

  /**
   * Import meats from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'importMeatsCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import meats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import meats');
    }
  }

  /**
   * Export meats to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<MeatExportResponse> {
    try {
      if (!window.backendAPI?.meat) {
        throw new Error('Electron API (meat) not available');
      }

      const response = await window.backendAPI.meat({
        method: 'exportMeats',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export meats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export meats');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.meat);
  }

  /**
   * Get total count of active meats
   */
  async getActiveCount(): Promise<number> {
    try {
      const response = await this.getStatistics();
      return response.data.totalActive;
    } catch (error) {
      console.error('Error fetching active meat count:', error);
      return 0;
    }
  }

  /**
   * Get a meat by name (convenience method)
   */
  async getByName(name: string): Promise<Meat | null> {
    try {
      const response = await this.search({ searchTerm: name, limit: 1 });
      return response.data.items[0] || null;
    } catch (error) {
      console.error('Error fetching meat by name:', error);
      return null;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const meatAPI = new MeatAPI();
export default meatAPI;