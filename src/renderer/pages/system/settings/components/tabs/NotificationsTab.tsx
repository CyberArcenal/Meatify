// src/renderer/pages/system/settings/components/tabs/NotificationsTab.tsx
import React, { useState } from "react";
import type { NotificationsSettings } from "../../../../../api/utils/system_config";
import Button from "../../../../../components/UI/Button";
import Switch from "../../../../../components/UI/Switch";
import { dialogs } from "../../../../../utils/dialogs";


interface NotificationsTabProps {
  settings: NotificationsSettings;
  onChange: (field: keyof NotificationsSettings, value: any) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  settings,
  onChange,
}) => {
  const [testing, setTesting] = useState<"smtp" | "sms" | null>(null);

  const updateField = (field: keyof NotificationsSettings, value: any) => {
    onChange(field, value);
  };

  const testSMTP = async () => {
    setTesting("smtp");
    try {
      if (!window.backendAPI?.systemConfig) {
        throw new Error("Electron API not available");
      }
      const response = await window.backendAPI.systemConfig({
        method: "testSmtpConnection",
        params: { settings },
      });
      if (response.status) {
        dialogs.success("SMTP connection successful!");
      } else {
        dialogs.error(response.message || "SMTP connection failed");
      }
    } catch (err: any) {
      dialogs.error(err.message || "Failed to test SMTP connection");
    } finally {
      setTesting(null);
    }
  };

  const testSMS = async () => {
    setTesting("sms");
    try {
      if (!window.backendAPI?.systemConfig) {
        throw new Error("Electron API not available");
      }
      const response = await window.backendAPI.systemConfig({
        method: "testSmsConnection",
        params: { settings },
      });
      if (response.status) {
        dialogs.success("SMS connection successful!");
      } else {
        dialogs.error(response.message || "SMS connection failed");
      }
    } catch (err: any) {
      dialogs.error(err.message || "Failed to test SMS connection");
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* General Notification Toggles */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Notification Channels
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Switch
              checked={settings.email_enabled || false}
              onChange={(checked) => updateField("email_enabled", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Enable Email Notifications
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.sms_enabled || false}
              onChange={(checked) => updateField("sms_enabled", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Enable SMS Notifications
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.in_app_notifications_enabled !== false}
              onChange={(checked) => updateField("in_app_notifications_enabled", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Enable In-App Notifications
            </span>
          </div>
        </div>
      </div>

      {/* Notification Events */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Notification Events
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Switch
              checked={settings.notify_low_stock !== false}
              onChange={(checked) => updateField("notify_low_stock", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Low Stock Alerts
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.notify_expiring_batches !== false}
              onChange={(checked) => updateField("notify_expiring_batches", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Expiring Batches
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.notify_refund_processed !== false}
              onChange={(checked) => updateField("notify_refund_processed", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Refund Processed
            </span>
          </div>
          <div className="flex items-center">
            <Switch
              checked={settings.notify_purchase_completed !== false}
              onChange={(checked) => updateField("notify_purchase_completed", checked)}
            />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">
              Purchase Completed
            </span>
          </div>
        </div>
      </div>

      {/* Email SMTP Settings */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          Email (SMTP) Settings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              SMTP Host
            </label>
            <input
              type="text"
              value={settings.email_smtp_host || ""}
              onChange={(e) => updateField("email_smtp_host", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              SMTP Port
            </label>
            <input
              type="number"
              value={settings.email_smtp_port || 587}
              onChange={(e) => updateField("email_smtp_port", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="587"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              From Address
            </label>
            <input
              type="email"
              value={settings.email_from_address || ""}
              onChange={(e) => updateField("email_from_address", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="noreply@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              From Name
            </label>
            <input
              type="text"
              value={settings.email_from_name || "Meatify POS"}
              onChange={(e) => updateField("email_from_name", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="Meatify POS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              SMTP Username
            </label>
            <input
              type="text"
              value={settings.email_smtp_username || ""}
              onChange={(e) => updateField("email_smtp_username", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              SMTP Password
            </label>
            <input
              type="password"
              value={settings.email_smtp_password || ""}
              onChange={(e) => updateField("email_smtp_password", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={testSMTP}
            disabled={testing === "smtp"}
          >
            {testing === "smtp" ? "Testing..." : "Test SMTP Connection"}
          </Button>
        </div>
      </div>

      {/* SMS (Twilio) Settings */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">
          SMS (Twilio) Settings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              SMS Provider
            </label>
            <input
              type="text"
              value={settings.sms_provider || "twilio"}
              onChange={(e) => updateField("sms_provider", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="twilio"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Account SID
            </label>
            <input
              type="text"
              value={settings.twilio_account_sid || ""}
              onChange={(e) => updateField("twilio_account_sid", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Auth Token
            </label>
            <input
              type="password"
              value={settings.twilio_auth_token || ""}
              onChange={(e) => updateField("twilio_auth_token", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Phone Number
            </label>
            <input
              type="text"
              value={settings.twilio_phone_number || ""}
              onChange={(e) => updateField("twilio_phone_number", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
              placeholder="+1234567890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Messaging Service SID
            </label>
            <input
              type="text"
              value={settings.twilio_messaging_service_sid || ""}
              onChange={(e) => updateField("twilio_messaging_service_sid", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={testSMS}
            disabled={testing === "sms"}
          >
            {testing === "sms" ? "Testing..." : "Test SMS Connection"}
          </Button>
        </div>
      </div>
    </div>
  );
};