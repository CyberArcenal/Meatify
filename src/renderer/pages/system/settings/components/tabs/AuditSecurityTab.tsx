// src/renderer/pages/system/settings/components/tabs/AuditSecurityTab.tsx
import React from "react";
import type { AuditSecuritySettings } from "../../../../../api/utils/system_config";
import Switch from "../../../../../components/UI/Switch";

interface AuditSecurityTabProps {
  settings: AuditSecuritySettings;
  onChange: (field: keyof AuditSecuritySettings, value: any) => void;
}

export const AuditSecurityTab: React.FC<AuditSecurityTabProps> = ({
  settings,
  onChange,
}) => {
  const updateField = (field: keyof AuditSecuritySettings, value: any) => {
    onChange(field, value);
  };

  // Safely convert log_events to a display string
  const getLogEventsDisplay = (): string => {
    const logEvents = settings.log_events;
    if (Array.isArray(logEvents)) {
      return logEvents.join(", ");
    }
    if (typeof logEvents === "string") {
      try {
        const parsed = JSON.parse(logEvents);
        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        }
      } catch {
        return logEvents;
      }
    }
    return "CREATE, UPDATE, DELETE, LOGIN, LOGOUT";
  };

  const handleLogEventsChange = (value: string) => {
    const events = value
      .split(",")
      .map((e) => e.trim().toUpperCase())
      .filter(Boolean);
    updateField("log_events", events);
  };

  return (
    <div className="space-y-8">
      {/* Audit Logging */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Audit Logging
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <Switch
              checked={settings.audit_log_enabled !== false}
              onChange={(checked) => updateField("audit_log_enabled", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Enable Audit Log
            </span>
            <span className="ml-2 text-xs text-[var(--text-tertiary)]">
              (tracks all CRUD operations)
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Log Retention (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.log_retention_days || 30}
              onChange={(e) => updateField("log_retention_days", parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Older logs are automatically deleted to save space
            </p>
          </div>
        </div>
      </div>

      {/* Log Events */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Events to Track
        </h4>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Event Types (comma separated)
          </label>
          <input
            type="text"
            value={getLogEventsDisplay()}
            onChange={(e) => handleLogEventsChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            placeholder="CREATE, UPDATE, DELETE, LOGIN, LOGOUT"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Available: CREATE, UPDATE, DELETE, LOGIN, LOGOUT. Use "NONE" to disable all.
          </p>
        </div>
      </div>
    </div>
  );
};