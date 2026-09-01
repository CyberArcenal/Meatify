// src/components/Layout/TopBar/TopBarLogo.tsx
import React from "react";
import { Beef } from "lucide-react";

interface TopBarLogoProps {
  showText?: boolean;
}

const TopBarLogo: React.FC<TopBarLogoProps> = ({ showText = true }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-hover)] flex items-center justify-center shadow-md">
        <Beef className="w-5 h-5 text-[var(--btn-primary-text)]" />
      </div>
      {showText && (
        <span className="text-sm font-semibold text-white">Meatify</span>
      )}
    </div>
  );
};

export default TopBarLogo;