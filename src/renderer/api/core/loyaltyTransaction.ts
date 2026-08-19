// src/api/core/loyaltyTransaction.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface LoyaltyTransaction {
  id: number;
  pointsChange: number;
  transactionType: 'earn' | 'redeem' | 'adjustment' | 'refund';
  notes: string | null;
  timestamp: string;
  customerId: number;
  saleId: number | null;
  customer?: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  sale?: {
    id: number;
    totalAmount: number;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface PaginatedTransactions {
  items: LoyaltyTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionStatistics {
  byType: Array<{
    type: string;
    count: number;
    totalPoints: number;
  }>;
  totalEarned: number;
  totalRedeemed: number;
  netPoints: number;
  last30Days: number;
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    totalEarned: number;
  }>;
}

export interface CustomerLoyaltySummary {
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    loyaltyPointsBalance: number;
    lifetimePointsEarned: number;
    status: string;
    isActive: boolean;
  };
  summary: {
    totalEarned: number;
    totalRedeemed: number;
    totalAdjusted: number;
    transactionCount: number;
  };
  transactions: LoyaltyTransaction[];
}

export interface EarnPointsResult {
  customer: any;
  transaction: LoyaltyTransaction;
  pointsEarned: number;
}

export interface RedeemPointsResult {
  customer: any;
  transaction: LoyaltyTransaction;
  pointsRedeemed: number;
}

export interface AdjustPointsResult {
  customer: any;
  transaction: LoyaltyTransaction;
  pointsChanged: number;
}

export interface ReverseTransactionResult {
  customer: any;
  transaction: LoyaltyTransaction;
  reversalTransaction: LoyaltyTransaction;
}

export interface BulkCreateResult {
  created: LoyaltyTransaction[];
  errors: Array<{ transaction: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: LoyaltyTransaction[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: LoyaltyTransaction[];
  errors: Array<{ row: any; error: string }>;
}

export interface TransactionExportData {
  format: string;
  data: string | LoyaltyTransaction[];
  filename: string;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface TransactionsResponse {
  status: boolean;
  message: string;
  data: PaginatedTransactions;
}

export interface TransactionResponse {
  status: boolean;
  message: string;
  data: LoyaltyTransaction;
}

export interface TransactionStatisticsResponse {
  status: boolean;
  message: string;
  data: TransactionStatistics;
}

export interface CustomerLoyaltySummaryResponse {
  status: boolean;
  message: string;
  data: CustomerLoyaltySummary;
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

export interface TransactionExportResponse {
  status: boolean;
  message: string;
  data: TransactionExportData;
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
// 🧠 LoyaltyTransactionAPI Class
// ----------------------------------------------------------------------

class LoyaltyTransactionAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all loyalty transactions with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    customerId?: number;
    saleId?: number;
    transactionType?: string | string[];
    direction?: 'earn' | 'redeem';
    startDate?: string;
    endDate?: string;
    minPoints?: number;
    maxPoints?: number;
    search?: string;
    includeDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<TransactionsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'getAllTransactions',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch loyalty transactions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch loyalty transactions');
    }
  }

  /**
   * Get a single loyalty transaction by ID
   */
  async getById(id: number, includeDeleted: boolean = false): Promise<TransactionResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'getTransactionById',
        params: { id, includeDeleted },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch loyalty transaction');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch loyalty transaction');
    }
  }

  /**
   * Get transactions for a specific customer
   */
  async getByCustomer(customerId: number, params?: {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  }): Promise<TransactionsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'getTransactionsByCustomer',
        params: { customerId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch transactions by customer');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch transactions by customer');
    }
  }

  /**
   * Get transactions for a specific sale
   */
  async getBySale(saleId: number, params?: {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  }): Promise<TransactionsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'getTransactionsBySale',
        params: { saleId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch transactions by sale');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch transactions by sale');
    }
  }

  /**
   * Get loyalty transaction statistics
   */
  async getStatistics(): Promise<TransactionStatisticsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'getTransactionStatistics',
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
   * Search loyalty transactions with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    customerId?: number;
    saleId?: number;
    transactionType?: string | string[];
    direction?: 'earn' | 'redeem';
    startDate?: string;
    endDate?: string;
    minPoints?: number;
    maxPoints?: number;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }): Promise<TransactionsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'searchTransactions',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search transactions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search transactions');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a manual loyalty transaction (adjustment only)
   */
  async create(data: {
    customerId: number;
    pointsChange: number;
    transactionType: 'adjustment';
    notes?: string;
    saleId?: number;
  }): Promise<TransactionResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'createTransaction',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create transaction');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create transaction');
    }
  }

  /**
   * Update an existing loyalty transaction (notes only)
   */
  async update(
    id: number,
    data: {
      notes?: string;
    }
  ): Promise<TransactionResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'updateTransaction',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update transaction');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update transaction');
    }
  }

  /**
   * Soft delete a loyalty transaction
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'deleteTransaction',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Transaction deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete transaction');
    }
  }

  /**
   * Restore a soft-deleted loyalty transaction
   */
  async restore(id: number): Promise<TransactionResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'restoreTransaction',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore transaction');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore transaction');
    }
  }

  /**
   * Permanently delete a loyalty transaction
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'permanentlyDeleteTransaction',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Transaction permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete transaction');
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
    saleId: number
  ): Promise<EarnPointsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'earnPoints',
        params: { customerId, amountSpent, saleId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to earn points');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to earn points');
    }
  }

  /**
   * Redeem loyalty points (from a sale)
   */
  async redeemPoints(
    customerId: number,
    pointsToRedeem: number,
    saleId: number
  ): Promise<RedeemPointsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'redeemPoints',
        params: { customerId, pointsToRedeem, saleId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to redeem points');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to redeem points');
    }
  }

  /**
   * Manually adjust loyalty points (admin adjustment)
   */
  async adjustPoints(
    customerId: number,
    pointsChange: number,
    reason: string
  ): Promise<AdjustPointsResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'adjustPoints',
        params: { customerId, pointsChange, reason, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to adjust points');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to adjust points');
    }
  }

  /**
   * Reverse a loyalty transaction (for refunds, cancellations)
   */
  async reverseTransaction(
    transactionId: number,
    reason: string
  ): Promise<ReverseTransactionResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'reverseTransaction',
        params: { transactionId, reason, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to reverse transaction');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reverse transaction');
    }
  }

  /**
   * Get loyalty summary for a customer
   */
  async getCustomerSummary(customerId: number): Promise<CustomerLoyaltySummaryResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'getCustomerSummary',
        params: { customerId },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to get customer summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get customer summary');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create loyalty transactions
   */
  async bulkCreate(transactionsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'bulkCreateTransactions',
        params: { transactionsArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create transactions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create transactions');
    }
  }

  /**
   * Bulk update loyalty transactions
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: any }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'bulkUpdateTransactions',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update transactions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update transactions');
    }
  }

  /**
   * Import loyalty transactions from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'importTransactionsCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import transactions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import transactions');
    }
  }

  /**
   * Export loyalty transactions to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<TransactionExportResponse> {
    try {
      if (!window.backendAPI?.loyaltyTransaction) {
        throw new Error('Electron API (loyaltyTransaction) not available');
      }

      const response = await window.backendAPI.loyaltyTransaction({
        method: 'exportTransactions',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export transactions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export transactions');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.loyaltyTransaction);
  }

  /**
   * Get total points earned by a customer
   */
  async getCustomerTotalEarned(customerId: number): Promise<number> {
    try {
      const response = await this.getByCustomer(customerId, { limit: 1000 });
      return response.data.items
        .filter(tx => tx.transactionType === 'earn')
        .reduce((sum, tx) => sum + tx.pointsChange, 0);
    } catch (error) {
      console.error('Error calculating customer total earned:', error);
      return 0;
    }
  }

  /**
   * Get total points redeemed by a customer
   */
  async getCustomerTotalRedeemed(customerId: number): Promise<number> {
    try {
      const response = await this.getByCustomer(customerId, { limit: 1000 });
      return response.data.items
        .filter(tx => tx.transactionType === 'redeem')
        .reduce((sum, tx) => sum + Math.abs(tx.pointsChange), 0);
    } catch (error) {
      console.error('Error calculating customer total redeemed:', error);
      return 0;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const loyaltyTransactionAPI = new LoyaltyTransactionAPI();
export default loyaltyTransactionAPI;