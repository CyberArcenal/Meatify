// src/api/analytics/financialReports.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface FinancialPeriodData {
  period: string;
  revenue: number;
  refunds: number;
  netRevenue: number;
  transactions: number;
  discounts: number;
  costOfGoods: number;
  profit: number;
}

export interface ProfitMarginData {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

export interface TopProduct {
  meatId: number;
  meatName: string;
  totalRevenue: number;
  totalWeight: number;
  count: number;
}

export interface PaymentBreakdown {
  [method: string]: {
    count: number;
    total: number;
  };
}

export interface DailyTrend {
  date: string;
  revenue: number;
}

export interface FinancialData {
  groupedData: FinancialPeriodData[];
  summary: {
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    totalDiscounts: number;
    profitMargin: ProfitMarginData;
    topProducts: TopProduct[];
    paymentBreakdown: PaymentBreakdown;
    dailyTrend: DailyTrend[];
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export interface FinancialSummary {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    totalTransactions: number;
    totalDiscounts: number;
    averageTransaction: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  };
  comparison: {
    previousRevenue: number;
    revenueChange: number;
  };
  averages: {
    averageDailyRevenue: number;
    days: number;
  };
  paymentBreakdown: Record<string, number>;
  trends?: Record<string, any>;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface FinancialDataResponse {
  status: boolean;
  message: string;
  data: FinancialData;
}

export interface FinancialSummaryResponse {
  status: boolean;
  message: string;
  data: FinancialSummary;
}

// ----------------------------------------------------------------------
// 🧠 FinancialReportsAPI Class
// ----------------------------------------------------------------------

class FinancialReportsAPI {
  /**
   * Get financial data with grouping
   */
  async getData(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    includeCostAnalysis?: boolean;
  }): Promise<FinancialDataResponse> {
    try {
      if (!window.backendAPI?.financialReports) {
        throw new Error('Electron API (financialReports) not available');
      }

      const response = await window.backendAPI.financialReports({
        method: 'getFinancialData',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch financial data');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch financial data');
    }
  }

  /**
   * Get financial summary for a period
   */
  async getSummary(params?: {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  }): Promise<FinancialSummaryResponse> {
    try {
      if (!window.backendAPI?.financialReports) {
        throw new Error('Electron API (financialReports) not available');
      }

      const response = await window.backendAPI.financialReports({
        method: 'getFinancialSummary',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch financial summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch financial summary');
    }
  }

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.financialReports);
  }

  /**
   * Get monthly financial summary (convenience method)
   */
  async getMonthlySummary(months: number = 1): Promise<FinancialSummary> {
    try {
      const response = await this.getSummary({ period: 'month' });
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      throw error;
    }
  }

  /**
   * Get yearly financial summary (convenience method)
   */
  async getYearlySummary(): Promise<FinancialSummary> {
    try {
      const response = await this.getSummary({ period: 'year' });
      return response.data;
    } catch (error) {
      console.error('Error fetching yearly summary:', error);
      throw error;
    }
  }

  /**
   * Get financial data for a specific date range (convenience method)
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<FinancialData> {
    try {
      const response = await this.getData({ startDate, endDate, groupBy });
      return response.data;
    } catch (error) {
      console.error(`Error fetching financial data from ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }

  /**
   * Get profit margin for a period (convenience method)
   */
  async getProfitMargin(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ProfitMarginData> {
    try {
      const response = await this.getData(params || {});
      return response.data.summary.profitMargin;
    } catch (error) {
      console.error('Error fetching profit margin:', error);
      throw error;
    }
  }

  /**
   * Get top products by revenue (convenience method)
   */
  async getTopProducts(limit: number = 10, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<TopProduct[]> {
    try {
      const response = await this.getData(params || {});
      return response.data.summary.topProducts.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  /**
   * Get revenue trend (convenience method)
   */
  async getRevenueTrend(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DailyTrend[]> {
    try {
      const response = await this.getData(params || {});
      return response.data.summary.dailyTrend;
    } catch (error) {
      console.error('Error fetching revenue trend:', error);
      return [];
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const financialReportsAPI = new FinancialReportsAPI();
export default financialReportsAPI;