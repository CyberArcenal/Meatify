// src/components/Layout/TopBar/types.ts
export interface RouteInfo {
  path: string;
  name: string;
  category: string;
}

export interface TopBarProps {
  toggleSidebar: () => void;
}