// src/api/core/sale.ts

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
  meatId: number;
  batchId: number | null;
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

export interface Sale {
  id: number;
  timestamp: string;
  status: "initiated" | "paid" | "refunded" | "voided";
  paymentMethod: "cash" | "card" | "wallet";
  totalAmount: number;
  usedLoyalty: boolean;
  loyaltyRedeemed: number;
  usedDiscount: boolean;
  totalDiscount: number;
  usedVoucher: boolean;
  voucherCode: string | null;
  pointsEarn: number;
  notes: string | null;
  customerId: number | null;
  customer?: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    loyaltyPointsBalance: number;
  } | null;
  saleItems: SaleItem[];
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedSales {
  items: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaleStatistics {
  byStatus: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  totalRevenue: number;
  averageSale: number;
  todaySales: number;
  totalWeightSold: number;
}

export interface BulkCreateResult {
  created: Sale[];
  errors: Array<{ sale: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Sale[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Sale[];
  errors: Array<{ row: any; error: string }>;
}

export interface SaleExportData {
  format: string;
  data: string | Sale[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface SalesResponse {
  status: boolean;
  message: string;
  data: PaginatedSales;
}

export interface SaleResponse {
  status: boolean;
  message: string;
  data: Sale;
}

export interface SaleStatisticsResponse {
  status: boolean;
  message: string;
  data: SaleStatistics;
}

export interface SaleExportResponse {
  status: boolean;
  message: string;
  data: SaleExportData;
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
// 🧠 SaleAPI Class
// ----------------------------------------------------------------------

class SaleAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all sales with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    customerId?: number;
    status?: string | string[];
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<SalesResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "getAllSales",
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch sales");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch sales");
    }
  }

  /**
   * Get a single sale by ID
   */
  async getById(id: number): Promise<SaleResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "getSaleById",
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch sale");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch sale");
    }
  }

  /**
   * Get sales for a specific customer
   */
  async getByCustomer(
    customerId: number,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<SalesResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "getSalesByCustomer",
        params: { customerId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch sales by customer");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch sales by customer");
    }
  }

  /**
   * Get sales by status
   */
  async getByStatus(
    status: string,
    params?: {
      page?: number;
      limit?: number;
    },
  ): Promise<SalesResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "getSalesByStatus",
        params: { status, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch sales by status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch sales by status");
    }
  }

  /**
   * Get sales within a date range
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<SalesResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "getSalesByDateRange",
        params: { startDate, endDate, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to fetch sales by date range",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch sales by date range");
    }
  }

  /**
   * Get sale statistics
   */
  async getStatistics(): Promise<SaleStatisticsResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "getSaleStatistics",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch statistics");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch statistics");
    }
  }

  /**
   * Search sales with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    customerId?: number;
    status?: string | string[];
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    limit?: number;
  }): Promise<SalesResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "searchSales",
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to search sales");
    } catch (error: any) {
      throw new Error(error.message || "Failed to search sales");
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new sale (initiated status)
   */
  async create(data: {
    items: Array<{
      meatId: number;
      weightKg: number;
      unitPrice?: number;
      discount?: number;
      tax?: number;
      batchId?: number;
    }>;

    customerId?: number;
    paymentMethod?: "cash" | "card" | "wallet";
    notes?: string;
    loyaltyRedeemed?: number;
    voucherCode?: string;
  }): Promise<SaleResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "createSale",
        params: { ...data, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to create sale");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create sale");
    }
  }

  /**
   * Update an existing sale (initiated only)
   */
  async update(
    id: number,
    data: Partial<{
      items: Array<{
        meatId: number;
        weightKg: number;
        unitPrice?: number;
        discount?: number;
        tax?: number;
      }>;
      customerId: number;
      paymentMethod: "cash" | "card" | "wallet";
      notes: string;
      voucherCode: string;
      loyaltyRedeemed: number;
    }>,
  ): Promise<SaleResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "updateSale",
        params: { id, ...data, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to update sale");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update sale");
    }
  }

  /**
   * Delete a sale (permanent - initiated or voided only)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "deleteSale",
        params: { id, user: "system" },
      });

      return {
        status: response.status,
        message: response.message || "Sale deleted successfully",
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete sale");
    }
  }

  /**
   * Restore a voided sale (set status back to initiated)
   */
  async restore(id: number): Promise<SaleResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "restoreSale",
        params: { id, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to restore sale");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore sale");
    }
  }

  /**
   * Permanently delete a sale
   */
  async permanentlyDelete(
    id: number,
  ): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "permanentlyDeleteSale",
        params: { id, user: "system" },
      });

      return {
        status: response.status,
        message: response.message || "Sale permanently deleted",
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to permanently delete sale");
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Mark a sale as paid (triggers FIFO batch deduction, loyalty, etc.)
   */
  async markAsPaid(saleId: number): Promise<SaleResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "markAsPaid",
        params: { saleId, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to mark sale as paid");
    } catch (error: any) {
      throw new Error(error.message || "Failed to mark sale as paid");
    }
  }

  /**
   * Refund a paid sale (reverses stock, loyalty points)
   */
  async refund(saleId: number, reason?: string): Promise<SaleResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "refundSale",
        params: { saleId, reason: reason || "", user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to refund sale");
    } catch (error: any) {
      throw new Error(error.message || "Failed to refund sale");
    }
  }

  /**
   * Void an initiated sale (cancel before payment)
   */
  async void(saleId: number, reason?: string): Promise<SaleResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "voidSale",
        params: { saleId, reason: reason || "", user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to void sale");
    } catch (error: any) {
      throw new Error(error.message || "Failed to void sale");
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create sales
   */
  async bulkCreate(salesArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "bulkCreateSales",
        params: { salesArray, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk create sales");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk create sales");
    }
  }

  /**
   * Bulk update sales
   */
  async bulkUpdate(
    updatesArray: Array<{ id: number; updates: any }>,
  ): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "bulkUpdateSales",
        params: { updatesArray, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk update sales");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk update sales");
    }
  }

  /**
   * Import sales from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "importSalesCSV",
        params: { filePath, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to import sales");
    } catch (error: any) {
      throw new Error(error.message || "Failed to import sales");
    }
  }

  /**
   * Export sales to CSV or JSON
   */
  async export(params?: {
    format?: "csv" | "json";
    filters?: any;
  }): Promise<SaleExportResponse> {
    try {
      if (!window.backendAPI?.sale) {
        throw new Error("Electron API (sale) not available");
      }

      const response = await window.backendAPI.sale({
        method: "exportSales",
        params: params || { format: "json" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to export sales");
    } catch (error: any) {
      throw new Error(error.message || "Failed to export sales");
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!window.backendAPI?.sale;
  }

  /**
   * Get today's sales total
   */
  async getTodayTotal(): Promise<number> {
    try {
      const stats = await this.getStatistics();
      return stats.data.totalRevenue || 0;
    } catch (error) {
      console.error("Error fetching today's sales total:", error);
      return 0;
    }
  }

  /**
   * Get today's sales count
   */
  async getTodayCount(): Promise<number> {
    try {
      const stats = await this.getStatistics();
      return stats.data.todaySales || 0;
    } catch (error) {
      console.error("Error fetching today's sales count:", error);
      return 0;
    }
  }

  /**
   * Get total weight sold today
   */
  async getTodayWeight(): Promise<number> {
    try {
      const stats = await this.getStatistics();
      return stats.data.totalWeightSold || 0;
    } catch (error) {
      console.error("Error fetching today's weight sold:", error);
      return 0;
    }
  }

  /**
   * Get a receipt for a sale
   */
  async getReceipt(saleId: number): Promise<{
    receiptNumber: string;
    date: string;
    customer: any;
    items: any[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    status: string;
  }> {
    // This would call an IPC method that generates receipt
    // For now, we fetch the sale and format it
    try {
      const response = await this.getById(saleId);
      const sale = response.data;
      return {
        receiptNumber: `RCP-${sale.id.toString().padStart(6, "0")}`,
        date: sale.timestamp,
        customer: sale.customer,
        items: sale.saleItems.map((item) => ({
          product: item.meat?.name || "Unknown",
          sku: item.meat?.sku || "",
          weight: item.weightKg,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: item.tax,
          lineTotal: item.lineTotal,
        })),
        subtotal: sale.saleItems.reduce(
          (sum, i) => sum + i.unitPrice * i.weightKg,
          0,
        ),
        tax: sale.saleItems.reduce((sum, i) => sum + i.tax, 0),
        discount: sale.saleItems.reduce((sum, i) => sum + i.discount, 0),
        total: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
      };
    } catch (error) {
      console.error("Error generating receipt:", error);
      throw error;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const saleAPI = new SaleAPI();
export default saleAPI;
