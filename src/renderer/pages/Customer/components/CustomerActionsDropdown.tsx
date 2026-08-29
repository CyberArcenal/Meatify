// src/renderer/pages/customer/components/CustomerActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Star,
  Award,
} from "lucide-react";
import type { Customer } from "../../../api/core/customer";

interface CustomerActionsDropdownProps {
  customer: Customer;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
  onAdjustPoints?: (customer: Customer) => void;
}

const CustomerActionsDropdown: React.FC<CustomerActionsDropdownProps> = ({
  customer,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onAdjustPoints,
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
    const dropdownHeight = 280;
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
              onClick={() => handleAction(() => onView(customer))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Eye className="w-4 h-4 text-[var(--accent-blue)]" />
              View Details
            </button>

            <button
              onClick={() => handleAction(() => onEdit(customer))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Edit className="w-4 h-4 text-yellow-500" />
              Edit Customer
            </button>

            {onAdjustPoints && (
              <button
                onClick={() => handleAction(() => onAdjustPoints(customer))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
              >
                <Star className="w-4 h-4 text-[var(--accent-purple)]" />
                Adjust Points
              </button>
            )}

            <button
              onClick={() => handleAction(() => onToggleStatus(customer))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              {customer.isActive ? (
                <>
                  <PowerOff className="w-4 h-4 text-[var(--danger-color)]" />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 text-[var(--success-color)]" />
                  Activate
                </>
              )}
            </button>

            <div className="border-t border-[var(--border-color)] my-1" />

            <button
              onClick={() => handleAction(() => onDelete(customer))}
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

export default CustomerActionsDropdown;