// src/components/Layout/TopBar/TopBarRight.tsx
import React from "react";
import NotificationBell from "./NotificationBell";
import { SchedulerGroup } from "../../components/Shared/Schedulers";
import StatusIndicators from "../../components/Shared/StatusIndicators";
import UpdateNotifier from "../../components/Shared/UpdateNotifier";

interface TopBarRightProps {
  unreadCount: number;
  onNotificationClick: () => void;
}

const TopBarRight: React.FC<TopBarRightProps> = ({
  unreadCount,
  onNotificationClick,
}) => {
  return (
    <div className="flex items-center gap-3">
      <SchedulerGroup compact={true} showLabels={false} />
      <StatusIndicators />
      <UpdateNotifier />
      <NotificationBell
        unreadCount={unreadCount}
        onClick={onNotificationClick}
      />
    </div>
  );
};

export default TopBarRight;