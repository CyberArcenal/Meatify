// src/renderer/pages/inventory/movements/components/MovementTable.tsx
import React from "react";
import { Eye, Package } from "lucide-react";
import {
  formatMovementType,
  getMovementTypeColor,
} from "../hooks/useMovements";
import type { InventoryMovement } from "../../../api/core/inventoryMovement";

interface MovementTableProps {
  movements: InventoryMovement[];
  onView: (movement: InventoryMovement) => void;
}

export const MovementTable: React.FC<MovementTableProps> = ({
  movements,
  onView,
}) => {
  if (movements.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No movements found
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--table-header-bg)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[8%]">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[15%]">
                Date & Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[20%]">
                Meat
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Batch
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Qty Change
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[12%]">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Sale ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[15%]">
                Notes
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[6%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {movements.map((movement) => (
              <tr
                key={movement.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(movement)}
              >
                <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">
                  #{movement.id}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {new Date(movement.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-medium">
                  {movement.meat ? (
                    <div>
                      <span className="font-mono text-[var(--text-tertiary)]">
                        {movement.meat.sku}
                      </span>
                      <br />
                      <span>{movement.meat.name}</span>
                    </div>
                  ) : (
                    `Meat ID: ${movement.meatId}`
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {movement.batch?.batchCode || (movement.batchId ? `#${movement.batchId}` : "—")}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold">
                  <span
                    className={
                      movement.qtyChange > 0
                        ? "text-[var(--accent-green)]"
                        : "text-[var(--accent-red)]"
                    }
                  >
                    {movement.qtyChange > 0 ? "+" : ""}
                    {movement.qtyChange}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${getMovementTypeColor(movement.movementType)}20`,
                      color: getMovementTypeColor(movement.movementType),
                    }}
                  >
                    {formatMovementType(movement.movementType)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {movement.saleId ? (
                    <a
                      href={`/sales/${movement.saleId}`}
                      className="text-[var(--accent-blue)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{movement.saleId}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] truncate">
                  {movement.notes || "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(movement);
                    }}
                    className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-gold)]"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};