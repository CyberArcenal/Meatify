// src/components/Shared/Schedulers/BackupStatus.tsx
import React from "react";
import { Database } from "lucide-react";
import SchedulerStatus from "./SchedulerStatus";

interface BackupStatusProps {
  compact?: boolean;
  showLabel?: boolean;
}

const BackupStatus: React.FC<BackupStatusProps> = ({
  compact = false,
  showLabel = false,
}) => {
  return (
    <SchedulerStatus
      id="backup"
      label="Backup"
      icon={<Database className="w-3.5 h-3.5" />}
      channel="backup:status"
      compact={compact}
      showLabel={showLabel}
      autoClearMs={8000}
    />
  );
};

export default BackupStatus;