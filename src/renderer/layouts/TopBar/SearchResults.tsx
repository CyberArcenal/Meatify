// src/components/Layout/TopBar/SearchResults.tsx
import React from "react";
import type { RouteInfo } from "./types";
import { Search } from "lucide-react";

interface SearchResultsProps {
  results: RouteInfo[];
  onSelect: (path: string) => void;
  getRouteIcon: (category: string) => React.ElementType;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onSelect,
  getRouteIcon,
}) => {
  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-2xl bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] p-6 z-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--sidebar-border)]/30 flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
          </div>
          <div className="text-[var(--sidebar-text)] font-medium mb-1">
            No results found
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            Try searching for products, customers, or transactions
          </div>
        </div>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    POS: "var(--accent-gold)",
    Customers: "var(--accent-purple)",
    Sales: "var(--accent-green)",
    Inventory: "var(--accent-orange)",
    Reports: "var(--accent-blue)",
    System: "var(--accent-amber)",
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-2xl bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] max-h-80 overflow-auto z-50">
      <div className="p-2 border-b border-[var(--sidebar-border)]">
        <div className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-1">
          Quick Navigation
        </div>
      </div>
      {results.map((route, index) => {
        const RouteIcon = getRouteIcon(route.category);
        const color = categoryColors[route.category] || "var(--accent-gold)";

        return (
          <div
            key={index}
            className="px-3 py-2.5 cursor-pointer border-b border-[var(--sidebar-border)] last:border-b-0 hover:bg-[var(--topbar-hover)]/10 transition-colors group"
            onMouseDown={() => onSelect(route.path)}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{ backgroundColor: color + "20", color }}
              >
                <RouteIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--sidebar-text)] truncate text-sm">
                  {route.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--sidebar-border)]/50 text-[var(--text-tertiary)]">
                    {route.category}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] truncate">
                    {route.path}
                  </span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 rounded-full bg-[var(--accent-gold)]/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)]"></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SearchResults;