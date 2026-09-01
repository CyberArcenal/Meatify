// src/components/Layout/TopBar/TopBarCenter.tsx
import React from "react";
import SearchBar from "./SearchBar";
import type { RouteInfo } from "./types";

interface TopBarCenterProps {
  routes: RouteInfo[];
  getRouteIcon: (category: string) => React.ElementType;
}

const TopBarCenter: React.FC<TopBarCenterProps> = ({
  routes,
  getRouteIcon,
}) => {
  return (
    <div className="flex-1 max-w-2xl mx-4">
      <SearchBar routes={routes} getRouteIcon={getRouteIcon} />
    </div>
  );
};

export default TopBarCenter;