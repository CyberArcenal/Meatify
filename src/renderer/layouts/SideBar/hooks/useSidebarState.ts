// src/renderer/layouts/Sidebar/hooks/useSidebarState.ts
import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { MenuItem } from '../types';

export const useSidebarState = (menuItems: MenuItem[]) => {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const isActivePath = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const isDropdownActive = useCallback(
    (items: MenuItem[] = []) => items.some((item) => isActivePath(item.path)),
    [isActivePath]
  );

  const toggleDropdown = useCallback((name: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // Auto-expand dropdowns for active paths
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children && isDropdownActive(item.children)) {
        setOpenDropdowns((prev) => ({ ...prev, [item.name]: true }));
      }
    });
  }, [location.pathname, menuItems, isDropdownActive]);

  return {
    openDropdowns,
    toggleDropdown,
    isActivePath,
    isDropdownActive,
  };
};