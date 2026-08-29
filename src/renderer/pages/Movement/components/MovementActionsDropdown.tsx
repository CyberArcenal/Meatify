// src/renderer/pages/inventory/movements/components/MovementActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import { Eye, MoreVertical } from "lucide-react";
import type { InventoryMovement } from "../../../api/core/inventoryMovement";

interface MovementActionsDropdownProps {
  movement: InventoryMovement;
  onView: (movement: InventoryMovement) => void;
}

const MovementActionsDropdown: React.FC<MovementActionsDropdownProps> = ({
  movement,
  onView,
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
    const dropdownHeight = 60;
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
          className="fixed z-50 rounded-lg shadow-xl border w-44"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--border-color)",
            ...getDropdownPosition(),
          }}
        >
          <div className="py-1">
            <button
              onClick={() => handleAction(() => onView(movement))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)]"
            >
              <Eye className="w-4 h-4 text-[var(--accent-blue)]" />
              View Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovementActionsDropdown;