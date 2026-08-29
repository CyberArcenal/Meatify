// src/renderer/pages/inventory/meat/components/MeatActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  DollarSign,
  ArrowUpDown,
  PackageMinus,
} from "lucide-react";
import type { Meat } from "../../../api/core/meat";

interface MeatActionsDropdownProps {
  meat: Meat;
  onView: (meat: Meat) => void;
  onEdit: (meat: Meat) => void;
  onDelete: (meat: Meat) => void;
  onToggleStatus: (meat: Meat) => void;
  onPriceEdit: (meat: Meat) => void;
  onReorderLevelEdit: (meat: Meat) => void;
  onReorderQtyEdit: (meat: Meat) => void;
}

const MeatActionsDropdown: React.FC<MeatActionsDropdownProps> = ({
  meat,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onPriceEdit,
  onReorderLevelEdit,
  onReorderQtyEdit,
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
    const dropdownHeight = 300; // increased for more items
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
          className="fixed z-50 rounded-lg shadow-xl border w-52"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--border-color)",
            ...getDropdownPosition(),
          }}
        >
          <div className="py-1">
            <button
              onClick={() => handleAction(() => onView(meat))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Eye className="w-4 h-4 text-[var(--accent-blue)]" />
              View Details
            </button>

            <button
              onClick={() => handleAction(() => onEdit(meat))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Edit className="w-4 h-4 text-yellow-500" />
              Edit Meat
            </button>

            <div className="border-t border-[var(--border-color)] my-1" />

            <button
              onClick={() => handleAction(() => onPriceEdit(meat))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <DollarSign className="w-4 h-4 text-[var(--accent-green)]" />
              Edit Price
            </button>

            <button
              onClick={() => handleAction(() => onReorderLevelEdit(meat))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <ArrowUpDown className="w-4 h-4 text-[var(--accent-purple)]" />
              Edit Reorder Level
            </button>

            <button
              onClick={() => handleAction(() => onReorderQtyEdit(meat))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <PackageMinus className="w-4 h-4 text-[var(--accent-orange)]" />
              Edit Reorder Quantity
            </button>

            <div className="border-t border-[var(--border-color)] my-1" />

            <button
              onClick={() => handleAction(() => onToggleStatus(meat))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              {meat.isActive ? (
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

            <button
              onClick={() => handleAction(() => onDelete(meat))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--status-cancelled-bg)] transition-colors text-[var(--danger-color)]"
            >
              <Trash2 className="w-4 h-4" />
              Deactivate (Soft Delete)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeatActionsDropdown;