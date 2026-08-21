// src/api/analytics/salesReport.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface SalesReportItem {
  id: number;
  meatId: number;
  meatName: string;
  sku: string;
  totalWeight: number;
  totalRevenue: number;
  quantity: number;
  averagePrice: number;
}

export interface CustomerReportItem {
  customerId: number | string;
  customerName: string;
  totalSpent: number;
  purchaseCount: number;
  averageTicket: number;
}

export interface DailyTrend {
  date: string;
  revenue: number;
  count: number;
  weight?: number;
}

export interface WeeklyTrend {
  week: string;
  revenue: number;
  count: number;
}

export interface SalesReportSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageTicket: number;
  totalDiscounts: number;
  totalRefunds?: number;
  netRevenue?: number;
  paymentMethods: Record<string, { count: number; total: number }>;
  days?: number;
  averageDailyRevenue?: number;
  totalWeight?: number;
}

export interface SalesReportData {
  sales: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: SalesReportSummary;
  productBreakdown: SalesReportItem[];
  customerBreakdown: CustomerReportItem[];
  topProducts: SalesReportItem[];
  dailyTrend: DailyTrend[];
  refunds: any[];
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    paymentMethod?: string;
    customerId?: number;
    meatId?: number;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  };
}

export interface SalesReportSummaryData {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTicket: number;
    totalDiscounts: number;
    totalWeight: number;
    averageDailyRevenue: number;
  };
  paymentMethods: Record<string, number>;
  topProducts: Array<{
    meatId: number;
    meatName: string;
    totalRevenue: number;
    totalWeight: number;
    count: number;
  }>;
  topCustomers: Array<{
    customerId: number | string;
    customerName: string;
    totalSpent: number;
    purchaseCount: number;
  }>;
  trends: {
    daily: DailyTrend[];
    weekly: WeeklyTrend[];
  };
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface SalesReportDataResponse {
  status: boolean;
  message: string;
  data: SalesReportData;
}

export interface SalesReportSummaryResponse {
  status: boolean;
  message: string;
  data: SalesReportSummaryData;
}

// ----------------------------------------------------------------------
// 🧠 SalesReportAPI Class
// ----------------------------------------------------------------------

class SalesReportAPI {
  /**
   * Get comprehensive sales report data with filters
   */
  async getData(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    paymentMethod?: string;
    customerId?: number;
    meatId?: number;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    includeProductBreakdown?: boolean;
    includeCustomerBreakdown?: boolean;
    includeRefundData?: boolean;
  }): Promise<SalesReportDataResponse> {
    try {
      if (!window.backendAPI?.salesReport) {
        throw new Error('Electron API (salesReport) not available');
      }

      const response = await window.backendAPI.salesReport({
        method: 'getSalesReportData',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch sales report data');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch sales report data');
    }
  }

  /**
   * Get sales report summary
   */
  async getSummary(params?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<SalesReportSummaryResponse> {
    try {
      if (!window.backendAPI?.salesReport) {
        throw new Error('Electron API (salesReport) not available');
      }

      const response = await window.backendAPI.salesReport({
        method: 'getSalesReportSummary',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch sales report summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch sales report summary');
    }
  }

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.salesReport);
  }

  /**
   * Get monthly sales report (convenience method)
   */
  async getMonthlyReport(): Promise<SalesReportSummaryData> {
    try {
      const response = await this.getSummary({ period: 'month' });
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly sales report:', error);
      throw error;
    }
  }

  /**
   * Get sales report for a date range (convenience method)
   */
  async getByDateRange(startDate: string, endDate: string): Promise<SalesReportData> {
    try {
      const response = await this.getData({ startDate, endDate, limit: 1000 });
      return response.data;
    } catch (error) {
      console.error(`Error fetching sales report from ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }

  /**
   * Get top selling products (convenience method)
   */
  async getTopProducts(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<SalesReportItem[]> {
    try {
      const response = await this.getData({ ...params, limit: 1000 });
      return response.data.topProducts;
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  /**
   * Get top customers by spending (convenience method)
   */
  async getTopCustomers(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<CustomerReportItem[]> {
    try {
      const response = await this.getData({ ...params, limit: 1000 });
      return response.data.customerBreakdown.slice(0, params?.limit || 10);
    } catch (error) {
      console.error('Error fetching top customers:', error);
      return [];
    }
  }

  /**
   * Get daily sales trend (convenience method)
   */
  async getDailyTrend(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DailyTrend[]> {
    try {
      const response = await this.getData({ ...params, limit: 1000 });
      return response.data.dailyTrend;
    } catch (error) {
      console.error('Error fetching daily trend:', error);
      return [];
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const salesReportAPI = new SalesReportAPI();
export default salesReportAPI;