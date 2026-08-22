// src/renderer/pages/Loyalty/hooks/useLoyalty.ts
import { useState, useEffect, useCallback } from "react";
import loyaltyAPI, {
  type LoyaltyTransaction,
  type TransactionStatistics,
  type PaginatedTransactions,
} from "../../../api/core/loyaltyTransaction";
import customerAPI, { type Customer } from "../../../api/core/customer";

export interface LoyaltyFilters {
  type: "all" | "earn" | "redeem";
  customerId?: number;
  startDate?: string;
  endDate?: string;
  search: string;
}

interface PointsDistribution {
  range: string;
  count: number;
}

interface TopCustomer {
  customerId: number;
  name: string;
  netPoints: number;
  transactionCount: number;
}

interface MonthlyTrend {
  month: string;
  earned: number;
  redeemed: number;
  count: number;
}

export const useLoyalty = (initialFilters: LoyaltyFilters) => {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [statistics, setStatistics] = useState<TransactionStatistics | null>(
    null
  );
  const [filters, setFilters] = useState<LoyaltyFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [pointsDistribution, setPointsDistribution] = useState<
    PointsDistribution[]
  >([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);

  const fetchAll = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);
      try {
        // Build params for getAllTransactions
        const params: any = {
          page,
          limit,
          customerId: filters.customerId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: filters.search || undefined,
        };

        // Map type filter to transactionType
        if (filters.type !== "all") {
          params.transactionType = filters.type; // 'earn' or 'redeem'
        }

        // Fetch transactions
        const txResponse = await loyaltyAPI.getAll(params);
        if (!txResponse.status) throw new Error(txResponse.message);
        const paginated: PaginatedTransactions = txResponse.data;
        setTransactions(paginated.items || []);
        setTotalItems(paginated.total || 0);

        // Fetch statistics – this gives aggregated data
        const statsResponse = await loyaltyAPI.getStatistics();
        if (statsResponse.status) {
          const stats = statsResponse.data;
          setStatistics(stats);

          // Build monthly trends from stats if available
          // Since stats doesn't have monthlyTrends, we can compute from transactions if needed,
          // but we'll just use empty arrays for now and rely on component to compute or we'll compute client-side.
          // For now, we'll try to build trends from transactions:
          const trendsMap: Record<string, { earned: number; redeemed: number; count: number }> = {};
          paginated.items.forEach((tx) => {
            const month = new Date(tx.timestamp).toISOString().slice(0, 7); // YYYY-MM
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
        }

        // Fetch all customers to build points distribution and top customers
        const custResponse = await customerAPI.getAll({
          limit: 1000,
          sortBy: "loyaltyPointsBalance",
          sortOrder: "DESC",
        });
        if (custResponse.status) {
          const customers: Customer[] = custResponse.data.items || [];

          // Top customers by points
          const top = customers.slice(0, 5).map((c) => ({
            customerId: c.id,
            name: c.name,
            netPoints: c.loyaltyPointsBalance,
            transactionCount: 0, // not available here
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
            count: customers.filter(
              (c) =>
                c.loyaltyPointsBalance >= r.min &&
                c.loyaltyPointsBalance <= r.max
            ).length,
          }));
          setPointsDistribution(distribution);
        }
      } catch (err: any) {
        setError(err.message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchAll({ page: 1, limit: 10 });
  }, [fetchAll]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchAll(options);
    },
    [fetchAll]
  );

  return {
    transactions,
    statistics,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    reload,
    topCustomers,
    pointsDistribution,
    monthlyTrends,
  };
};