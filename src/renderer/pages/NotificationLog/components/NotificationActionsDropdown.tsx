// src/renderer/pages/system/notification-logs/components/NotificationActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  MoreVertical,
  Eye,
  RefreshCw,
  Send,
  Trash2,
  Loader2,
} from "lucide-react";
import type { NotificationLog } from "../../../api/core/notificationLog";

interface NotificationActionsDropdownProps {
  log: NotificationLog;
  onView: (log: NotificationLog) => void;
  onRetry: (id: number) => void;
  onResend: (id: number) => void;
  onDelete: (id: number) => void;
  isSending?: boolean;
}

const NotificationActionsDropdown: React.FC<NotificationActionsDropdownProps> = ({
  log,
  onView,
  onRetry,
  onResend,
  onDelete,
  isSending = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => setIsOpen((prev) => !prev);
  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDropdownPosition = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 180;
    const windowHeight = window.innerHeight;
    if (rect.bottom + dropdownHeight > windowHeight) {
      return {
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }
    return {
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  };

  return (
    <div ref={dropdownRef} className="inline-block">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="p-1.5 rounded hover:bg-[var(--card-hover-bg)] transition-colors"
        title="Actions"
        disabled={isSending}
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
        ) : (
          <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
        )}
      </button>

      {isOpen && (
        <div
          className="fixed z-50 rounded-lg shadow-xl border w-48"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--border-color)",
            ...getDropdownPosition(),
          }}
        >
          <div className="py-1">
            <button
              onClick={() => handleAction(() => onView(log))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Eye className="w-4 h-4 text-[var(--accent-blue)]" />
              View Details
            </button>

            {log.status === "failed" && (
              <button
                onClick={() => handleAction(() => onRetry(log.id))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <RefreshCw className="w-4 h-4 text-[var(--accent-amber)]" />
                Retry
              </button>
            )}

            {(log.status === "sent" || log.status === "resend") && (
              <button
                onClick={() => handleAction(() => onResend(log.id))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <Send className="w-4 h-4 text-[var(--accent-green)]" />
                Resend
              </button>
            )}

            <div className="border-t border-[var(--border-color)] my-1" />

            <button
              onClick={() => handleAction(() => onDelete(log.id))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--status-cancelled-bg)] transition-colors text-[var(--danger-color)]"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationActionsDropdown;