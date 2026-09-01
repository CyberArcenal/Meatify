// src/components/Shared/Schedulers/SchedulerGroup.tsx
import React from "react";
import {
  AuditStatus,
  BatchExpiryStatus,
  LowStockStatus,
  DailyReportStatus,
  BackupStatus,
  DataRetentionStatus,
} from "./index";

interface SchedulerGroupProps {
  /** Compact mode (dots only) */
  compact?: boolean;
  /** Show labels next to icons */
  showLabels?: boolean;
  /** Which schedulers to show (default: all) */
  show?: ("audit" | "batchExpiry" | "lowStock" | "dailyReport" | "backup" | "dataRetention")[];
}

const SchedulerGroup: React.FC<SchedulerGroupProps> = ({
  compact = false,
  showLabels = false,
  show = ["audit", "batchExpiry", "lowStock", "dailyReport", "backup", "dataRetention"],
}) => {
  const schedulerMap = {
    audit: <AuditStatus key="audit" compact={compact} showLabel={showLabels} />,
    batchExpiry: <BatchExpiryStatus key="batchExpiry" compact={compact} showLabel={showLabels} />,
    lowStock: <LowStockStatus key="lowStock" compact={compact} showLabel={showLabels} />,
    dailyReport: <DailyReportStatus key="dailyReport" compact={compact} showLabel={showLabels} />,
    backup: <BackupStatus key="backup" compact={compact} showLabel={showLabels} />,
    dataRetention: <DataRetentionStatus key="dataRetention" compact={compact} showLabel={showLabels} />,
  };

  const components = show.map((key) => schedulerMap[key]);

  return (
    <div className="flex items-center gap-1.5">
      {components}
    </div>
  );
};

export default SchedulerGroup;