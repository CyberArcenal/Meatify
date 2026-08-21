// src/renderer/layouts/Sidebar/components/SidebarStats.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import type { SidebarStats as SidebarStatsType } from '../types';

interface SidebarStatsProps {
  stats: SidebarStatsType;
  loading: boolean;
}

const SidebarStats: React.FC<SidebarStatsProps> = ({ stats, loading }) => {
  return (
    <div className="p-4 border-t border-[var(--border-color)] bg-[#334155]/30">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Today's Sales */}
        <div className="bg-[var(--status-completed-bg)] text-[var(--status-completed)] text-xs py-2 px-2 rounded-lg text-center border border-[var(--border-light)]">
          <div className="font-bold text-sm">
            {loading ? (
              <div className="animate-pulse h-4 w-16 bg-gray-300/30 rounded mx-auto" />
            ) : (
              formatCurrency(stats.revenueToday)
            )}
          </div>
          <div className="text-[10px]">Today's Sales</div>
        </div>

        {/* Pending Orders */}
        <div className="bg-[var(--status-pending-bg)] text-[var(--status-pending)] text-xs py-2 px-2 rounded-lg text-center border border-[var(--border-light)]">
          <div className="font-bold text-sm">
            {loading ? (
              <div className="animate-pulse h-4 w-8 bg-gray-300/30 rounded mx-auto" />
            ) : (
              stats.pendingOrders
            )}
          </div>
          <div className="text-[10px]">Pending Orders</div>
        </div>

        {/* Low Stock */}
        <div className="bg-[var(--stock-lowstock-bg)] text-[var(--stock-lowstock)] text-xs py-2 px-2 rounded-lg text-center border border-[var(--border-light)]">
          <div className="font-bold text-sm">
            {loading ? (
              <div className="animate-pulse h-4 w-8 bg-gray-300/30 rounded mx-auto" />
            ) : (
              stats.lowStockCount
            )}
          </div>
          <div className="text-[10px]">Low Stock</div>
        </div>

        {/* Transactions */}
        <div className="bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] text-xs py-2 px-2 rounded-lg text-center border border-[var(--border-light)]">
          <div className="font-bold text-sm">
            {loading ? (
              <div className="animate-pulse h-4 w-8 bg-gray-300/30 rounded mx-auto" />
            ) : (
              stats.transactions
            )}
          </div>
          <div className="text-[10px]">Transactions</div>
        </div>
      </div>

      {/* Open POS Button */}
      <div className="flex justify-center">
        <Link
          to="/pos/cashier"
          className="w-full bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] text-[var(--btn-primary-text)] text-sm py-2 px-4 rounded-lg text-center hover:from-[var(--accent-gold-hover)] hover:to-[var(--accent-gold-dark)] transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
        >
          <ShoppingCart className="w-4 h-4" />
          Open POS
        </Link>
      </div>
    </div>
  );
};

export default SidebarStats;