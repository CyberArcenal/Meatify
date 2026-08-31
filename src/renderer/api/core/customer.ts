// src/api/core/customer.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  loyaltyPointsBalance: number;
  lifetimePointsEarned: number;
  status: "regular" | "vip" | "elite";
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerStatistics {
  totalActive: number;
  totalInactive: number;
  byStatus: {
    regular: number;
    vip: number;
    elite: number;
  };
  averageLoyaltyPoints: number;
  customersWithPoints: number;
  topCustomers: Array<{
    id: number;
    name: string;
    points: number;
    status: string;
  }>;
}

export interface LoyaltyTransaction {
  id: number;
  pointsChange: number;
  transactionType: "earn" | "redeem" | "adjustment" | "refund";
  notes: string | null;
  customerId: number;
  saleId: number | null;
  timestamp: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface LoyaltySummary {
  customerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  currentBalance: number;
  lifetimeEarned: number;
  status: "regular" | "vip" | "elite";
  vipThreshold: number;
  eliteThreshold: number;
  pointRate: number;
  totalEarned: number;
  totalRedeemed: number;
  totalAdjusted: number;
  transactionCount: number;
  nextTier: "vip" | "elite" | null;
  pointsToNextTier: number;
}

export interface LoyaltySummaryData {
  customer: Customer;
  summary: LoyaltySummary;
  transactions: LoyaltyTransaction[];
}

export interface BulkCreateResult {
  created: Customer[];
  errors: Array<{ customer: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Customer[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Customer[];
  errors: Array<{ row: any; error: string }>;
}

export interface CustomerExportData {
  format: string;
  data: string | Customer[];
  filename: string;
}

export interface EarnPointsResult {
  customer: Customer;
  pointsEarned: number;
}

export interface RedeemPointsResult {
  customer: Customer;
  pointsRedeemed: number;
}

export interface AdjustPointsResult {
  customer: Customer;
  pointsChanged: number;
}

export interface ReverseTransactionResult {
  customer: Customer;
  transaction: LoyaltyTransaction;
  reversalTransaction: LoyaltyTransaction;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface CustomersResponse {
  status: boolean;
  message: string;
  data: PaginatedCustomers;
}

export interface CustomerResponse {
  status: boolean;
  message: string;
  data: Customer;
}

export interface CustomerStatisticsResponse {
  status: boolean;
  message: string;
  data: CustomerStatistics;
}

export interface CustomerExportResponse {
  status: boolean;
  message: string;
  data: CustomerExportData;
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

export interface LoyaltySummaryResponse {
  status: boolean;
  message: string;
  data: LoyaltySummaryData;
}

export interface EarnPointsResponse {
  status: boolean;
  message: string;
  data: EarnPointsResult;
}

export interface RedeemPointsResponse {
  status: boolean;
  message: string;
  data: RedeemPointsResult;
}

export interface AdjustPointsResponse {
  status: boolean;
  message: string;
  data: AdjustPointsResult;
}

export interface ReverseTransactionResponse {
  status: boolean;
  message: string;
  data: ReverseTransactionResult;
}

// ----------------------------------------------------------------------
// 🧠 CustomerAPI Class
// ----------------------------------------------------------------------

class CustomerAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all customers with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    status?: string | string[];
    minPoints?: number;
    maxPoints?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<CustomersResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "getAllCustomers",
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch customers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch customers");
    }
  }

  /**
   * Get a single customer by ID
   */
  async getById(
    id: number,
    includeInactive: boolean = false,
  ): Promise<CustomerResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "getCustomerById",
        params: { id, includeInactive },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch customer");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch customer");
    }
  }

  /**
   * Get active customers only
   */
  async getActive(): Promise<CustomersResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "getActiveCustomers",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch active customers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch active customers");
    }
  }

  /**
   * Get customer statistics
   */
  async getStatistics(): Promise<CustomerStatisticsResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "getCustomerStatistics",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to fetch customer statistics",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch customer statistics");
    }
  }

  /**
   * Search customers with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    isActive?: boolean;
    status?: string | string[];
    minPoints?: number;
    maxPoints?: number;
    page?: number;
    limit?: number;
  }): Promise<CustomersResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "searchCustomers",
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to search customers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to search customers");
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new customer
   */
  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<CustomerResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "createCustomer",
        params: { ...data, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to create customer");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create customer");
    }
  }

  /**
   * Update an existing customer
   * Note: Loyalty points cannot be updated through this method.
   * Use earnPoints, redeemPoints, or adjustPoints instead.
   */
  async update(
    id: number,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      address: string;
      notes: string;
      isActive: boolean;
    }>,
  ): Promise<CustomerResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "updateCustomer",
        params: { id, ...data, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to update customer");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update customer");
    }
  }

  /**
   * Soft delete a customer (set isActive = false)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "deleteCustomer",
        params: { id, user: "system" },
      });

      return {
        status: response.status,
        message: response.message || "Customer deleted successfully",
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete customer");
    }
  }

  /**
   * Restore a soft-deleted customer
   */
  async restore(id: number): Promise<CustomerResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "restoreCustomer",
        params: { id, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to restore customer");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore customer");
    }
  }

  /**
   * Permanently delete a customer
   */
  async permanentlyDelete(
    id: number,
  ): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "permanentlyDeleteCustomer",
        params: { id, user: "system" },
      });

      return {
        status: response.status,
        message: response.message || "Customer permanently deleted",
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to permanently delete customer");
    }
  }

  // --------------------------------------------------------------------
  // 🔄 LOYALTY TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Earn loyalty points for a customer (from a sale)
   */
  async earnPoints(
    customerId: number,
    amountSpent: number,
    saleId: number,
  ): Promise<EarnPointsResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "earnPoints",
        params: { customerId, amountSpent, saleId, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to earn points");
    } catch (error: any) {
      throw new Error(error.message || "Failed to earn points");
    }
  }

  /**
   * Redeem loyalty points (from a sale)
   */
  async redeemPoints(
    customerId: number,
    pointsToRedeem: number,
    saleId: number,
  ): Promise<RedeemPointsResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "redeemPoints",
        params: { customerId, pointsToRedeem, saleId, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to redeem points");
    } catch (error: any) {
      throw new Error(error.message || "Failed to redeem points");
    }
  }

  /**
   * Manually adjust loyalty points (admin adjustment)
   */
  async adjustPoints(
    customerId: number,
    pointsChange: number,
    reason: string,
  ): Promise<AdjustPointsResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "adjustPoints",
        params: { customerId, pointsChange, reason, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to adjust points");
    } catch (error: any) {
      throw new Error(error.message || "Failed to adjust points");
    }
  }

  /**
   * Reverse a loyalty transaction (for refunds, cancellations)
   */
  async reverseTransaction(
    transactionId: number,
    reason: string,
  ): Promise<ReverseTransactionResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "reverseTransaction",
        params: { transactionId, reason, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to reverse transaction");
    } catch (error: any) {
      throw new Error(error.message || "Failed to reverse transaction");
    }
  }

  /**
   * Get loyalty summary for a customer
   */
  async getLoyaltySummary(customerId: number): Promise<LoyaltySummaryResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "getLoyaltySummary",
        params: { customerId },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get loyalty summary");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get loyalty summary");
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create customers
   */
  async bulkCreate(customersArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "bulkCreateCustomers",
        params: { customersArray, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk create customers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk create customers");
    }
  }

  /**
   * Bulk update customers
   */
  async bulkUpdate(
    updatesArray: Array<{ id: number; updates: any }>,
  ): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "bulkUpdateCustomers",
        params: { updatesArray, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk update customers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk update customers");
    }
  }

  /**
   * Import customers from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "importCustomersCSV",
        params: { filePath, user: "system" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to import customers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to import customers");
    }
  }

  /**
   * Export customers to CSV or JSON
   */
  async export(params?: {
    format?: "csv" | "json";
    filters?: any;
  }): Promise<CustomerExportResponse> {
    try {
      if (!window.backendAPI?.customer) {
        throw new Error("Electron API (customer) not available");
      }

      const response = await window.backendAPI.customer({
        method: "exportCustomers",
        params: params || { format: "json" },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to export customers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to export customers");
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!window.backendAPI?.customer;
  }

  /**
   * Get total count of active customers
   */
  async getActiveCount(): Promise<number> {
    try {
      const response = await this.getStatistics();
      return response.data.totalActive;
    } catch (error) {
      console.error("Error fetching active customer count:", error);
      return 0;
    }
  }

  /**
   * Get customer by email (convenience method)
   */
  async getByEmail(email: string): Promise<Customer | null> {
    try {
      const response = await this.search({ searchTerm: email, limit: 1 });
      return response.data.items[0] || null;
    } catch (error) {
      console.error("Error fetching customer by email:", error);
      return null;
    }
  }

  /**
   * Get customer by phone (convenience method)
   */
  async getByPhone(phone: string): Promise<Customer | null> {
    try {
      const response = await this.search({ searchTerm: phone, limit: 1 });
      return response.data.items[0] || null;
    } catch (error) {
      console.error("Error fetching customer by phone:", error);
      return null;
    }
  }

  /**
   * Get VIP customers
   */
  async getVIPCustomers(): Promise<Customer[]> {
    try {
      const response = await this.search({ status: "vip", isActive: true });
      return response.data.items;
    } catch (error) {
      console.error("Error fetching VIP customers:", error);
      return [];
    }
  }

  /**
   * Get Elite customers
   */
  async getEliteCustomers(): Promise<Customer[]> {
    try {
      const response = await this.search({ status: "elite", isActive: true });
      return response.data.items;
    } catch (error) {
      console.error("Error fetching Elite customers:", error);
      return [];
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const customerAPI = new CustomerAPI();
export default customerAPI;