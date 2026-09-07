// src/stateServices/systemSetting/modules/SystemSettingStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * MEATIFY DEFAULTS – replaced debt/loan settings with meat shop settings
 */
const DEFAULTS = {
  // ============================================================
  // 🏢 COMPANY INFORMATION
  // ============================================================
  company_name: "Meatify",
  company_location: "",
  company_phone: "",
  company_email: "",
  company_tin: "",
  company_logo: "",

  // ============================================================
  // 💰 PRICING & TAX
  // ============================================================
  tax_rate: 0,
  default_discount_rate: 0,
  max_discount_percent: 20,
  enable_discounts: true,
  price_rounding: "nearest",
  decimal_places: 2,

  // ============================================================
  // 📦 INVENTORY
  // ============================================================
  allow_negative_stock: false,
  low_stock_threshold: 5,
  enable_auto_reorder: false,
  auto_reorder_quantity: 10,
  inventory_sync_enabled: true,
  fifo_enabled: true,

  // ============================================================
  // 🎯 LOYALTY POINTS
  // ============================================================
  enable_loyalty_points: true,
  loyalty_point_rate: 100,
  loyalty_vip_threshold: 1000,
  loyalty_elite_threshold: 5000,

  // ============================================================
  // 🧾 RECEIPT & PRINTER
  // ============================================================
  enable_receipt_printing: true,
  receipt_printer_type: "thermal",
  receipt_footer_message: "Thank you for shopping at Meatify!",
  receipt_header_message: "",
  receipt_show_logo: true,
  receipt_show_tax: true,
  receipt_show_discount: true,
  receipt_show_loyalty: true,

  // ============================================================
  // 💳 PAYMENT
  // ============================================================
  default_payment_method: "cash",
  enable_cash_payment: true,
  enable_card_payment: true,
  enable_wallet_payment: true,
  enable_cash_drawer: true,
  drawer_open_code: "0",
  cash_drawer_connection_type: "printer",

  // ============================================================
  // 🔄 REFUNDS & RETURNS
  // ============================================================
  enable_refunds: true,
  refund_window_days: 7,
  require_receipt_for_refund: true,
  refund_restock_enabled: true,

  // ============================================================
  // 🔔 NOTIFICATIONS
  // ============================================================
  email_enabled: false,
  sms_enabled: false,
  in_app_notifications_enabled: true,
  notify_low_stock: true,
  notify_expiring_batches: true,
  notify_refund_processed: true,
  notify_purchase_completed: true,

  // ============================================================
  // 📧 EMAIL SETTINGS
  // ============================================================
  email_smtp_host: "",
  email_smtp_port: 587,
  email_smtp_username: "",
  email_smtp_password: "",
  email_from_address: "",
  email_from_name: "Meatify POS",

  // ============================================================
  // 📱 SMS SETTINGS
  // ============================================================
  sms_provider: "twilio",
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_phone_number: "",
  twilio_messaging_service_sid: "",

  // ============================================================
  // 📊 REPORTS & EXPORTS
  // ============================================================
  export_formats: ["CSV", "Excel", "PDF"],
  default_export_format: "CSV",
  auto_backup_enabled: false,
  backup_schedule: "0 2 * * *",
  backup_location: "./backups",
  data_retention_days: 365,

  // ============================================================
  // 🛡️ SECURITY & AUDIT
  // ============================================================
  audit_log_enabled: true,
  log_retention_days: 30,
  log_events: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"],
  force_https: false,
  session_encryption_enabled: true,
  auto_logout_minutes: 30,

  // ============================================================
  // 🌐 GENERAL
  // ============================================================
  default_timezone: "Asia/Manila",
  currency: "PHP",
  language: "en",
  date_format: "YYYY-MM-DD",
};

/**
 * SystemSettingStatusModule - Handles defaults and status for system settings.
 */
class SystemSettingStatusModule {
  /**
   * Get the default value for a setting key
   * @param {string} key - The setting key
   * @returns {any} The default value
   * @throws {Error} If no default value is defined
   */
  getDefault(key) {
    if (DEFAULTS[key] === undefined) {
      throw new Error(`No default value defined for key: ${key}`);
    }
    return DEFAULTS[key];
  }

  /**
   * Check if a setting key has a default value
   * @param {string} key - The setting key
   * @returns {boolean}
   */
  hasDefault(key) {
    return DEFAULTS[key] !== undefined;
  }

  /**
   * Get all default values
   * @returns {Object} All defaults
   */
  getAllDefaults() {
    return { ...DEFAULTS };
  }

  /**
   * Get valid setting types
   * @returns {string[]}
   */
  getValidTypes() {
    return [
      "general",
      "inventory",
      "sales",
      "notifications",
      "cashier",
      "data_reports",
      "integrations",
      "audit_security",
    ];
  }

  /**
   * Check if a setting type is valid
   * @param {string} type - The setting type
   * @returns {boolean}
   */
  isValidType(type) {
    return this.getValidTypes().includes(type);
  }

  /**
   * Get setting category from key
   * @param {string} key - The setting key
   * @returns {string} The category
   */
  getCategory(key) {
    if (key.startsWith("company_") || key === "language" || key === "currency" ||
        key === "date_format" || key === "default_timezone") {
      return "general";
    }
    if (key.startsWith("email_") || key.startsWith("twilio_") || key === "sms_enabled" ||
        key === "in_app_notifications_enabled" || key.startsWith("notify_") || key === "sms_provider") {
      return "notifications";
    }
    if (key.includes("discount") || key.includes("tax") || key.includes("loyalty") ||
        key === "price_rounding" || key === "decimal_places" || key === "default_payment_method" ||
        key === "enable_cash_payment" || key === "enable_card_payment" || key === "enable_wallet_payment") {
      return "sales";
    }
    if (key.includes("stock") || key.includes("inventory") || key === "fifo_enabled" ||
        key === "allow_negative_stock" || key === "auto_reorder") {
      return "inventory";
    }
    if (key === "receipt_printer_type" || key === "enable_receipt_printing" ||
        key.includes("receipt_show_") || key === "enable_cash_drawer" ||
        key === "drawer_open_code" || key === "cash_drawer_connection_type") {
      return "cashier";
    }
    if (key === "export_formats" || key === "default_export_format" ||
        key === "auto_backup_enabled" || key === "backup_schedule" ||
        key === "backup_location" || key === "data_retention_days") {
      return "data_reports";
    }
    if (key === "audit_log_enabled" || key === "log_retention_days" ||
        key === "log_events" || key === "force_https" ||
        key === "session_encryption_enabled" || key === "auto_logout_minutes") {
      return "audit_security";
    }
    return "general";
  }
}

module.exports = { SystemSettingStatusModule, DEFAULTS };