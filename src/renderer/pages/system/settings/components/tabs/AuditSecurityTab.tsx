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
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Log Retention (days)
            </label>
            <input
              type="number"
              min="1"
              value={settings.log_retention_days || 30}
              onChange={(e) => updateField("log_retention_days", parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Number of days to keep audit logs before auto-deletion
            </p>
          </div>
        </div>
      </div>

      {/* Log Events */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Log Events
        </h4>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Events to Log (comma separated)
          </label>
          <input
            type="text"
            value={getLogEventsDisplay()}
            onChange={(e) => handleLogEventsChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            placeholder="CREATE, UPDATE, DELETE, LOGIN, LOGOUT"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Enter actions to track. Separate with commas. Use "NONE" to disable all.
          </p>
        </div>
      </div>

      {/* Security Settings */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Security Settings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Switch
              checked={settings.force_https || false}
              onChange={(checked) => updateField("force_https", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Force HTTPS (for online sync)
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.session_encryption_enabled !== false}
              onChange={(checked) => updateField("session_encryption_enabled", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Enable Session Encryption
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.gdpr_compliance_enabled || false}
              onChange={(checked) => updateField("gdpr_compliance_enabled", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              GDPR Compliance Mode
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.require_mfa_for_admin || false}
              onChange={(checked) => updateField("require_mfa_for_admin", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Require MFA for Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};