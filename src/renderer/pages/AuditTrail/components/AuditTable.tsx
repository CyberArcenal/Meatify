// src/renderer/pages/AuditTrail/components/AuditTable.tsx
import React from "react";
import { Eye, FileText, CheckSquare, Square } from "lucide-react";
import { getActionColor } from "../hooks/useAuditLogs";
import type { AuditLogEntry } from "../../../api/core/audit";

interface AuditTableProps {
  logs: AuditLogEntry[];
  onView: (log: AuditLogEntry) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const AuditTable: React.FC<AuditTableProps> = ({
  logs,
  onView,
  selectedIds,
  onSelectRow,
  onSelectAll,
}) => {
  if (logs.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No audit logs found
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  const allSelected = logs.length > 0 && logs.every((l) => selectedIds.includes(l.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="w-8 py-3 px-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-[var(--border-color)] cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                ID
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Date & Time
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                User
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Action
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Entity
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(log)}
              >
                <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(log.id)}
                    onChange={(e) => onSelectRow(log.id, e.target.checked)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-primary)]">
                  #{log.id}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {log.user || "System"}
                </td>
                <td className="py-2.5 px-3 text-sm">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${getActionColor(log.action)}20`,
                      color: getActionColor(log.action),
                    }}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] truncate max-w-[120px]">
                  {log.entity}
                  {log.entityId && ` #${log.entityId}`}
                </td>
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onView(log)}
                    className="p-1.5 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-gold)] transition-colors"
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