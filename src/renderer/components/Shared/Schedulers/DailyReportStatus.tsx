// src/components/Shared/Schedulers/DailyReportStatus.tsx
import React from "react";
import { Clock } from "lucide-react";
import SchedulerStatus from "./SchedulerStatus";

interface DailyReportStatusProps {
  compact?: boolean;
  showLabel?: boolean;
}

const DailyReportStatus: React.FC<DailyReportStatusProps> = ({
  compact = false,
  showLabel = false,
}) => {
  return (
    <SchedulerStatus
      id="dailyReport"
      label="Daily Report"
      icon={<Clock className="w-3.5 h-3.5" />}
      channel="dailyReport:status"
      compact={compact}
      showLabel={showLabel}
      autoClearMs={6000}
    />
  );
};

export default DailyReportStatus;