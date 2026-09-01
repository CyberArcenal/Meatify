// src/components/Shared/Schedulers/DataRetentionStatus.tsx
import React from "react";
import { Package } from "lucide-react";
import SchedulerStatus from "./SchedulerStatus";

interface DataRetentionStatusProps {
  compact?: boolean;
  showLabel?: boolean;
}

const DataRetentionStatus: React.FC<DataRetentionStatusProps> = ({
  compact = false,
  showLabel = false,
}) => {
  return (
    <SchedulerStatus
      id="dataRetention"
      label="Data Retention"
      icon={<Package className="w-3.5 h-3.5" />}
      channel="dataRetention:status"
      compact={compact}
      showLabel={showLabel}
      autoClearMs={5000}
    />
  );
};

export default DataRetentionStatus;