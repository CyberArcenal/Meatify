// src/renderer/api/analytics/dashboard.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface DashboardSummary {
  salesToday: number;
  revenueToday: number;
  totalCustomers: number;
  lowStockCount: number;
  totalProducts: number;
  inventoryMovementsToday: number;
  expiringCount: number;
  date: string;
}

export interface SalesChartPoint {
  date: string;
  revenue: number;
  count: number;
}

export interface InventoryItem {
  id: number;
  batchCode: string;
  name: string;
  sku: string;
  stockQty: number;
  price: number;
  expiryDate: string;
  daysUntilExpiry: number | null;
}

export interface ActivityEntry {
  id: number;
  type: 'sale' | 'inventory' | 'audit';
  description: string;
  formattedTime: string;
  timestamp: string;
  entity: string;
  action: string;
  user: string | null;
}

export interface TopProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomersToday: number;
  newCustomersThisWeek: number;
  topSpenders: Array<{
    customerId: number;
    name: string;
    totalSpent: number;
  }>;
  loyaltyDistribution: Array<{
    range: string;
    count: number;
  }>;
}

export interface ExpiringBatch {
  id: number;
  batchCode: string;
  meatName: string;
  remainingQuantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  isUrgent: boolean;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface DashboardSummaryResponse {
  status: boolean;
  message: string;
  data: DashboardSummary;
}

export interface SalesChartResponse {
  status: boolean;
  message: string;
  data: SalesChartPoint[];
}

export interface LowStockResponse {
  status: boolean;
  message: string;
  data: InventoryItem[];
}

export interface ActivitiesResponse {
  status: boolean;
  message: string;
  data: ActivityEntry[];
}

export interface TopProductsResponse {
  status: boolean;
  message: string;
  data: TopProduct[];
}

export interface CustomerStatsResponse {
  status: boolean;
  message: string;
  data: CustomerStats;
}

export interface ExpiringBatchesResponse {
  status: boolean;
  message: string;
  data: ExpiringBatch[];
}

// ----------------------------------------------------------------------
// 🧠 DashboardAPI Class
// ----------------------------------------------------------------------

class DashboardAPI {
  /**
   * Get dashboard summary (sales today, revenue, customers, low stock, etc.)
   */
  async getSummary(): Promise<DashboardSummaryResponse> {
    try {
      if (!window.backendAPI?.dashboard) {
        throw new Error('Electron API (dashboard) not available');
      }

      const response = await window.backendAPI.dashboard({
        method: 'getDashboardSummary',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch dashboard summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch dashboard summary');
    }
  }

  /**
   * Get sales chart data for a specified number of days
   * @param params.days - Number of days to include (default: 7)
   * @param params.groupBy - Group by 'day', 'week', or 'month' (default: 'day')
   */
  async getSalesChart(params?: {
    days?: number;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<SalesChartResponse> {
    try {
      if (!window.backendAPI?.dashboard) {
        throw new Error('Electron API (dashboard) not available');
      }

      const response = await window.backendAPI.dashboard({
        method: 'getSalesChart',
        params: params || { days: 7, groupBy: 'day' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch sales chart data');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch sales chart data');
    }
  }

  /**
   * Get low stock alert items
   * @param params.threshold - Stock threshold in kg (default: 5)
   * @param params.limit - Max items to return (default: 10)
   */
  async getLowStockAlert(params?: {
    threshold?: number;
    limit?: number;
  }): Promise<LowStockResponse> {
    try {
      if (!window.backendAPI?.dashboard) {
        throw new Error('Electron API (dashboard) not available');
      }

      const response = await window.backendAPI.dashboard({
        method: 'getLowStockAlert',
        params: params || { threshold: 5, limit: 10 },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch low stock items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch low stock items');
    }
  }

  /**
   * Get recent activities
   * @param params.limit - Max activities to return (default: 10)
   */
  async getRecentActivities(params?: {
    limit?: number;
  }): Promise<ActivitiesResponse> {
    try {
      if (!window.backendAPI?.dashboard) {
        throw new Error('Electron API (dashboard) not available');
      }

      const response = await window.backendAPI.dashboard({
        method: 'getRecentActivities',
        params: params || { limit: 10 },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch recent activities');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch recent activities');
    }
  }

  /**
   * Get top products by revenue or quantity
   * @param params.limit - Max products to return (default: 5)
   * @param params.orderBy - Sort by 'revenue' or 'quantity' (default: 'revenue')
   * @param params.days - Date range in days (default: 30)
   */
  async getTopProducts(params?: {
    limit?: number;
    orderBy?: 'revenue' | 'quantity';
    days?: number;
  }): Promise<TopProductsResponse> {
    try {
      if (!window.backendAPI?.dashboard) {
        throw new Error('Electron API (dashboard) not available');
      }

      const response = await window.backendAPI.dashboard({
        method: 'getTopProducts',
        params: params || { limit: 5, orderBy: 'revenue', days: 30 },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch top products');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch top products');
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<CustomerStatsResponse> {
    try {
      if (!window.backendAPI?.dashboard) {
        throw new Error('Electron API (dashboard) not available');
      }

      const response = await window.backendAPI.dashboard({
        method: 'getCustomerStats',
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch customer stats');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch customer stats');
    }
  }

  /**
   * Get expiring batches
   * @param params.days - Number of days to look ahead (default: 7)
   * @param params.limit - Max batches to return (default: 10)
   */
  async getExpiringBatches(params?: {
    days?: number;
    limit?: number;
  }): Promise<ExpiringBatchesResponse> {
    try {
      if (!window.backendAPI?.dashboard) {
        throw new Error('Electron API (dashboard) not available');
      }

      const response = await window.backendAPI.dashboard({
        method: 'getExpiringBatches',
        params: params || { days: 7, limit: 10 },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch expiring batches');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch expiring batches');
    }
  }

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.dashboard);
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const dashboardAPI = new DashboardAPI();
export default dashboardAPI;