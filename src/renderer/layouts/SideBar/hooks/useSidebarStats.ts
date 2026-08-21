// src/renderer/layouts/Sidebar/hooks/useSidebarStats.ts
import { useState, useEffect, useCallback } from 'react';
import type { SidebarStats } from '../types';
import dashboardAPI from '../../../api/analytics/dashboard';
import purchaseAPI from '../../../api/core/purchase';

export const useSidebarStats = () => {
  const [stats, setStats] = useState<SidebarStats>({
    revenueToday: 0,
    transactions: 0,
    lowStockCount: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch dashboard summary
      const summaryRes = await dashboardAPI.getSummary();
      if (summaryRes.status && summaryRes.data) {
        setStats((prev) => ({
          ...prev,
          revenueToday: summaryRes.data.revenueToday || 0,
          transactions: summaryRes.data.salesToday || 0,
          lowStockCount: summaryRes.data.lowStockCount || 0,
        }));
      }

      // Fetch pending purchase orders
      const pendingRes = await purchaseAPI.getByStatus('pending', { limit: 1 });
      if (pendingRes.status && pendingRes.data) {
        setStats((prev) => ({
          ...prev,
          pendingOrders: pendingRes.data.total || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch sidebar stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      if (mounted) {
        await fetchStats();
      }
    };

    loadStats();

    // Refresh stats every 60 seconds
    const interval = setInterval(() => {
      if (mounted) {
        fetchStats();
      }
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};