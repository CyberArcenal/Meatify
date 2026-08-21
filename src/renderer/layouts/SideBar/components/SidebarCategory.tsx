// src/renderer/layouts/Sidebar/components/SidebarCategory.tsx
import React from 'react';
import type { MenuItem } from '../types';
import SidebarMenuItem from './SidebarMenuItem';

interface SidebarCategoryProps {
  name: string;
  items: MenuItem[];
  openDropdowns: Record<string, boolean>;
  toggleDropdown: (name: string) => void;
  isActivePath: (path: string) => boolean;
  isDropdownActive: (items: MenuItem[]) => boolean;
  onNavigate?: () => void;
}

const SidebarCategory: React.FC<SidebarCategoryProps> = ({
  name,
  items,
  openDropdowns,
  toggleDropdown,
  isActivePath,
  isDropdownActive,
  onNavigate,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h6 className="px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider bg-[#334155]/50 rounded-lg">
        {name}
      </h6>
      <ul className="space-y-1 mt-2">
        {items.map((item) => (
          <SidebarMenuItem
            key={item.path || item.name}
            item={item}
            depth={0}
            isActivePath={isActivePath}
            isDropdownActive={isDropdownActive}
            open={openDropdowns[item.name]}
            onToggle={() => toggleDropdown(item.name)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
};

export default SidebarCategory;