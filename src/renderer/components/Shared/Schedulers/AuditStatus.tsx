// src/components/Shared/Schedulers/AuditStatus.tsx
import React from "react";
import { HardDrive } from "lucide-react";
import SchedulerStatus from "./SchedulerStatus";

interface AuditStatusProps {
  compact?: boolean;
  showLabel?: boolean;
}

const AuditStatus: React.FC<AuditStatusProps> = ({
  compact = false,
  showLabel = false,
}) => {
  return (
    <SchedulerStatus
      id="audit"
      label="Audit Cleanup"
      icon={<HardDrive className="w-3.5 h-3.5" />}
      channel="audit:cleanup"
      compact={compact}
      showLabel={showLabel}
      autoClearMs={5000}
    />
  );
};

export default AuditStatus;