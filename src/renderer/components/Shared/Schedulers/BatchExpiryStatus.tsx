// src/components/Shared/Schedulers/BatchExpiryStatus.tsx
import React from "react";
import { Calendar } from "lucide-react";
import SchedulerStatus from "./SchedulerStatus";

interface BatchExpiryStatusProps {
  compact?: boolean;
  showLabel?: boolean;
}

const BatchExpiryStatus: React.FC<BatchExpiryStatusProps> = ({
  compact = false,
  showLabel = false,
}) => {
  return (
    <SchedulerStatus
      id="batchExpiry"
      label="Batch Expiry"
      icon={<Calendar className="w-3.5 h-3.5" />}
      channel="batch:expiryCheck"
      compact={compact}
      showLabel={showLabel}
      autoClearMs={5000}
    />
  );
};

export default BatchExpiryStatus;