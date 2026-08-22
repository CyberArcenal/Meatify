// src/api/core/category.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  meats?: Array<{
    id: number;
    name: string;
    sku: string;
    pricePerKg: number;
  }>;
}

export interface CategoryWithProductCount {
  id: number;
  name: string;
  productCount: number;
}

export interface PaginatedCategories {
  items: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryStatistics {
  totalActive: number;
  totalInactive: number;
  totalMeats: number;
  categoriesWithMeats: Array<{   // ✅ This is the correct field name
    id: number;
    name: string;
    meatCount: number;           // ✅ This is the correct property name
  }>;
}

export interface CategoryMergeResult {
  sourceCategory: Category;
  targetCategory: Category;
  meatsReassigned: number;
}

export interface BulkCreateResult {
  created: Category[];
  errors: Array<{ category: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Category[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Category[];
  errors: Array<{ row: any; error: string }>;
}

export interface CategoryExportData {
  format: string;
  data: string | Category[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface CategoriesResponse {
  status: boolean;
  message: string;
  data: PaginatedCategories;
}

export interface CategoryResponse {
  status: boolean;
  message: string;
  data: Category;
}

export interface CategoryStatisticsResponse {
  status: boolean;
  message: string;
  data: CategoryStatistics;
}

export interface CategoryMergeResponse {
  status: boolean;
  message: string;
  data: CategoryMergeResult;
}

export interface CategoryExportResponse {
  status: boolean;
  message: string;
  data: CategoryExportData;
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
// 🧠 CategoryAPI Class
// ----------------------------------------------------------------------

class CategoryAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all categories with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<CategoriesResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'getAllCategories',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch categories');
    }
  }

  /**
   * Get a single category by ID
   */
  async getById(id: number, includeInactive: boolean = false): Promise<CategoryResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'getCategoryById',
        params: { id, includeInactive },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch category');
    }
  }

  /**
   * Get active categories only
   */
  async getActive(): Promise<CategoriesResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'getActiveCategories',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch active categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch active categories');
    }
  }

  /**
   * Get category statistics
   */
  async getStatistics(): Promise<CategoryStatisticsResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'getCategoryStatistics',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch category statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch category statistics');
    }
  }

  /**
   * Search categories with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<CategoriesResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'searchCategories',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search categories');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new category
   */
  async create(data: {
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<CategoryResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'createCategory',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create category');
    }
  }

  /**
   * Update an existing category
   */
  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      isActive: boolean;
    }>
  ): Promise<CategoryResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'updateCategory',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update category');
    }
  }

  /**
   * Soft delete a category (set isActive = false)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'deleteCategory',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Category deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete category');
    }
  }

  /**
   * Restore a soft-deleted category
   */
  async restore(id: number): Promise<CategoryResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'restoreCategory',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore category');
    }
  }

  /**
   * Permanently delete a category
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'permanentlyDeleteCategory',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Category permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete category');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Activate a category (set isActive = true)
   */
  async activate(categoryId: number): Promise<CategoryResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'activateCategory',
        params: { categoryId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to activate category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to activate category');
    }
  }

  /**
   * Deactivate a category (set isActive = false) with optional reassignment
   */
  async deactivate(
    categoryId: number,
    reassignToCategoryId?: number
  ): Promise<CategoryResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'deactivateCategory',
        params: { categoryId, reassignToCategoryId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to deactivate category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to deactivate category');
    }
  }

  /**
   * Merge a source category into a target category
   */
  async mergeCategories(
    sourceCategoryId: number,
    targetCategoryId: number
  ): Promise<CategoryMergeResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'mergeCategories',
        params: { sourceCategoryId, targetCategoryId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to merge categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to merge categories');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create categories
   */
  async bulkCreate(categoriesArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'bulkCreateCategories',
        params: { categoriesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create categories');
    }
  }

  /**
   * Bulk update categories
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'bulkUpdateCategories',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update categories');
    }
  }

  /**
   * Import categories from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'importCategoriesCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import categories');
    }
  }

  /**
   * Export categories to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<CategoryExportResponse> {
    try {
      if (!window.backendAPI?.category) {
        throw new Error('Electron API (category) not available');
      }

      const response = await window.backendAPI.category({
        method: 'exportCategories',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export categories');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.category);
  }

  /**
   * Get total count of active categories
   */
  async getActiveCount(): Promise<number> {
    try {
      const response = await this.getStatistics();
      return response.data.totalActive;
    } catch (error) {
      console.error('Error fetching active category count:', error);
      return 0;
    }
  }

  /**
   * Get category by name (convenience method)
   */
  async getByName(name: string): Promise<Category | null> {
    try {
      const response = await this.search({ searchTerm: name, limit: 1 });
      return response.data.items[0] || null;
    } catch (error) {
      console.error('Error fetching category by name:', error);
      return null;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const categoryAPI = new CategoryAPI();
export default categoryAPI;