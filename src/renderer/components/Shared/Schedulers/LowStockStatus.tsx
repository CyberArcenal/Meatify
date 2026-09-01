// src/components/Shared/Schedulers/LowStockStatus.tsx
import React from "react";
import { AlertCircle } from "lucide-react";
import SchedulerStatus from "./SchedulerStatus";

interface LowStockStatusProps {
  compact?: boolean;
  showLabel?: boolean;
}

const LowStockStatus: React.FC<LowStockStatusProps> = ({
  compact = false,
  showLabel = false,
}) => {
  return (
    <SchedulerStatus
      id="lowStock"
      label="Low Stock"
      icon={<AlertCircle className="w-3.5 h-3.5" />}
      channel="inventory:lowStock"
      compact={compact}
      showLabel={showLabel}
      autoClearMs={5000}
    />
  );
};

export default LowStockStatus;