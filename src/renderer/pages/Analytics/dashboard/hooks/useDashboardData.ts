// src/renderer/pages/Dashboard/hooks/useDashboardData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { TopProduct } from "../../../../api";
import dashboardAPI, { type DashboardSummary, type SalesChartPoint, type InventoryItem, type ActivityEntry, type CustomerStats, type ExpiringBatch } from "../../../../api/analytics/dashboard";


interface LoadingState {
  summary: boolean;
  chart: boolean;
  lowStock: boolean;
  activities: boolean;
  topProducts: boolean;
  customerStats: boolean;
  expiry: boolean;
}

export default function useDashboardData() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesChart, setSalesChart] = useState<SalesChartPoint[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityEntry[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState<LoadingState>({
    summary: true,
    chart: true,
    lowStock: true,
    activities: true,
    topProducts: true,
    customerStats: true,
    expiry: true,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch all data
  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchSummary = async () => {
      setLoading((prev) => ({ ...prev, summary: true }));
      try {
        const res = await dashboardAPI.getSummary();
        if (!abortController.signal.aborted) {
          if (res.status && res.data) setSummary(res.data);
          else throw new Error(res.message || "Failed to fetch summary");
        }
      } catch (error: any) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch summary", error);
          setError(error.message || "Failed to load summary");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading((prev) => ({ ...prev, summary: false }));
        }
      }
    };

    const fetchLowStock = async () => {
      setLoading((prev) => ({ ...prev, lowStock: true }));
      try {
        const res = await dashboardAPI.getLowStockAlert();
        if (!abortController.signal.aborted) {
          if (res.status && res.data) setLowStockItems(res.data);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch low stock", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading((prev) => ({ ...prev, lowStock: false }));
        }
      }
    };

    const fetchActivities = async () => {
      setLoading((prev) => ({ ...prev, activities: true }));
      try {
        const res = await dashboardAPI.getRecentActivities({ limit: 10 });
        if (!abortController.signal.aborted) {
          if (res.status && res.data) setRecentActivities(res.data);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch activities", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading((prev) => ({ ...prev, activities: false }));
        }
      }
    };

    const fetchTopProducts = async () => {
      setLoading((prev) => ({ ...prev, topProducts: true }));
      try {
        const res = await dashboardAPI.getTopProducts({
          limit: 5,
          orderBy: "revenue",
        });
        if (!abortController.signal.aborted) {
          if (res.status && res.data) setTopProducts(res.data);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch top products", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading((prev) => ({ ...prev, topProducts: false }));
        }
      }
    };

    const fetchCustomerStats = async () => {
      setLoading((prev) => ({ ...prev, customerStats: true }));
      try {
        const res = await dashboardAPI.getCustomerStats();
        if (!abortController.signal.aborted) {
          if (res.status && res.data) setCustomerStats(res.data);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch customer stats", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading((prev) => ({ ...prev, customerStats: false }));
        }
      }
    };

    const fetchExpiry = async () => {
      setLoading((prev) => ({ ...prev, expiry: true }));
      try {
        const res = await dashboardAPI.getExpiringBatches({ days: 7 });
        if (!abortController.signal.aborted) {
          if (res.status && res.data) setExpiringBatches(res.data);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch expiring batches", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading((prev) => ({ ...prev, expiry: false }));
        }
      }
    };

    // Execute all fetches in parallel
    Promise.all([
      fetchSummary(),
      fetchLowStock(),
      fetchActivities(),
      fetchTopProducts(),
      fetchCustomerStats(),
      fetchExpiry(),
    ]);

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, []);

  // Fetch chart data when period changes
  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchChart = async () => {
      setLoading((prev) => ({ ...prev, chart: true }));
      try {
        const days = chartPeriod === "7d" ? 7 : chartPeriod === "30d" ? 30 : 90;
        const res = await dashboardAPI.getSalesChart({ days, groupBy: "day" });
        if (!abortController.signal.aborted) {
          if (res.status && res.data) setSalesChart(res.data);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch sales chart", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading((prev) => ({ ...prev, chart: false }));
        }
      }
    };

    fetchChart();

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [chartPeriod]);

  const handlePeriodChange = useCallback((period: "7d" | "30d" | "90d") => {
    setChartPeriod(period);
  }, []);

  const refetch = useCallback(() => {
    // Re-run all fetches
    setLoading({
      summary: true,
      chart: true,
      lowStock: true,
      activities: true,
      topProducts: true,
      customerStats: true,
      expiry: true,
    });
    // The useEffect will handle the refetch
    // We need to trigger a re-run of the effect
    // Since we can't easily do that, we'll use a force update pattern
    // For simplicity, we'll just reload the page or use a key
    window.location.reload();
  }, []);

  return {
    summary,
    salesChart,
    lowStockItems,
    recentActivities,
    topProducts,
    customerStats,
    expiringBatches,
    loading,
    error,
    chartPeriod,
    onPeriodChange: handlePeriodChange,
    refetch,
  };
}