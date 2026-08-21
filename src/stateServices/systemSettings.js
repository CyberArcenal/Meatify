// src/stateServices/SystemSettingStateService.js
//@ts-check
const { SystemSetting } = require("../entities/systemSettings");
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");

// Simple in-memory cache
const settingsCache = {};

// 🥩 MEATIFY DEFAULTS – replaced debt/loan settings with meat shop settings
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
  tax_rate: 0, // 0-100 (e.g., 12 for VAT)
  default_discount_rate: 0, // 0-100
  max_discount_percent: 20, // maximum discount allowed per item
  enable_discounts: true,
  price_rounding: "nearest", // nearest, up, down
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
  loyalty_point_rate: 100, // points per peso spent
  loyalty_vip_threshold: 1000, // lifetime points to become VIP
  loyalty_elite_threshold: 5000, // lifetime points to become Elite

  // ============================================================
  // 🧾 RECEIPT & PRINTER
  // ============================================================
  enable_receipt_printing: true,
  receipt_printer_type: "thermal", // thermal, dot_matrix, laser
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
  cash_drawer_connection_type: "printer", // printer, usb

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

class SystemSettingStateTransitionService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.settingRepo = dataSource.getRepository(SystemSetting);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Reload a service that depends on settings
   * @param {string} settingKey
   */
  async _reloadService(settingKey) {
    // Email settings changed
    if (settingKey.startsWith("email_") || settingKey === "email_enabled") {
      try {
        logger.info(`[SystemSetting] Email settings changed, will affect future sends.`);
      } catch (err) {
        logger.error(`Failed to reload email service:`, err);
      }
    }

    // SMS settings changed
    if (settingKey.startsWith("twilio_") || settingKey === "sms_enabled") {
      try {
        logger.info(`[SystemSetting] SMS settings changed.`);
      } catch (err) {
        logger.error(`Failed to reload SMS service:`, err);
      }
    }

    // Printer settings changed
    if (settingKey === "receipt_printer_type" || settingKey === "enable_receipt_printing") {
      try {
        logger.info(`[SystemSetting] Printer settings changed.`);
      } catch (err) {
        logger.error(`Failed to reload printer service:`, err);
      }
    }

    // Currency changed – notify frontend
    if (settingKey === "currency") {
      logger.info(`[SystemSetting] Currency changed to ${settingsCache[settingKey]}, UI should refresh.`);
    }

    // Loyalty settings changed
    if (settingKey.startsWith("loyalty_") || settingKey === "enable_loyalty_points") {
      logger.info(`[SystemSetting] Loyalty settings changed.`);
    }

    // Inventory settings changed
    if (settingKey.startsWith("inventory_") || settingKey === "allow_negative_stock") {
      logger.info(`[SystemSetting] Inventory settings changed.`);
    }
  }

  /**
   * Apply a setting change (invalidate cache, reload services)
   * @param {any} setting
   * @param {any} oldValue
   * @param {any} newValue
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onApply(setting, oldValue, newValue, user = "system", queryRunner = null) {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    logger.info(`[Transition] Applying setting change for key "${setting.key}": ${oldValue} → ${newValue} by ${user}`);

    // 1. Invalidate cache
    delete settingsCache[setting.key];

    // 2. If setting affects a service, reload that service
    await this._reloadService(setting.key);

    // 3. Write to audit log
    await auditLogger.logUpdate(
      "SystemSetting",
      setting.id,
      { oldValue, newValue },
      { applied: true },
      user
    );
  }

  /**
   * Reset setting to factory default
   * @param {any} setting
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onReset(setting, user = "system", queryRunner = null) {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    logger.info(`[Transition] Resetting setting "${setting.key}" to default by ${user}`);

    // 1. Fetch default value from constants
    const defaultValue = DEFAULTS[setting.key];
    if (defaultValue === undefined) {
      throw new Error(`No default value defined for key: ${setting.key}`);
    }

    // 2. Save and apply
    const repo = this._getRepo(queryRunner, SystemSetting);
    const oldValue = setting.value;
    setting.value = this._prepareValueForStorage(defaultValue);
    setting.updatedAt = new Date();
    await updateDb(repo, setting, { queryRunner: queryRunner });

    // 3. Invalidate cache and reload affected services
    delete settingsCache[setting.key];
    await this._reloadService(setting.key);

    // 4. Log reset
    await auditLogger.logUpdate(
      "SystemSetting",
      setting.id,
      { reset: true, oldValue },
      { newValue: defaultValue },
      user
    );
  }

  /**
   * Validate a proposed value before applying
   * @param {any} setting
   * @param {any} proposedValue
   * @returns {Promise<{ valid: boolean; errorMessage?: string }>}
   */
  async onValidate(setting, proposedValue) {
    logger.info(`[Transition] Validating setting "${setting.key}" with value ${proposedValue}`);

    // Convert to string for validation
    const valueStr = String(proposedValue).trim();
    const key = setting.key;

    // ============================================================
    // BOOLEAN VALIDATION
    // ============================================================
    const booleanKeys = [
      "enable_discounts", "allow_negative_stock", "enable_auto_reorder",
      "inventory_sync_enabled", "fifo_enabled", "enable_loyalty_points",
      "enable_receipt_printing", "receipt_show_logo", "receipt_show_tax",
      "receipt_show_discount", "receipt_show_loyalty", "enable_cash_payment",
      "enable_card_payment", "enable_wallet_payment", "enable_cash_drawer",
      "enable_refunds", "require_receipt_for_refund", "refund_restock_enabled",
      "email_enabled", "sms_enabled", "in_app_notifications_enabled",
      "notify_low_stock", "notify_expiring_batches", "notify_refund_processed",
      "notify_purchase_completed", "auto_backup_enabled", "audit_log_enabled",
      "force_https", "session_encryption_enabled",
    ];

    if (booleanKeys.includes(key)) {
      const boolVal = valueStr.toLowerCase();
      if (["true", "false", "1", "0", "yes", "no"].includes(boolVal)) {
        return { valid: true };
      }
      return { valid: false, errorMessage: "Must be a boolean (true/false, yes/no, 1/0)" };
    }

    // ============================================================
    // NUMERIC VALIDATION
    // ============================================================
    const numericKeys = [
      "tax_rate", "default_discount_rate", "max_discount_percent",
      "low_stock_threshold", "auto_reorder_quantity", "loyalty_point_rate",
      "loyalty_vip_threshold", "loyalty_elite_threshold", "refund_window_days",
      "email_smtp_port", "data_retention_days", "log_retention_days",
      "auto_logout_minutes", "decimal_places",
    ];

    if (numericKeys.includes(key)) {
      const num = parseFloat(valueStr);
      if (isNaN(num)) {
        return { valid: false, errorMessage: "Must be a number" };
      }

      // Range validations
      if (key === "tax_rate" && (num < 0 || num > 100)) {
        return { valid: false, errorMessage: "Tax rate must be between 0 and 100" };
      }
      if (key === "default_discount_rate" && (num < 0 || num > 100)) {
        return { valid: false, errorMessage: "Discount rate must be between 0 and 100" };
      }
      if (key === "max_discount_percent" && (num < 0 || num > 100)) {
        return { valid: false, errorMessage: "Max discount must be between 0 and 100" };
      }
      if (key === "low_stock_threshold" && num < 0) {
        return { valid: false, errorMessage: "Low stock threshold cannot be negative" };
      }
      if (key === "refund_window_days" && num < 0) {
        return { valid: false, errorMessage: "Refund window cannot be negative" };
      }
      if (key === "email_smtp_port" && (num < 1 || num > 65535)) {
        return { valid: false, errorMessage: "Port must be between 1 and 65535" };
      }
      if (key === "auto_logout_minutes" && (num < 0 || num > 1440)) {
        return { valid: false, errorMessage: "Auto logout must be between 0 and 1440 minutes" };
      }
      if (key === "decimal_places" && (num < 0 || num > 4)) {
        return { valid: false, errorMessage: "Decimal places must be between 0 and 4" };
      }

      return { valid: true };
    }

    // ============================================================
    // EMAIL VALIDATION
    // ============================================================
    if (key === "email_from_address" || key === "company_email") {
      if (valueStr !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(valueStr)) {
          return { valid: false, errorMessage: "Invalid email address format" };
        }
      }
      return { valid: true };
    }

    // ============================================================
    // PHONE NUMBER VALIDATION
    // ============================================================
    if (key === "company_phone") {
      if (valueStr !== "") {
        const phoneRegex = /^[\d\+\-\(\)\s]+$/;
        if (!phoneRegex.test(valueStr)) {
          return { valid: false, errorMessage: "Invalid phone number format" };
        }
      }
      return { valid: true };
    }

    // ============================================================
    // JSON ARRAY VALIDATION
    // ============================================================
    const jsonArrayKeys = ["export_formats", "log_events"];
    if (jsonArrayKeys.includes(key)) {
      try {
        JSON.parse(valueStr);
      } catch (err) {
        return { valid: false, errorMessage: "Must be a valid JSON array" };
      }
    }

    // ============================================================
    // TIMEZONE VALIDATION
    // ============================================================
    if (key === "default_timezone") {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: valueStr });
      } catch (err) {
        return { valid: false, errorMessage: "Invalid timezone" };
      }
    }

    // ============================================================
    // PRINTER TYPE VALIDATION
    // ============================================================
    if (key === "receipt_printer_type") {
      const validTypes = ["thermal", "dot_matrix", "laser"];
      if (!validTypes.includes(valueStr.toLowerCase())) {
        return { valid: false, errorMessage: `Must be one of: ${validTypes.join(", ")}` };
      }
      return { valid: true };
    }

    // ============================================================
    // PAYMENT METHOD VALIDATION
    // ============================================================
    if (key === "default_payment_method") {
      const validMethods = ["cash", "card", "wallet"];
      if (!validMethods.includes(valueStr.toLowerCase())) {
        return { valid: false, errorMessage: `Must be one of: ${validMethods.join(", ")}` };
      }
      return { valid: true };
    }

    // ============================================================
    // CASH DRAWER CONNECTION TYPE
    // ============================================================
    if (key === "cash_drawer_connection_type") {
      const validTypes = ["printer", "usb"];
      if (!validTypes.includes(valueStr.toLowerCase())) {
        return { valid: false, errorMessage: `Must be one of: ${validTypes.join(", ")}` };
      }
      return { valid: true };
    }

    // ============================================================
    // STRING VALIDATION (accept any non-empty, or allow empty for optional)
    // ============================================================
    const optionalStringKeys = [
      "company_location", "company_phone", "company_email", "company_tin",
      "company_logo", "receipt_footer_message", "receipt_header_message",
      "drawer_open_code", "backup_location", "currency", "language",
      "date_format", "sms_provider",
    ];

    if (typeof proposedValue === "string") {
      if (valueStr !== "" || optionalStringKeys.includes(key)) {
        return { valid: true };
      }
      return { valid: false, errorMessage: "Value cannot be empty" };
    }

    return { valid: true }; // default accept
  }

  /**
   * Prepare value for storage
   * @param {any} value
   * @returns {string}
   */
  _prepareValueForStorage(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }
}

module.exports = { SystemSettingStateTransitionService };