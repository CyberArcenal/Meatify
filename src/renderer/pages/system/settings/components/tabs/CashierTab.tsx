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
      {/* Receipt Printing */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Receipt Printing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <Switch
              checked={settings.enable_receipt_printing !== false}
              onChange={(checked) => updateField("enable_receipt_printing", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Enable Receipt Printing
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Printer Type
            </label>
            <select
              value={settings.receipt_printer_type || "thermal"}
              onChange={(e) => updateField("receipt_printer_type", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            >
              <option value="thermal">Thermal</option>
              <option value="dot_matrix">Dot Matrix</option>
              <option value="laser">Laser</option>
            </select>
          </div>
        </div>
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

      {/* Cash Drawer */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Cash Drawer
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <Switch
              checked={settings.enable_cash_drawer !== false}
              onChange={(checked) => updateField("enable_cash_drawer", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Enable Cash Drawer
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Drawer Open Code
            </label>
            <input
              type="text"
              value={settings.drawer_open_code || "0"}
              onChange={(e) => updateField("drawer_open_code", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="0"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Usually "0" for ESC/POS printers
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Connection Type
            </label>
            <select
              value={settings.cash_drawer_connection_type || "printer"}
              onChange={(e) => updateField("cash_drawer_connection_type", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            >
              <option value="printer">Via Printer (ESC/POS)</option>
              <option value="usb">Direct USB</option>
              <option value="serial">Serial Port</option>
              <option value="network">Network</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};