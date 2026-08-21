// src/api/analytics/dailySales.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface DailySale {
  id: number;
  timestamp: string;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  totalDiscount: number;
  notes: string | null;
  customerId: number | null;
  customerName: string;
  saleItems: Array<{
    id: number;
    weightKg: number;
    unitPrice: number;
    discount: number;
    tax: number;
    lineTotal: number;
    meatId: number;
    meat: {
      id: number;
      name: string;
      sku: string;
    } | null;
  }>;
  totalWeight: number;
  totalTax: number;
}

export interface DailySalesSummary {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalWeight: number;
  totalDiscount: number;
  averageTicket: number;
  paymentMethods: Record<string, number>;
  topItems: Array<{
    meatId: number;
    meatName: string;
    totalWeight: number;
    totalRevenue: number;
    count: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    count: number;
    revenue: number;
  }>;
  comparison: {
    yesterdayRevenue: number;
    yesterdayCount: number;
    revenueChange: number;
    countChange: number;
  };
  trends?: {
    // Future trend data
  };
}

export interface DailySalesData {
  sales: DailySale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: DailySalesSummary;
  hourlyBreakdown: Array<{
    hour: number;
    count: number;
    revenue: number;
    weight: number;
  }>;
  topMeats: Array<{
    meatId: number;
    meatName: string;
    totalWeight: number;
    totalRevenue: number;
    count: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface DailySalesDataResponse {
  status: boolean;
  message: string;
  data: DailySalesData;
}

export interface DailySalesSummaryResponse {
  status: boolean;
  message: string;
  data: DailySalesSummary;
}

// ----------------------------------------------------------------------
// 🧠 DailySalesAPI Class
// ----------------------------------------------------------------------

class DailySalesAPI {
  /**
   * Get daily sales data with pagination and filters
   */
  async getData(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    paymentMethod?: string;
    customerId?: number;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<DailySalesDataResponse> {
    try {
      if (!window.backendAPI?.dailySales) {
        throw new Error('Electron API (dailySales) not available');
      }

      const response = await window.backendAPI.dailySales({
        method: 'getDailySalesData',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch daily sales data');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch daily sales data');
    }
  }

  /**
   * Get daily sales summary
   */
  async getSummary(params?: {
    date?: string;
  }): Promise<DailySalesSummaryResponse> {
    try {
      if (!window.backendAPI?.dailySales) {
        throw new Error('Electron API (dailySales) not available');
      }

      const response = await window.backendAPI.dailySales({
        method: 'getDailySalesSummary',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch daily sales summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch daily sales summary');
    }
  }

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.dailySales);
  }

  /**
   * Get today's sales (convenience method)
   */
  async getToday(): Promise<DailySalesData> {
    try {
      const response = await this.getData({ date: new Date().toISOString().split('T')[0] });
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s sales:', error);
      throw error;
    }
  }

  /**
   * Get sales for a specific date (convenience method)
   */
  async getByDate(date: string): Promise<DailySalesData> {
    try {
      const response = await this.getData({ date });
      return response.data;
    } catch (error) {
      console.error(`Error fetching sales for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get sales for a date range (convenience method)
   */
  async getByDateRange(startDate: string, endDate: string): Promise<DailySalesData> {
    try {
      const response = await this.getData({ startDate, endDate, limit: 1000 });
      return response.data;
    } catch (error) {
      console.error(`Error fetching sales from ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }

  /**
   * Get today's summary (convenience method)
   */
  async getTodaySummary(): Promise<DailySalesSummary> {
    try {
      const response = await this.getSummary({ date: new Date().toISOString().split('T')[0] });
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s summary:', error);
      throw error;
    }
  }

  /**
   * Get hourly breakdown for today (convenience method)
   */
  async getTodayHourly(): Promise<Array<{ hour: number; count: number; revenue: number }>> {
    try {
      const data = await this.getToday();
      return data.hourlyBreakdown || [];
    } catch (error) {
      console.error('Error fetching hourly breakdown:', error);
      return [];
    }
  }

  /**
   * Get top selling items for today (convenience method)
   */
  async getTodayTopItems(limit: number = 10): Promise<Array<{ meatId: number; meatName: string; totalWeight: number; totalRevenue: number; count: number }>> {
    try {
      const data = await this.getToday();
      return data.topMeats?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching top items:', error);
      return [];
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const dailySalesAPI = new DailySalesAPI();
export default dailySalesAPI;