// src/renderer/layouts/Sidebar/components/SidebarHeader.tsx
import React from 'react';
import { Beef } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';

interface SidebarHeaderProps {
  companyName?: string;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ companyName: propCompanyName }) => {
  const { getSetting } = useSettings();
  const companyName = propCompanyName || getSetting('general', 'company_name', 'Meatify');

  return (
    <div className="flex-shrink-0 border-b border-[var(--sidebar-border)] bg-gradient-to-r from-[var(--sidebar-bg)] to-[#1e293b] p-5">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-hover)] flex items-center justify-center overflow-hidden shadow-lg">
          <Beef className="w-6 h-6 text-[var(--btn-primary-text)]" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-white">
            {companyName}
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            Meat Shop POS
          </p>
        </div>
      </div>
    </div>
  );
};

export default SidebarHeader;