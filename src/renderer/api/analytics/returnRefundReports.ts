// src/api/analytics/returnRefundReports.ts

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
  } | null;
}

export interface ReturnRefundReport {
  id: number;
  referenceNo: string;
  reason: string | null;
  refundMethod: string;
  totalAmount: number;
  status: 'pending' | 'processed' | 'cancelled';
  saleId: number;
  customerId: number;
  createdAt: string;
  updatedAt: string | null;
  sale: any;
  customer: any;
  items: ReturnRefundItem[];
  totalWeight: number;
  customerName: string;
  saleReference: string;
}

export interface ReturnSummary {
  totalReturns: number;
  totalAmount: number;
  processedCount: number;
  pendingCount: number;
  cancelledCount: number;
  processedAmount: number;
  avgAmount: number;
  methodBreakdown: Record<string, number>;
  uniqueCustomers: number;
}

export interface TopReturnedItem {
  meatId: number;
  meatName: string;
  totalWeight: number;
  totalAmount: number;
  count: number;
}

export interface ReturnReason {
  reason: string;
  count: number;
}

export interface DailyReturnTrend {
  date: string;
  count: number;
  amount: number;
}

export interface ReturnRefundData {
  returns: ReturnRefundReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: ReturnSummary;
  topItems: TopReturnedItem[];
  reasonBreakdown: ReturnReason[];
  dailyTrend: DailyReturnTrend[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ReturnSummaryData {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalReturns: number;
    totalReturnsAmount: number;
    totalSalesCount: number;
    totalSalesAmount: number;
    returnRateByCount: number;
    returnRateByAmount: number;
    avgRefund: number;
    statusBreakdown: Record<string, number>;
    methodBreakdown: Record<string, number>;
    topCustomers: Array<{
      customerId: number;
      customerName: string;
      count: number;
      totalAmount: number;
    }>;
  };
  comparison: {
    previousReturnsCount: number;
    previousReturnsAmount: number;
    returnCountChange: number;
    returnAmountChange: number;
  };
  trends?: Record<string, any>;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface ReturnRefundDataResponse {
  status: boolean;
  message: string;
  data: ReturnRefundData;
}

export interface ReturnRefundSummaryResponse {
  status: boolean;
  message: string;
  data: ReturnSummaryData;
}

// ----------------------------------------------------------------------
// 🧠 ReturnRefundReportsAPI Class
// ----------------------------------------------------------------------

class ReturnRefundReportsAPI {
  /**
   * Get detailed return refund data with pagination and filters
   */
  async getData(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    refundMethod?: string;
    customerId?: number;
    saleId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<ReturnRefundDataResponse> {
    try {
      if (!window.backendAPI?.returnRefundReports) {
        throw new Error('Electron API (returnRefundReports) not available');
      }

      const response = await window.backendAPI.returnRefundReports({
        method: 'getReturnRefundData',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch return refund data');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch return refund data');
    }
  }

  /**
   * Get return refund summary for a period
   */
  async getSummary(params?: {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
    status?: string;
  }): Promise<ReturnRefundSummaryResponse> {
    try {
      if (!window.backendAPI?.returnRefundReports) {
        throw new Error('Electron API (returnRefundReports) not available');
      }

      const response = await window.backendAPI.returnRefundReports({
        method: 'getReturnRefundSummary',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch return refund summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch return refund summary');
    }
  }

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.returnRefundReports);
  }

  /**
   * Get return rate for a period (convenience method)
   */
  async getReturnRate(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<{ rateByCount: number; rateByAmount: number }> {
    try {
      // Use getSummary with period 'month' as fallback
      const response = await this.getData({
        startDate: params?.startDate,
        endDate: params?.endDate,
        status: params?.status || 'processed',
        limit: 1000,
      });
      // But to get return rate, we need sales data too, so we use the summary endpoint
      const summaryResponse = await this.getSummary({
        period: 'month',
        status: params?.status || 'processed',
      });
      const data = summaryResponse.data;
      return {
        rateByCount: data.summary.returnRateByCount,
        rateByAmount: data.summary.returnRateByAmount,
      };
    } catch (error) {
      console.error('Error fetching return rate:', error);
      return { rateByCount: 0, rateByAmount: 0 };
    }
  }

  /**
   * Get top customers by return count (convenience method)
   */
  async getTopReturningCustomers(limit: number = 5): Promise<Array<{ customerId: number; customerName: string; count: number; totalAmount: number }>> {
    try {
      const response = await this.getSummary({ period: 'month' });
      return response.data.summary.topCustomers.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top returning customers:', error);
      return [];
    }
  }

  /**
   * Get refund method breakdown (convenience method)
   */
  async getMethodBreakdown(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Record<string, number>> {
    try {
      const response = await this.getData({ ...params, limit: 1000 });
      return response.data.summary.methodBreakdown;
    } catch (error) {
      console.error('Error fetching method breakdown:', error);
      return {};
    }
  }

  /**
   * Get reason breakdown (convenience method)
   */
  async getReasonBreakdown(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ReturnReason[]> {
    try {
      const response = await this.getData({ ...params, limit: 1000 });
      return response.data.reasonBreakdown;
    } catch (error) {
      console.error('Error fetching reason breakdown:', error);
      return [];
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const returnRefundReportsAPI = new ReturnRefundReportsAPI();
export default returnRefundReportsAPI;