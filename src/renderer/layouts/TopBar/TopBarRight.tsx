// src/components/Layout/TopBar/TopBarRight.tsx
import React from "react";
import NotificationBell from "./NotificationBell";
import { SchedulerGroup } from "../../components/Shared/Schedulers";
import StatusIndicators from "../../components/Shared/StatusIndicators";
import UpdateNotifier from "../../components/Shared/UpdateNotifier";
import { useNotificationDrawer } from "../../contexts/NotificationDrawerContext";
import { Bell } from "lucide-react";

interface TopBarRightProps {
  unreadCount: number;
  onNotificationClick: () => void;
}

const TopBarRight: React.FC<TopBarRightProps> = ({
  unreadCount,
  onNotificationClick,
}) => {
  const { openDrawer } = useNotificationDrawer();

  return (
    <div className="flex items-center gap-3">
      <SchedulerGroup compact={true} showLabels={false} />
      <StatusIndicators />
      <UpdateNotifier />
      <button
        onClick={openDrawer} // ✅ Open drawer via context
        className="relative p-2 rounded-lg hover:bg-[var(--topbar-hover)]/20 text-[var(--sidebar-text)] transition-colors duration-200 group"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--accent-red)] text-white text-xs font-bold rounded-full px-1 border border-[var(--sidebar-bg)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default TopBarRight;
