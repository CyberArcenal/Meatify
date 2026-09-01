// src/components/Layout/TopBar/NotificationBell.tsx
import React from "react";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-[var(--topbar-hover)]/20 text-[var(--sidebar-text)] transition-colors duration-200 group"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--accent-red)] text-white text-xs font-bold rounded-full px-1 border border-[var(--sidebar-bg)]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;