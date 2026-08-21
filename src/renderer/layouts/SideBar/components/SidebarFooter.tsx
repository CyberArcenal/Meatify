// src/renderer/layouts/Sidebar/components/SidebarFooter.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, Settings } from 'lucide-react';
import { version, name } from '../../../../../package.json';
import { toTitleCase } from '../../../utils/formatters';

interface SidebarFooterProps {
  onNavigate?: () => void;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const title = toTitleCase(name);

  return (
    <div className="p-4 border-t border-[var(--border-color)] text-center flex-shrink-0 bg-gradient-to-r from-[var(--sidebar-bg)] to-[#1e293b]">
      <p className="text-xs text-[var(--text-tertiary)] mb-2">
        {version} • © {new Date().getFullYear()} {title}
      </p>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => {
            navigate('/help');
            onNavigate?.();
          }}
          className="text-[var(--text-tertiary)] hover:text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 p-1.5 rounded-full transition-colors"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <Link
          to="/system/settings"
          onClick={onNavigate}
          className="text-[var(--text-tertiary)] hover:text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 p-1.5 rounded-full transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default SidebarFooter;