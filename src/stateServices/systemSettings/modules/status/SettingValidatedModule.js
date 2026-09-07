// src/stateServices/systemSetting/modules/status/SettingValidatedModule.js
const { logger } = require("../../../../utils/logger");

/**
 * SettingValidatedModule - Handles validation for setting values.
 * Contains all the validation logic for different setting types.
 */
class SettingValidatedModule {
  /**
   * Validate a proposed value for a setting
   * @param {Object} setting - The setting entity
   * @param {any} proposedValue - The proposed value
   * @returns {{ valid: boolean; errorMessage?: string }}
   */
  async handle(setting, proposedValue) {
    logger.debug(`[SettingValidated] Validating setting "${setting.key}" with value ${proposedValue}`);

    // Convert to string for validation
    const valueStr = String(proposedValue).trim();
    const key = setting.key;

    // ─── BOOLEAN VALIDATION ──────────────────────────────────────
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

    // ─── NUMERIC VALIDATION ──────────────────────────────────────
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

    // ─── EMAIL VALIDATION ────────────────────────────────────────
    if (key === "email_from_address" || key === "company_email") {
      if (valueStr !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(valueStr)) {
          return { valid: false, errorMessage: "Invalid email address format" };
        }
      }
      return { valid: true };
    }

    // ─── PHONE NUMBER VALIDATION ────────────────────────────────
    if (key === "company_phone") {
      if (valueStr !== "") {
        const phoneRegex = /^[\d\+\-\(\)\s]+$/;
        if (!phoneRegex.test(valueStr)) {
          return { valid: false, errorMessage: "Invalid phone number format" };
        }
      }
      return { valid: true };
    }

    // ─── JSON ARRAY VALIDATION ──────────────────────────────────
    const jsonArrayKeys = ["export_formats", "log_events"];
    if (jsonArrayKeys.includes(key)) {
      try {
        JSON.parse(valueStr);
      } catch (err) {
        return { valid: false, errorMessage: "Must be a valid JSON array" };
      }
    }

    // ─── TIMEZONE VALIDATION ─────────────────────────────────────
    if (key === "default_timezone") {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: valueStr });
      } catch (err) {
        return { valid: false, errorMessage: "Invalid timezone" };
      }
    }

    // ─── PRINTER TYPE VALIDATION ─────────────────────────────────
    if (key === "receipt_printer_type") {
      const validTypes = ["thermal", "dot_matrix", "laser"];
      if (!validTypes.includes(valueStr.toLowerCase())) {
        return { valid: false, errorMessage: `Must be one of: ${validTypes.join(", ")}` };
      }
      return { valid: true };
    }

    // ─── PAYMENT METHOD VALIDATION ──────────────────────────────
    if (key === "default_payment_method") {
      const validMethods = ["cash", "card", "wallet"];
      if (!validMethods.includes(valueStr.toLowerCase())) {
        return { valid: false, errorMessage: `Must be one of: ${validMethods.join(", ")}` };
      }
      return { valid: true };
    }

    // ─── CASH DRAWER CONNECTION TYPE ────────────────────────────
    if (key === "cash_drawer_connection_type") {
      const validTypes = ["printer", "usb"];
      if (!validTypes.includes(valueStr.toLowerCase())) {
        return { valid: false, errorMessage: `Must be one of: ${validTypes.join(", ")}` };
      }
      return { valid: true };
    }

    // ─── STRING VALIDATION ──────────────────────────────────────
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

    // Default accept
    return { valid: true };
  }
}

module.exports = SettingValidatedModule;