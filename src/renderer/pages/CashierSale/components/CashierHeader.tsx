// src/renderer/pages/Cashier/components/CashierHeader.tsx
import React from "react";
import {
  Search,
  RefreshCw,
  XCircle,
  Printer,
  Lock,
  Wifi,
  WifiOff,
  ShoppingBag,
} from "lucide-react";
import Decimal from "decimal.js";
import CategorySelect from "../../../components/Selects/Category";
import { formatCurrency } from "../../../utils/formatters";
import {
  useCashDrawerEnabled,
  useReceiptPrintingEnabled,
} from "../../../utils/posUtils";

interface CashierHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  itemCount: number;
  total: Decimal;
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  loadingProducts: boolean;
  onRefresh: () => void;
  onClearFilters: () => void;
  showClearFilters: boolean;
  printerReady?: boolean;
  drawerOpen?: boolean;
  online?: boolean;
}

const CashierHeader: React.FC<CashierHeaderProps> = ({
  searchTerm,
  onSearchChange,
  searchInputRef,
  itemCount,
  total,
  categoryId,
  onCategoryChange,
  loadingProducts,
  onRefresh,
  onClearFilters,
  showClearFilters,
  printerReady = true,
  drawerOpen = false,
  online = true,
}) => {
  const cashDrawerEnabled = useCashDrawerEnabled();
  const receiptPrintingEnabled = useReceiptPrintingEnabled();

  return (
    <div className="flex-shrink-0 bg-[var(--header-bg)] border-b border-[var(--border-color)] px-4 py-3 space-y-3">
      {/* ROW 1: Search + Total */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[240px]">
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search meats by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-xl px-5 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--accent-gold)]" />
            <div className="text-right">
              <div className="text-xs font-medium text-[var(--text-tertiary)]">
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </div>
              <div className="text-2xl font-extrabold text-[var(--accent-gold)]">
                {formatCurrency(total.toNumber())}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Category, Actions, Status, Hotkeys */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-56">
            <CategorySelect
              value={categoryId}
              onChange={onCategoryChange}
              placeholder="All categories"
              activeOnly
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loadingProducts}
              className="p-2 rounded-lg bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 border border-[var(--border-color)]"
              title="Refresh products"
            >
              <RefreshCw className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`} />
            </button>
            {showClearFilters && (
              <button
                onClick={onClearFilters}
                className="p-2 rounded-lg bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--danger-color)] transition-colors border border-[var(--border-color)]"
                title="Clear filters"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 ml-2">
            {receiptPrintingEnabled && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  printerReady
                    ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                    : "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
                }`}
                title={printerReady ? "Printer ready" : "Printer error"}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Printer</span>
              </div>
            )}
            {cashDrawerEnabled && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  drawerOpen
                    ? "bg-[var(--status-pending-bg)] text-[var(--status-pending)]"
                    : "bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)]"
                }`}
                title={drawerOpen ? "Drawer open" : "Drawer closed"}
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Drawer</span>
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                online
                  ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                  : "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
              }`}
              title={online ? "Online" : "Offline"}
            >
              {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Network</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
          <kbd className="px-2 py-1 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-color)] text-[var(--text-tertiary)]">Ctrl+D</kbd>
          <span className="text-[var(--text-tertiary)] text-xs">Discount</span>
          <kbd className="px-2 py-1 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-color)] text-[var(--text-tertiary)]">Ctrl+Enter</kbd>
          <span className="text-[var(--text-tertiary)] text-xs">Checkout</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CashierHeader);