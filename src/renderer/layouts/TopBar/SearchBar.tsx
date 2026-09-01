// src/components/Layout/TopBar/SearchBar.tsx
import React, { useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { RouteInfo, TopBarProps } from "./types";
import SearchResults from "./SearchResults";

interface SearchBarProps {
  routes: RouteInfo[];
  getRouteIcon: (category: string) => React.ElementType;
}

const SearchBar: React.FC<SearchBarProps> = ({ routes, getRouteIcon }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return routes.filter(
      (route) =>
        route.name.toLowerCase().includes(query) ||
        route.path.toLowerCase().includes(query.replace(/\s+/g, "-")) ||
        route.category.toLowerCase().includes(query)
    );
  }, [searchQuery, routes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredRoutes.length > 0) {
      navigate(filteredRoutes[0].path);
      setSearchQuery("");
      setShowResults(false);
    }
  };

  const handleSelect = useCallback(
    (path: string) => {
      navigate(path);
      setSearchQuery("");
      setShowResults(false);
    },
    [navigate]
  );

  return (
    <div className="relative">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
          <input
            type="text"
            placeholder="Search products, customers, transactions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--topbar-search-border)] rounded-lg bg-[var(--topbar-search-bg)] text-[var(--sidebar-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent text-sm shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <div className="w-5 h-5 rounded-full bg-[var(--text-tertiary)]/20 flex items-center justify-center">
                <span className="text-[10px] text-[var(--text-tertiary)]">×</span>
              </div>
            </button>
          )}
        </div>
      </form>

      {showResults && (
        <SearchResults
          results={filteredRoutes}
          onSelect={handleSelect}
          getRouteIcon={getRouteIcon}
        />
      )}
    </div>
  );
};

export default SearchBar;