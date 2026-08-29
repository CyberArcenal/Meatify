// src/renderer/pages/Loyalty/hooks/useLoyalty.ts
import { useState, useEffect, useCallback } from "react";
import loyaltyAPI, {
  type LoyaltyTransaction,
  type TransactionStatistics,
} from "../../../api/core/loyaltyTransaction";
import customerAPI, { type Customer } from "../../../api/core/customer";

export interface LoyaltyFilters {
  type: "all" | "earn" | "redeem";
  customerId?: number;
  startDate?: string;
  endDate?: string;
  search: string;
}

export interface PointsDistribution {
  range: string;
  count: number;
}

export interface TopCustomer {
  customerId: number;
  name: string;
  netPoints: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  earned: number;
  redeemed: number;
  count: number;
}

export const useLoyalty = (initialFilters?: Partial<LoyaltyFilters>) => {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [statistics, setStatistics] = useState<TransactionStatistics | null>(null);
  const [filters, setFilters] = useState<LoyaltyFilters>({
    type: "all",
    customerId: undefined,
    startDate: undefined,
    endDate: undefined,
    search: "",
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [pointsDistribution, setPointsDistribution] = useState<PointsDistribution[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const fetchAll = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const params: any = {
          page: p,
          limit: l,
          customerId: filters.customerId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: filters.search || undefined,
        };

        if (filters.type !== "all") {
          params.transactionType = filters.type;
        }

        const txResponse = await loyaltyAPI.getAll(params);
        if (!txResponse.status) throw new Error(txResponse.message);

        const data = txResponse.data;
        setTransactions(data.items || []);
        setTotalItems(data.total || 0);
        if (options?.page !== undefined) setPage(p);
        if (options?.limit !== undefined) setLimit(l);

        // Fetch statistics
        const statsResponse = await loyaltyAPI.getStatistics();
        if (statsResponse.status) {
          setStatistics(statsResponse.data);
        }

        // Fetch customers for distribution and top customers
        const custResponse = await customerAPI.getAll({
          limit: 1000,
          sortBy: "loyaltyPointsBalance",
          sortOrder: "DESC",
        });
        if (custResponse.status) {
          const customerList = custResponse.data.items || [];
          setCustomers(customerList);

          // Top customers by points
          const top = customerList.slice(0, 5).map((c) => ({
            customerId: c.id,
            name: c.name,
            netPoints: c.loyaltyPointsBalance,
            transactionCount: 0,
          }));
          setTopCustomers(top);

          // Points distribution
          const ranges = [
            { min: 0, max: 99, label: "0-99" },
            { min: 100, max: 499, label: "100-499" },
            { min: 500, max: 999, label: "500-999" },
            { min: 1000, max: Infinity, label: "1000+" },
          ];
          const distribution = ranges.map((r) => ({
            range: r.label,
            count: customerList.filter(
              (c) =>
                c.loyaltyPointsBalance >= r.min &&
                c.loyaltyPointsBalance <= r.max
            ).length,
          }));
          setPointsDistribution(distribution);
        }

        // Build monthly trends from transactions
        const trendsMap: Record<string, { earned: number; redeemed: number; count: number }> = {};
        data.items.forEach((tx) => {
          const month = new Date(tx.timestamp).toISOString().slice(0, 7);
          if (!trendsMap[month]) {
            trendsMap[month] = { earned: 0, redeemed: 0, count: 0 };
          }
          trendsMap[month].count += 1;
          if (tx.pointsChange > 0) {
            trendsMap[month].earned += tx.pointsChange;
          } else {
            trendsMap[month].redeemed += Math.abs(tx.pointsChange);
          }
        });
        const trends = Object.entries(trendsMap)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month));
        setMonthlyTrends(trends);
      } catch (err: any) {
        setError(err.message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  // Auto-fetch when filters change
  useEffect(() => {
    fetchAll({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchAll({ page, limit });
  }, [page, limit]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchAll(options);
    },
    [fetchAll]
  );

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) setPage(newPage);
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      type: "all",
      customerId: undefined,
      startDate: undefined,
      endDate: undefined,
      search: "",
    });
    setPage(1);
  }, []);

  return {
    transactions,
    statistics,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    topCustomers,
    pointsDistribution,
    monthlyTrends,
    customers,
    reload,
    goToPage,
    changeLimit,
    resetFilters,
  };
};