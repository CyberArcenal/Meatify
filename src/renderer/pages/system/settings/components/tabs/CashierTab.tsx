// src/renderer/pages/system/settings/components/tabs/CashierTab.tsx
import React from "react";
import type { CashierSettings } from "../../../../../api/utils/system_config";
import Switch from "../../../../../components/UI/Switch";

interface CashierTabProps {
  settings: CashierSettings;
  onChange: (field: keyof CashierSettings, value: any) => void;
}

export const CashierTab: React.FC<CashierTabProps> = ({ settings, onChange }) => {
  const updateField = (field: keyof CashierSettings, value: any) => {
    onChange(field, value);
  };

  return (
    <div className="space-y-8">
      {/* Receipt Printing – Auto-detected, only enable/disable */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Receipt Printing
        </h3>
        <div className="flex items-center">
          <Switch
            checked={settings.enable_receipt_printing !== false}
            onChange={(checked) => updateField("enable_receipt_printing", checked)}
          />
          <span className="ml-3 text-sm text-[var(--text-secondary)]">
            Enable Receipt Printing (Thermal printer auto-detected)
          </span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          The system will automatically detect and use your thermal printer.
        </p>
      </div>

      {/* Receipt Content */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Receipt Content
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Switch
              checked={settings.receipt_show_logo !== false}
              onChange={(checked) => updateField("receipt_show_logo", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Show Logo
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.receipt_show_tax !== false}
              onChange={(checked) => updateField("receipt_show_tax", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Show Tax
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.receipt_show_discount !== false}
              onChange={(checked) => updateField("receipt_show_discount", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Show Discount
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.receipt_show_loyalty !== false}
              onChange={(checked) => updateField("receipt_show_loyalty", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Show Loyalty Points
            </span>
          </div>
        </div>
      </div>

      {/* Receipt Messages */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Receipt Messages
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Header Message
            </label>
            <input
              type="text"
              value={settings.receipt_header_message || ""}
              onChange={(e) => updateField("receipt_header_message", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="Welcome to our store..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Footer Message
            </label>
            <input
              type="text"
              value={settings.receipt_footer_message || "Thank you for shopping at Meatify!"}
              onChange={(e) => updateField("receipt_footer_message", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="Thank you for shopping!"
            />
          </div>
        </div>
      </div>
    </div>
  );
};