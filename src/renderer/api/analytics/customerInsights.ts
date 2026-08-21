// src/api/analytics/customerInsights.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface CustomerInsight {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  loyaltyPointsBalance: number;
  lifetimePointsEarned: number;
  status: 'regular' | 'vip' | 'elite';
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  // Enriched fields
  totalSpent: number;
  purchaseCount: number;
  totalEarned: number;
  totalRedeemed: number;
  lastPurchase: string | null;
  averageTicket: number;
}

export interface CustomerInsightsSummary {
  totalCustomers: number;
  activeCustomers: number;
  totalPoints: number;
  avgPoints: number;
  vipCount: number;
  eliteCount: number;
  newCustomers: number;
  topCustomers: Array<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    loyaltyPointsBalance: number;
    totalSpent: number;
    purchaseCount: number;
  }>;
}

export interface CustomerInsightsData {
  customers: CustomerInsight[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: CustomerInsightsSummary;
}

export interface CustomerInsightsSummaryData {
  totalCustomers: number;
  byStatus: {
    regular: number;
    vip: number;
    elite: number;
  };
  pointsSummary: {
    total: number;
    average: number;
    max: number;
    min: number;
  };
  customersWithPoints: number;
  customersWithoutPoints: number;
  topCustomersByPoints: Array<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    points: number;
    status: string;
  }>;
  activeCount: number;
  inactiveCount: number;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface CustomerInsightsResponse {
  status: boolean;
  message: string;
  data: CustomerInsightsData;
}

export interface CustomerInsightsSummaryResponse {
  status: boolean;
  message: string;
  data: CustomerInsightsSummaryData;
}

// ----------------------------------------------------------------------
// 🧠 CustomerInsightsAPI Class
// ----------------------------------------------------------------------

class CustomerInsightsAPI {
  /**
   * Get customer insights data with pagination and filters
   */
  async getData(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
    status?: string;
    isActive?: boolean;
    minPoints?: number;
    maxPoints?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<CustomerInsightsResponse> {
    try {
      if (!window.backendAPI?.customerInsights) {
        throw new Error('Electron API (customerInsights) not available');
      }

      const response = await window.backendAPI.customerInsights({
        method: 'getCustomerInsightsData',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch customer insights data');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch customer insights data');
    }
  }

  /**
   * Get customer insights summary
   */
  async getSummary(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<CustomerInsightsSummaryResponse> {
    try {
      if (!window.backendAPI?.customerInsights) {
        throw new Error('Electron API (customerInsights) not available');
      }

      const response = await window.backendAPI.customerInsights({
        method: 'getCustomerInsightsSummary',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch customer insights summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch customer insights summary');
    }
  }

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.customerInsights);
  }

  /**
   * Get top customers by spending (convenience method)
   */
  async getTopCustomers(limit: number = 10): Promise<CustomerInsight[]> {
    try {
      const response = await this.getData({ limit, sortBy: 'totalSpent', sortOrder: 'DESC' });
      return response.data.customers.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top customers:', error);
      return [];
    }
  }

  /**
   * Get VIP and Elite customers (convenience method)
   */
  async getPremiumCustomers(): Promise<{ vip: CustomerInsight[]; elite: CustomerInsight[] }> {
    try {
      const response = await this.getData({ limit: 1000 });
      const customers = response.data.customers;
      return {
        vip: customers.filter(c => c.status === 'vip'),
        elite: customers.filter(c => c.status === 'elite'),
      };
    } catch (error) {
      console.error('Error fetching premium customers:', error);
      return { vip: [], elite: [] };
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const customerInsightsAPI = new CustomerInsightsAPI();
export default customerInsightsAPI;