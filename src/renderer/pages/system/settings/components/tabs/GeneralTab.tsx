// src/renderer/pages/system/settings/components/tabs/GeneralTab.tsx
import React from "react";
import type { GeneralSettings } from "../../../../../api/utils/system_config";

interface GeneralTabProps {
  settings: GeneralSettings;
  onChange: (field: keyof GeneralSettings, value: any) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ settings, onChange }) => {
  const updateField = (field: keyof GeneralSettings, value: any) => {
    onChange(field, value);
  };

  return (
    <div className="space-y-8">
      {/* Company Information */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Company Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              value={settings.company_name || ""}
              onChange={(e) => updateField("company_name", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="Meatify"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Branch Location
            </label>
            <input
              type="text"
              value={settings.branch_location || ""}
              onChange={(e) => updateField("branch_location", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="Branch address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Currency
            </label>
            <input
              type="text"
              value={settings.currency || "PHP"}
              onChange={(e) => updateField("currency", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="PHP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Timezone
            </label>
            <input
              type="text"
              value={settings.default_timezone || "Asia/Manila"}
              onChange={(e) => updateField("default_timezone", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="Asia/Manila"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Language
            </label>
            <select
              value={settings.language || "en"}
              onChange={(e) => updateField("language", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            >
              <option value="en">English</option>
              <option value="tl">Filipino</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Date Format
            </label>
            <select
              value={settings.date_format || "YYYY-MM-DD"}
              onChange={(e) => updateField("date_format", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Decimal Places
            </label>
            <input
              type="number"
              min="0"
              max="4"
              value={settings.decimal_places || 2}
              onChange={(e) => updateField("decimal_places", parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Auto Logout (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="1440"
              value={settings.auto_logout_minutes || 30}
              onChange={(e) => updateField("auto_logout_minutes", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">0 = disabled</p>
          </div>
        </div>
      </div>
    </div>
  );
};