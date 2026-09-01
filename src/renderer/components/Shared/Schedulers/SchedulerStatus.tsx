// src/components/Shared/Schedulers/SchedulerStatus.tsx
import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export type SchedulerStatusType = "idle" | "running" | "completed" | "failed" | "disabled";

export interface SchedulerStatusProps {
  /** Unique identifier for this scheduler */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: ReactNode;
  /** IPC channel to listen to */
  channel: string;
  /** Whether to show label text */
  showLabel?: boolean;
  /** Compact mode (dots only) */
  compact?: boolean;
  /** Auto-clear timeout in ms */
  autoClearMs?: number;
  /** Callback when status changes */
  onStatusChange?: (status: SchedulerStatusType, data?: any) => void;
}

const SchedulerStatus: React.FC<SchedulerStatusProps> = ({
  id,
  label,
  icon,
  channel,
  showLabel = false,
  compact = false,
  autoClearMs = 5000,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<SchedulerStatusType>("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [count, setCount] = useState<number | undefined>();
  const [lastRun, setLastRun] = useState<Date | undefined>();

  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Update status with auto-clear
  const updateStatus = (
    newStatus: SchedulerStatusType,
    newMessage?: string,
    newCount?: number,
    shouldAutoClear = true
  ) => {
    if (!mountedRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus(newStatus);
    setMessage(newMessage);
    setCount(newCount);

    if (newStatus === "completed" || newStatus === "failed") {
      setLastRun(new Date());
    }

    // Notify parent
    if (onStatusChange) {
      onStatusChange(newStatus, { message: newMessage, count: newCount });
    }

    // Auto-clear after timeout
    if (shouldAutoClear && (newStatus === "completed" || newStatus === "failed")) {
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setStatus("idle");
          setMessage(undefined);
          setCount(undefined);
        }
        timeoutRef.current = null;
      }, autoClearMs);
    }
  };

  // Listen to IPC events
  useEffect(() => {
    const listener = (_event: any, data: any) => {
      if (!mountedRef.current) return;

      if (data.status === "started") {
        updateStatus("running", data.message || "Running...");
      } else if (data.status === "completed") {
        updateStatus(
          "completed",
          data.message || `${data.count || 0} items processed`,
          data.count
        );
      } else if (data.status === "failed") {
        updateStatus("failed", data.error || data.message || "Failed");
      }
    };

    // @ts-ignore - window.backendAPI may not be fully typed
    window.backendAPI?.on?.(channel, listener);
    return () => {
      // @ts-ignore
      window.backendAPI?.off?.(channel, listener);
    };
  }, [channel]);

  // ─── RENDER ──────────────────────────────────────────────────────

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300";
      case "failed":
        return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300";
      case "disabled":
        return "bg-gray-100 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400";
      default:
        return "bg-transparent text-gray-400 dark:text-gray-500";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-3 h-3" />;
      case "failed":
        return <XCircle className="w-3 h-3" />;
      case "disabled":
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "running":
        return "Running";
      case "completed":
        return "Done";
      case "failed":
        return "Failed";
      case "disabled":
        return "Disabled";
      default:
        return "Idle";
    }
  };

  const isActive = status !== "idle" && status !== "disabled";

  // Compact mode: show only a dot
  if (compact) {
    return (
      <div
        className={`relative w-2 h-2 rounded-full ${
          status === "running"
            ? "bg-blue-500 animate-pulse"
            : status === "completed"
            ? "bg-green-500"
            : status === "failed"
            ? "bg-red-500"
            : status === "disabled"
            ? "bg-gray-400"
            : "bg-gray-300 dark:bg-gray-600"
        }`}
        title={`${label}: ${getStatusLabel()}${message ? ` - ${message}` : ""}`}
      />
    );
  }

  // Full mode
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all duration-300 ${
        isActive ? getStatusColor() : "opacity-50"
      }`}
      title={`${label}: ${getStatusLabel()}${message ? ` - ${message}` : ""}${
        lastRun ? `\nLast run: ${lastRun.toLocaleString()}` : ""
      }`}
    >
      {icon}
      {showLabel && <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>}
      {isActive && (
        <>
          {getStatusIcon()}
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-bold">{count}</span>
          )}
        </>
      )}
      {!isActive && <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />}
    </div>
  );
};

export default SchedulerStatus;