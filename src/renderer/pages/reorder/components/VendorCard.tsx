// src/renderer/pages/inventory/reorder/components/VendorCard.tsx
import React from "react";
import { Beef, AlertTriangle, Phone, Mail } from "lucide-react";
import type { SupplierGroup } from "../hooks/useReorder";

interface VendorCardProps {
  group: SupplierGroup;
  isSelected: boolean;
  onSelect: () => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({
  group,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-[var(--accent-gold)] bg-[var(--accent-gold-light)] shadow-md ring-1 ring-[var(--accent-gold)]/30"
          : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--accent-gold)] hover:bg-[var(--card-hover-bg)] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            {group.supplier.name}
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5 truncate max-w-[150px]">
            {group.supplier.contactInfo || group.supplier.email || "No contact info"}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--status-pending-bg)] text-[var(--status-pending)] px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
          <AlertTriangle className="w-3 h-3" />
          {group.lowStockCount}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <Beef className="w-4 h-4" />
          <span>{group.meats.length} items</span>
        </div>
        {group.supplier.phone && (
          <div className="flex items-center gap-1 text-[var(--text-tertiary)] text-xs">
            <Phone className="w-3 h-3" />
            {group.supplier.phone}
          </div>
        )}
        {group.supplier.email && (
          <div className="flex items-center gap-1 text-[var(--text-tertiary)] text-xs truncate max-w-[120px]">
            <Mail className="w-3 h-3" />
            {group.supplier.email}
          </div>
        )}
      </div>
    </div>
  );
};