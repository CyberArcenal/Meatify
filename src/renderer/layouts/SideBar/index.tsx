// src/renderer/layouts/Sidebar/index.tsx
import React, { useCallback } from 'react';
import SidebarHeader from './components/SidebarHeader';
import SidebarStats from './components/SidebarStats';
import { useSidebarState } from './hooks/useSidebarState';
import { useMenuItems } from './hooks/useMenuItems';
import { useSidebarStats } from './hooks/useSidebarStats';
import SidebarNav from './components/SidebarNav';
import SidebarFooter from './components/SidebarFooter';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { menuItems, groupedItems, categories } = useMenuItems();
  const { openDropdowns, toggleDropdown, isActivePath, isDropdownActive } =
    useSidebarState(menuItems);
  const { stats, loading } = useSidebarStats();

  const handleNavigate = useCallback(() => {
    // Close sidebar on mobile after navigation
    if (onClose) onClose();
  }, [onClose]);

  return (
    <div
      className={`
        fixed md:relative flex flex-col h-screen 
        bg-gradient-to-b from-[var(--sidebar-bg)] to-[#1e293b]
        border-r border-[var(--sidebar-border)]
        shadow-xl transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'w-64' : 'w-0'}
      `}
    >
      {/* Header - Logo + Company Name */}
      <SidebarHeader />

      {/* Navigation - Categories + Menu Items */}
      <SidebarNav
        groupedItems={groupedItems}
        categories={categories}
        openDropdowns={openDropdowns}
        toggleDropdown={toggleDropdown}
        isActivePath={isActivePath}
        isDropdownActive={isDropdownActive}
        onNavigate={handleNavigate}
      />

      {/* Stats - Today's Sales, Transactions, Low Stock, Pending Orders */}
      <SidebarStats stats={stats} loading={loading} />

      {/* Footer - Version + Help + Settings */}
      <SidebarFooter onNavigate={handleNavigate} />
    </div>
  );
};

export default Sidebar;