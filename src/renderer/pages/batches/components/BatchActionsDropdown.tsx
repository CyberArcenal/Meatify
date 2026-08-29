// src/renderer/pages/inventory/batches/components/BatchActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Package,
  AlertTriangle,
} from "lucide-react";
import type { Batch } from "../../../api/core/batch";

interface BatchActionsDropdownProps {
  batch: Batch;
  onView: (batch: Batch) => void;
  onEdit: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
  onToggleStatus: (batch: Batch) => void;
}

const BatchActionsDropdown: React.FC<BatchActionsDropdownProps> = ({
  batch,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
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
    const dropdownHeight = 220;
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

  const isLocked = batch.status === "depleted" || batch.status === "expired";

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
      >
        <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
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
              onClick={() => handleAction(() => onView(batch))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Eye className="w-4 h-4 text-[var(--accent-blue)]" />
              View Details
            </button>

            {!isLocked && (
              <button
                onClick={() => handleAction(() => onEdit(batch))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <Edit className="w-4 h-4 text-yellow-500" />
                Edit Batch
              </button>
            )}

            {batch.status === "active" && (
              <button
                onClick={() => handleAction(() => onToggleStatus(batch))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <PowerOff className="w-4 h-4 text-[var(--warning-color)]" />
                Put On Hold
              </button>
            )}

            {batch.status === "on_hold" && (
              <button
                onClick={() => handleAction(() => onToggleStatus(batch))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <Power className="w-4 h-4 text-[var(--success-color)]" />
                Activate
              </button>
            )}

            {!isLocked && (
              <>
                <div className="border-t border-[var(--border-color)] my-1" />
                <button
                  onClick={() => handleAction(() => onDelete(batch))}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--status-cancelled-bg)] transition-colors text-[var(--danger-color)]"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Batch
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchActionsDropdown;