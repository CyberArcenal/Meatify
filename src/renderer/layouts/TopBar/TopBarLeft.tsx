// src/components/Layout/TopBar/TopBarLeft.tsx
import React from "react";
import { Menu } from "lucide-react";
import TopBarLogo from "./TopBarLogo";
import DateDisplay from "../../components/Shared/DateDisplay";

interface TopBarLeftProps {
  toggleSidebar: () => void;
}

const TopBarLeft: React.FC<TopBarLeftProps> = ({ toggleSidebar }) => {
  return (
    <div className="flex items-center gap-4">
      {/* Menu Toggle */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle menu"
        className="p-2 rounded-lg hover:bg-[var(--topbar-hover)]/20 text-[var(--sidebar-text)] transition-all duration-200"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo (Mobile) */}
      <div className="md:hidden">
        <TopBarLogo showText={true} />
      </div>

      {/* Date Display (Desktop) */}
      <div className="hidden md:block">
        <DateDisplay />
      </div>
    </div>
  );
};

export default TopBarLeft;