// src/renderer/layouts/Sidebar/components/SidebarNav.tsx
import React from 'react';
import type { MenuItem } from '../types';
import SidebarCategory from './SidebarCategory';

interface SidebarNavProps {
  groupedItems: Record<string, MenuItem[]>;
  categories: Array<{ id: string; name: string }>;
  openDropdowns: Record<string, boolean>;
  toggleDropdown: (name: string) => void;
  isActivePath: (path: string) => boolean;
  isDropdownActive: (items: MenuItem[]) => boolean;
  onNavigate?: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({
  groupedItems,
  categories,
  openDropdowns,
  toggleDropdown,
  isActivePath,
  isDropdownActive,
  onNavigate,
}) => {
  return (
    <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
      {categories.map((category) => (
        <SidebarCategory
          key={category.id}
          name={category.name}
          items={groupedItems[category.id] || []}
          openDropdowns={openDropdowns}
          toggleDropdown={toggleDropdown}
          isActivePath={isActivePath}
          isDropdownActive={isDropdownActive}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
};

export default SidebarNav;