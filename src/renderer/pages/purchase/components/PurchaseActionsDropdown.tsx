// src/renderer/pages/inventory/purchases/components/PurchaseActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { Purchase } from "../../../api/core/purchase";
import { allowedNextStatuses } from "../utils/statusTransitions";

interface PurchaseActionsDropdownProps {
  purchase: Purchase;
  onView: (purchase: Purchase) => void;
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  onStatusUpdate: (purchase: Purchase) => void;
}

const PurchaseActionsDropdown: React.FC<PurchaseActionsDropdownProps> = ({
  purchase,
  onView,
  onEdit,
  onDelete,
  onStatusUpdate,
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

  const canEdit = purchase.status === "pending" || purchase.status === "approved";
  const isLocked = purchase.status === "completed" || purchase.status === "cancelled";
  const allowedStatuses = allowedNextStatuses(purchase.status);
  const hasStatusOptions = allowedStatuses.length > 0;

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
              onClick={() => handleAction(() => onView(purchase))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Eye className="w-4 h-4 text-[var(--accent-blue)]" />
              View Details
            </button>

            {canEdit && (
              <button
                onClick={() => handleAction(() => onEdit(purchase))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <Edit className="w-4 h-4 text-yellow-500" />
                Edit Purchase
              </button>
            )}

            {hasStatusOptions && (
              <button
                onClick={() => handleAction(() => onStatusUpdate(purchase))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <Tag className="w-4 h-4 text-[var(--accent-purple)]" />
                Update Status
              </button>
            )}

            {!isLocked && (
              <>
                <div className="border-t border-[var(--border-color)] my-1" />
                <button
                  onClick={() => handleAction(() => onDelete(purchase))}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--status-cancelled-bg)] transition-colors text-[var(--danger-color)]"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancel Purchase
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseActionsDropdown;