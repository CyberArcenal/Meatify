// src/renderer/pages/system/settings/hooks/useMeatifySettings.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import systemConfigAPI, { type MeatifySettings, type GeneralSettings, type InventorySettings, type SalesSettings, type CashierSettings, type NotificationsSettings, type ReportsSettings, type IntegrationsSettings, type AuditSecuritySettings } from "../../../../api/utils/system_config";
import { useSettings } from "../../../../contexts/SettingsContext";
import { dialogs } from "../../../../utils/dialogs";


// ============================================================
// 📦 DEFAULT VALUES (Matches system.js)
// ============================================================

const DEFAULTS: MeatifySettings = {
  general: {
    company_name: "Meatify",
    branch_location: "",
    default_timezone: "Asia/Manila",
    language: "en",
    currency: "PHP",
    decimal_places: 2,
    auto_logout_minutes: 30,
    date_format: "YYYY-MM-DD",
  },
  inventory: {
    low_stock_threshold: 5,
    enable_auto_reorder: false,
    auto_reorder_quantity: 10,
    allow_negative_stock: false,
    fifo_enabled: true,
    inventory_sync_enabled: true,
  },
  sales: {
    tax_rate: 0,
    default_discount_rate: 0,
    max_discount_percent: 20,
    enable_discounts: true,
    default_payment_method: "cash",
    enable_cash_payment: true,
    enable_card_payment: true,
    enable_wallet_payment: true,
    price_rounding: "nearest",
    enable_loyalty_points: true,
    loyalty_point_rate: 100,
    loyalty_vip_threshold: 1000,
    loyalty_elite_threshold: 5000,
    enable_refunds: true,
    refund_window_days: 7,
    require_receipt_for_refund: true,
    refund_restock_enabled: true,
  },
  cashier: {
    enable_receipt_printing: true,
    receipt_printer_type: "thermal",
    receipt_header_message: "",
    receipt_footer_message: "Thank you for shopping at Meatify!",
    receipt_show_logo: true,
    receipt_show_tax: true,
    receipt_show_discount: true,
    receipt_show_loyalty: true,
    enable_cash_drawer: true,
    drawer_open_code: "0",
    cash_drawer_connection_type: "printer",
  },
  notifications: {
    email_enabled: false,
    sms_enabled: false,
    in_app_notifications_enabled: true,
    notify_low_stock: true,
    notify_expiring_batches: true,
    notify_refund_processed: true,
    notify_purchase_completed: true,
    sms_provider: "twilio",
    email_smtp_host: "",
    email_smtp_port: 587,
    email_smtp_username: "",
    email_smtp_password: "",
    email_from_address: "",
    email_from_name: "Meatify POS",
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    twilio_messaging_service_sid: "",
  },
  reports: {
    export_formats: ["CSV", "Excel", "PDF"],
    default_export_format: "CSV",
    auto_backup_enabled: false,
    backup_schedule: "0 2 * * *",
    backup_location: "./backups",
    data_retention_days: 365,
    include_audit_in_backup: false,
  },
  integrations: {
    webhooks_enabled: false,
    webhooks: [],
  },
  audit_security: {
    audit_log_enabled: true,
    log_retention_days: 30,
    log_events: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"],
    force_https: false,
    session_encryption_enabled: true,
    gdpr_compliance_enabled: false,
    require_mfa_for_admin: false,
  },
};

const ALLOWED_KEYS: Record<keyof MeatifySettings, string[]> = {
  general: Object.keys(DEFAULTS.general),
  inventory: Object.keys(DEFAULTS.inventory),
  sales: Object.keys(DEFAULTS.sales),
  cashier: Object.keys(DEFAULTS.cashier),
  notifications: Object.keys(DEFAULTS.notifications),
  reports: Object.keys(DEFAULTS.reports),
  integrations: Object.keys(DEFAULTS.integrations),
  audit_security: Object.keys(DEFAULTS.audit_security),
};

function sanitizeSettings<T extends Record<string, any>>(
  obj: T,
  allowedKeys: string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of allowedKeys) {
    if (key in obj) {
      result[key as keyof T] = obj[key];
    }
  }
  return result;
}

export const useMeatifySettings = () => {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<MeatifySettings>(DEFAULTS);
  const [originalSettings, setOriginalSettings] = useState<MeatifySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await systemConfigAPI.getGroupedConfig();
      if (response.status && response.data?.grouped_settings) {
        const grouped = response.data.grouped_settings;
        const loaded: MeatifySettings = {
          general: { ...DEFAULTS.general, ...grouped.general },
          inventory: { ...DEFAULTS.inventory, ...grouped.inventory },
          sales: { ...DEFAULTS.sales, ...grouped.sales },
          cashier: { ...DEFAULTS.cashier, ...grouped.cashier },
          notifications: { ...DEFAULTS.notifications, ...grouped.notifications },
          reports: { ...DEFAULTS.reports, ...grouped.reports },
          integrations: { ...DEFAULTS.integrations, ...grouped.integrations },
          audit_security: { ...DEFAULTS.audit_security, ...grouped.audit_security },
        };
        setSettings(loaded);
        setOriginalSettings(JSON.parse(JSON.stringify(loaded)));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
      dialogs.error(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Generic category updater
  const updateCategory = useCallback(
    <C extends keyof MeatifySettings>(category: C, field: keyof MeatifySettings[C], value: any) => {
      setSettings((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: value,
        },
      }));
    },
    []
  );

  // Category-specific updaters
  const updateGeneral = (field: keyof GeneralSettings, value: any) =>
    updateCategory("general", field, value);
  const updateInventory = (field: keyof InventorySettings, value: any) =>
    updateCategory("inventory", field, value);
  const updateSales = (field: keyof SalesSettings, value: any) =>
    updateCategory("sales", field, value);
  const updateCashier = (field: keyof CashierSettings, value: any) =>
    updateCategory("cashier", field, value);
  const updateNotifications = (field: keyof NotificationsSettings, value: any) =>
    updateCategory("notifications", field, value);
  const updateReports = (field: keyof ReportsSettings, value: any) =>
    updateCategory("reports", field, value);
  const updateIntegrations = (field: keyof IntegrationsSettings, value: any) =>
    updateCategory("integrations", field, value);
  const updateAuditSecurity = (field: keyof AuditSecuritySettings, value: any) =>
    updateCategory("audit_security", field, value);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const combinedConfig: Record<string, any> = {};
    const categories = Object.keys(DEFAULTS) as Array<keyof MeatifySettings>;

    for (const category of categories) {
      const categoryData = settings[category];
      if (!categoryData || typeof categoryData !== "object") continue;

      const dataToSend = sanitizeSettings(categoryData, ALLOWED_KEYS[category]);
      const filtered: Record<string, any> = {};
      for (const [key, value] of Object.entries(dataToSend)) {
        if (typeof key === "string" && !/^\d+$/.test(key)) {
          filtered[key] = value;
        }
      }
      if (Object.keys(filtered).length > 0) {
        combinedConfig[category] = filtered;
      }
    }

    try {
      const response = await systemConfigAPI.updateGroupedConfig(combinedConfig);
      if (response.status) {
        setSuccessMessage("Settings saved successfully");
        await fetchSettings();
        await refreshSettings();
      } else {
        throw new Error(response.message || "Failed to save settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
      dialogs.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    const confirmed = await dialogs.confirm({
      title: "Reset Settings",
      message: "Are you sure you want to reset all settings to default values? This cannot be undone.",
      confirmText: "Reset",
      icon: "danger",
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      await systemConfigAPI.resetToDefaults();
      setSuccessMessage("Settings reset to defaults");
      await fetchSettings();
      await refreshSettings();
    } catch (err: any) {
      setError(err.message || "Failed to reset settings");
      dialogs.error(err.message || "Failed to reset settings");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    updateGeneral,
    updateInventory,
    updateSales,
    updateCashier,
    updateNotifications,
    updateReports,
    updateIntegrations,
    updateAuditSecurity,
    saveSettings,
    resetToDefaults,
    refetch: fetchSettings,
    hasChanges,
  };
};