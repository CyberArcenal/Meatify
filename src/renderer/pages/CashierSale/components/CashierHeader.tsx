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
    <div className="flex-shrink-0 bg-[var(--header-bg)] border-b border-[var(--border-color)] px-3 py-1.5">
      {/* Row 1: Search + Total */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] focus:border-transparent transition-all"
          />
        </div>

        {/* Total - Prominent & Compact */}
        <div className="flex items-center gap-2 bg-[var(--accent-gold-light)] border border-[var(--accent-gold)]/30 rounded-lg px-3 py-1 flex-shrink-0 min-w-[100px]">
          <ShoppingBag className="w-4 h-4 text-[var(--accent-gold)]" />
          <div className="text-right leading-tight">
            <div className="text-[9px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </div>
            <div className="text-2xl font-extrabold text-[var(--accent-gold)] leading-none">
              {formatCurrency(total.toNumber())}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Category + Actions + Status + Hotkeys */}
      <div className="flex items-center gap-1.5 mt-1">
        <div className="w-70 flex-shrink-0">
          <CategorySelect
            value={categoryId}
            onChange={onCategoryChange}
            placeholder="All categories"
            activeOnly
            className="w-full"
          />
        </div>

        <button
          onClick={onRefresh}
          disabled={loadingProducts}
          className="p-1.5 rounded-md bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 border border-[var(--border-color)]"
          title="Refresh products"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? "animate-spin" : ""}`} />
        </button>

        {showClearFilters && (
          <button
            onClick={onClearFilters}
            className="p-1.5 rounded-md bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--danger-color)] transition-colors border border-[var(--border-color)]"
            title="Clear filters"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex-1" />

        {/* Status Indicators - Compact */}
        <div className="flex items-center gap-1">
          {receiptPrintingEnabled && (
            <div
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                printerReady
                  ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                  : "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
              }`}
              title={printerReady ? "Printer ready" : "Printer error"}
            >
              <Printer className="w-3 h-3" />
            </div>
          )}

          {cashDrawerEnabled && (
            <div
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                drawerOpen
                  ? "bg-[var(--status-pending-bg)] text-[var(--status-pending)]"
                  : "bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)] border border-[var(--border-color)]"
              }`}
              title={drawerOpen ? "Drawer open" : "Drawer closed"}
            >
              <Lock className="w-3 h-3" />
            </div>
          )}

          <div
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              online
                ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                : "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
            }`}
            title={online ? "Online" : "Offline"}
          >
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>
        </div>

        {/* Hotkeys - Compact */}
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] font-mono ml-1">
          <kbd className="px-1.5 py-0.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-color)] text-[9px] leading-none">
            Ctrl+D
          </kbd>
          <span className="text-[9px] text-[var(--text-tertiary)] opacity-60">|</span>
          <kbd className="px-1.5 py-0.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-color)] text-[9px] leading-none">
            Ctrl+↵
          </kbd>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CashierHeader);