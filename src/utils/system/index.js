// src/utils/system.js
//@ts-check
// Refactored for Meatify POS - Meat Shop Management
const path = require("path");
const Decimal = require("decimal.js");
const { logger } = require("../logger");
const { SystemSetting, SettingType } = require("../../entities/systemSettings");

// ============================================================
// 📊 CORE GETTER FUNCTIONS (No changes needed)
// ============================================================

/**
 * Get setting value
 * @param {string} key
 * @param {string} settingType
 * @param {any} defaultValue
 */
async function getValue(key, settingType, defaultValue = null) {
  const { AppDataSource } = require("../../main/db/data-source");
  try {
    if (typeof key !== "string" || !key.trim()) {
      logger.debug(`[DB] Invalid key: ${key}`);
      return defaultValue;
    }
    const repository = AppDataSource.getRepository(SystemSetting);
    if (!repository) {
      logger.debug(`[DB] Repository not available, using default: ${defaultValue}`);
      return defaultValue;
    }
    const query = repository
      .createQueryBuilder("setting")
      .where("setting.key = :key", { key: key.toLowerCase() })
      .andWhere("setting.is_deleted = :is_deleted", { is_deleted: false });
    if (settingType) {
      query.andWhere("setting.setting_type = :settingType", { settingType });
    }
    const setting = await query.getOne();
    if (!setting || setting.value === null || setting.value === undefined) {
      logger.debug(`[DB] Setting ${key} not found, using default: ${defaultValue}`);
      return defaultValue;
    }
    return String(setting.value).trim();
  } catch (error) {
    logger.warn(`[DB] Error fetching setting ${key}: ${error.message}, using default: ${defaultValue}`);
    return defaultValue;
  }
}

/**
 * Get boolean setting
 */
async function getBool(key, settingType, defaultValue = false) {
  try {
    const raw = await getValue(key, settingType, defaultValue ? "true" : "false");
    if (raw === null) return defaultValue;
    const normalized = String(raw).trim().toLowerCase();
    if (["true", "1", "yes", "y", "on", "enabled", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off", "disabled", "inactive"].includes(normalized)) return false;
    const num = parseFloat(normalized);
    if (!isNaN(num)) return num > 0;
    logger.warn(`Unrecognized boolean for key='${key}': '${raw}' → using default=${defaultValue}`);
    return defaultValue;
  } catch (error) {
    logger.error(`Error in getBool for ${key}: ${error.message}, using default: ${defaultValue}`);
    return defaultValue;
  }
}

/**
 * Get integer setting
 */
async function getInt(key, settingType, defaultValue = 0) {
  try {
    const raw = await getValue(key, settingType, defaultValue.toString());
    if (raw === null) return defaultValue;
    const result = parseInt(String(raw).trim(), 10);
    return isNaN(result) ? defaultValue : result;
  } catch (error) {
    logger.warn(`Invalid int for key='${key}': ${error.message} – using default=${defaultValue}`);
    return defaultValue;
  }
}

/**
 * Get decimal/float setting
 */
async function getDecimal(key, settingType, defaultValue = 0) {
  try {
    const raw = await getValue(key, settingType, defaultValue.toString());
    if (raw === null) return defaultValue;
    const result = parseFloat(String(raw).trim());
    return isNaN(result) ? defaultValue : result;
  } catch (error) {
    logger.warn(`Invalid decimal for key='${key}': ${error.message} – using default=${defaultValue}`);
    return defaultValue;
  }
}

/**
 * Get array setting
 */
async function getArray(key, settingType, defaultValue = []) {
  try {
    const raw = await getValue(key, settingType, JSON.stringify(defaultValue));
    if (raw === null) return defaultValue;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return defaultValue; }
    }
    return defaultValue;
  } catch (error) {
    logger.warn(`Error getting array setting ${key}: ${error.message}, using default`);
    return defaultValue;
  }
}

// ============================================================
// 🏢 GENERAL SETTINGS
// ============================================================

async function companyName() {
  return getValue("company_name", SettingType.GENERAL, "Meatify");
}

async function branchLocation() {
  return getValue("branch_location", SettingType.GENERAL, "");
}
// Alias for PrinterService compatibility
async function companyLocation() {
  return branchLocation();
}

async function defaultTimezone() {
  return getValue("default_timezone", SettingType.GENERAL, "Asia/Manila");
}

async function language() {
  return getValue("language", SettingType.GENERAL, "en");
}

async function currency() {
  return getValue("currency", SettingType.GENERAL, "PHP");
}

async function decimalPlaces() {
  return getInt("decimal_places", SettingType.GENERAL, 2);
}

async function autoLogoutMinutes() {
  return getInt("auto_logout_minutes", SettingType.GENERAL, 30);
}

async function dateFormat() {
  return getValue("date_format", SettingType.GENERAL, "YYYY-MM-DD");
}

// ============================================================
// 📦 INVENTORY SETTINGS
// ============================================================

async function lowStockThreshold() {
  return getDecimal("low_stock_threshold", SettingType.INVENTORY, 5);
}

async function enableAutoReorder() {
  return getBool("enable_auto_reorder", SettingType.INVENTORY, false);
}

async function autoReorderQuantity() {
  return getDecimal("auto_reorder_quantity", SettingType.INVENTORY, 10);
}

async function allowNegativeStock() {
  return getBool("allow_negative_stock", SettingType.INVENTORY, false);
}

async function fifoEnabled() {
  return getBool("fifo_enabled", SettingType.INVENTORY, true);
}

async function inventorySyncEnabled() {
  return getBool("inventory_sync_enabled", SettingType.INVENTORY, true);
}

// ============================================================
// 💰 SALES & PRICING SETTINGS
// ============================================================

async function taxRate() {
  return getDecimal("tax_rate", SettingType.SALES, 0);
}

async function defaultDiscountRate() {
  return getDecimal("default_discount_rate", SettingType.SALES, 0);
}

async function maxDiscountPercent() {
  return getDecimal("max_discount_percent", SettingType.SALES, 20);
}

async function enableDiscounts() {
  return getBool("enable_discounts", SettingType.SALES, true);
}

async function defaultPaymentMethod() {
  return getValue("default_payment_method", SettingType.SALES, "cash");
}

async function enableCashPayment() {
  return getBool("enable_cash_payment", SettingType.SALES, true);
}

async function enableCardPayment() {
  return getBool("enable_card_payment", SettingType.SALES, true);
}

async function enableWalletPayment() {
  return getBool("enable_wallet_payment", SettingType.SALES, true);
}

async function priceRounding() {
  return getValue("price_rounding", SettingType.SALES, "nearest");
}

// ============================================================
// 🎯 LOYALTY SETTINGS
// ============================================================

async function enableLoyaltyPoints() {
  return getBool("enable_loyalty_points", SettingType.SALES, true);
}
// Alias for CustomerStateService compatibility
async function loyaltyPointsEnabled() {
  return enableLoyaltyPoints();
}

async function loyaltyPointRate() {
  return getDecimal("loyalty_point_rate", SettingType.SALES, 100);
}
// Alias for CustomerStateService compatibility
async function getLoyaltyPointRate() {
  return loyaltyPointRate();
}

async function loyaltyVipThreshold() {
  return getDecimal("loyalty_vip_threshold", SettingType.SALES, 1000);
}

async function loyaltyEliteThreshold() {
  return getDecimal("loyalty_elite_threshold", SettingType.SALES, 5000);
}

// ============================================================
// 🖨️ HARDWARE / PERIPHERALS (Printer & Cash Drawer)
// ============================================================

async function enableReceiptPrinting() {
  return getBool("enable_receipt_printing", SettingType.CASHIER, true);
}

async function receiptPrinterType() {
  return getValue("receipt_printer_type", SettingType.CASHIER, "thermal");
}

async function receiptHeaderMessage() {
  return getValue("receipt_header_message", SettingType.CASHIER, "");
}

async function receiptFooterMessage() {
  return getValue("receipt_footer_message", SettingType.CASHIER, "Thank you for shopping at Meatify!");
}

async function receiptShowLogo() {
  return getBool("receipt_show_logo", SettingType.CASHIER, true);
}

async function receiptShowTax() {
  return getBool("receipt_show_tax", SettingType.CASHIER, true);
}

async function receiptShowDiscount() {
  return getBool("receipt_show_discount", SettingType.CASHIER, true);
}

async function receiptShowLoyalty() {
  return getBool("receipt_show_loyalty", SettingType.CASHIER, true);
}

// ============================================================
// 💵 CASH DRAWER SETTINGS
// ============================================================

async function enableCashDrawer() {
  return getBool("enable_cash_drawer", SettingType.CASHIER, true);
}

async function drawerOpenCode() {
  return getValue("drawer_open_code", SettingType.CASHIER, "0");
}

async function cashDrawerConnectionType() {
  return getValue("cash_drawer_connection_type", SettingType.CASHIER, "printer");
}

// ============================================================
// 🔄 REFUNDS & RETURNS SETTINGS
// ============================================================

async function enableRefunds() {
  return getBool("enable_refunds", SettingType.SALES, true);
}

async function refundWindowDays() {
  return getInt("refund_window_days", SettingType.SALES, 7);
}

async function requireReceiptForRefund() {
  return getBool("require_receipt_for_refund", SettingType.SALES, true);
}

async function refundRestockEnabled() {
  return getBool("refund_restock_enabled", SettingType.SALES, true);
}

// ============================================================
// 🔔 NOTIFICATION SETTINGS
// ============================================================

async function emailEnabled() {
  return getBool("email_enabled", SettingType.NOTIFICATIONS, false);
}

async function smsEnabled() {
  return getBool("sms_enabled", SettingType.NOTIFICATIONS, false);
}

async function inAppNotificationsEnabled() {
  return getBool("in_app_notifications_enabled", SettingType.NOTIFICATIONS, true);
}

async function notifyLowStock() {
  return getBool("notify_low_stock", SettingType.NOTIFICATIONS, true);
}

async function notifyExpiringBatches() {
  return getBool("notify_expiring_batches", SettingType.NOTIFICATIONS, true);
}

async function notifyRefundProcessed() {
  return getBool("notify_refund_processed", SettingType.NOTIFICATIONS, true);
}

async function notifyPurchaseCompleted() {
  return getBool("notify_purchase_completed", SettingType.NOTIFICATIONS, true);
}

async function smsProvider() {
  return getValue("sms_provider", SettingType.NOTIFICATIONS, "twilio");
}

// SMTP Settings
async function smtpHost() {
  return getValue("email_smtp_host", SettingType.NOTIFICATIONS, "");
}

async function smtpPort() {
  return getInt("email_smtp_port", SettingType.NOTIFICATIONS, 587);
}

async function smtpUsername() {
  return getValue("email_smtp_username", SettingType.NOTIFICATIONS, "");
}

async function smtpPassword() {
  return getValue("email_smtp_password", SettingType.NOTIFICATIONS, "");
}

async function smtpFromEmail() {
  return getValue("email_from_address", SettingType.NOTIFICATIONS, "");
}

async function smtpFromName() {
  return getValue("email_from_name", SettingType.NOTIFICATIONS, "Meatify POS");
}

async function getSmtpConfig() {
  const [host, port, username, password, fromEmail, fromName] = await Promise.all([
    smtpHost(),
    smtpPort(),
    smtpUsername(),
    smtpPassword(),
    smtpFromEmail(),
    smtpFromName(),
  ]);
  return { host, port, username, password, from: { email: fromEmail, name: fromName } };
}

// Twilio SMS Settings
async function twilioAccountSid() {
  return getValue("twilio_account_sid", SettingType.NOTIFICATIONS, "");
}

async function twilioAuthToken() {
  return getValue("twilio_auth_token", SettingType.NOTIFICATIONS, "");
}

async function twilioPhoneNumber() {
  return getValue("twilio_phone_number", SettingType.NOTIFICATIONS, "");
}

async function twilioMessagingServiceSid() {
  return getValue("twilio_messaging_service_sid", SettingType.NOTIFICATIONS, "");
}

async function getTwilioConfig() {
  const [accountSid, authToken, phoneNumber, messagingServiceSid] = await Promise.all([
    twilioAccountSid(),
    twilioAuthToken(),
    twilioPhoneNumber(),
    twilioMessagingServiceSid(),
  ]);
  return { accountSid, authToken, phoneNumber, messagingServiceSid };
}

// ============================================================
// 📊 REPORTS & BACKUP SETTINGS
// ============================================================

async function exportFormats() {
  return getArray("export_formats", SettingType.DATA_REPORTS, ["CSV", "Excel", "PDF"]);
}

async function defaultExportFormat() {
  return getValue("default_export_format", SettingType.DATA_REPORTS, "CSV");
}

async function autoBackupEnabled() {
  return getBool("auto_backup_enabled", SettingType.DATA_REPORTS, false);
}

async function backupSchedule() {
  return getValue("backup_schedule", SettingType.DATA_REPORTS, "0 2 * * *");
}

async function backupLocation() {
  return getValue("backup_location", SettingType.DATA_REPORTS, "./backups");
}

async function dataRetentionDays() {
  return getInt("data_retention_days", SettingType.DATA_REPORTS, 365);
}

async function includeAuditInBackup() {
  return getBool("include_audit_in_backup", SettingType.DATA_REPORTS, false);
}

// ============================================================
// 🔗 INTEGRATIONS SETTINGS
// ============================================================

async function webhooksEnabled() {
  return getBool("webhooks_enabled", SettingType.INTEGRATIONS, false);
}

async function webhooks() {
  return getArray("webhooks", SettingType.INTEGRATIONS, []);
}

// ============================================================
// 🔒 AUDIT & SECURITY SETTINGS
// ============================================================

async function auditLogEnabled() {
  return getBool("audit_log_enabled", SettingType.AUDIT_SECURITY, true);
}

async function logRetentionDays() {
  return getInt("log_retention_days", SettingType.AUDIT_SECURITY, 30);
}

async function logEvents() {
  return getArray("log_events", SettingType.AUDIT_SECURITY, ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"]);
}

async function forceHttps() {
  return getBool("force_https", SettingType.AUDIT_SECURITY, false);
}

async function sessionEncryptionEnabled() {
  return getBool("session_encryption_enabled", SettingType.AUDIT_SECURITY, true);
}

async function gdprComplianceEnabled() {
  return getBool("gdpr_compliance_enabled", SettingType.AUDIT_SECURITY, false);
}

async function requireMfaForAdmin() {
  return getBool("require_mfa_for_admin", SettingType.AUDIT_SECURITY, false);
}

// ============================================================
// 📦 CATEGORY-LEVEL CONVENIENCE FUNCTIONS
// ============================================================

async function getGeneralSettings() {
  const [company_name, branch_location, default_timezone, currency_val, language_val, decimal_places, auto_logout_minutes, date_format] = await Promise.all([
    companyName(),
    branchLocation(),
    defaultTimezone(),
    currency(),
    language(),
    decimalPlaces(),
    autoLogoutMinutes(),
    dateFormat(),
  ]);
  return { company_name, branch_location, default_timezone, currency: currency_val, language: language_val, decimal_places, auto_logout_minutes, date_format };
}

async function getInventorySettings() {
  const [low_stock_threshold, enable_auto_reorder, auto_reorder_quantity, allow_negative_stock, fifo_enabled, inventory_sync_enabled] = await Promise.all([
    lowStockThreshold(),
    enableAutoReorder(),
    autoReorderQuantity(),
    allowNegativeStock(),
    fifoEnabled(),
    inventorySyncEnabled(),
  ]);
  return { low_stock_threshold, enable_auto_reorder, auto_reorder_quantity, allow_negative_stock, fifo_enabled, inventory_sync_enabled };
}

async function getSalesSettings() {
  const [tax_rate, default_discount_rate, max_discount_percent, enable_discounts, default_payment_method, enable_cash_payment, enable_card_payment, enable_wallet_payment, price_rounding] = await Promise.all([
    taxRate(),
    defaultDiscountRate(),
    maxDiscountPercent(),
    enableDiscounts(),
    defaultPaymentMethod(),
    enableCashPayment(),
    enableCardPayment(),
    enableWalletPayment(),
    priceRounding(),
  ]);
  return { tax_rate, default_discount_rate, max_discount_percent, enable_discounts, default_payment_method, enable_cash_payment, enable_card_payment, enable_wallet_payment, price_rounding };
}

async function getLoyaltySettings() {
  const [enable_loyalty_points, loyalty_point_rate, loyalty_vip_threshold, loyalty_elite_threshold] = await Promise.all([
    enableLoyaltyPoints(),
    loyaltyPointRate(),
    loyaltyVipThreshold(),
    loyaltyEliteThreshold(),
  ]);
  return { enable_loyalty_points, loyalty_point_rate, loyalty_vip_threshold, loyalty_elite_threshold };
}

async function getHardwareSettings() {
  const [enable_receipt_printing, receipt_printer_type, receipt_header_message, receipt_footer_message, receipt_show_logo, receipt_show_tax, receipt_show_discount, receipt_show_loyalty, enable_cash_drawer, drawer_open_code, cash_drawer_connection_type] = await Promise.all([
    enableReceiptPrinting(),
    receiptPrinterType(),
    receiptHeaderMessage(),
    receiptFooterMessage(),
    receiptShowLogo(),
    receiptShowTax(),
    receiptShowDiscount(),
    receiptShowLoyalty(),
    enableCashDrawer(),
    drawerOpenCode(),
    cashDrawerConnectionType(),
  ]);
  return { enable_receipt_printing, receipt_printer_type, receipt_header_message, receipt_footer_message, receipt_show_logo, receipt_show_tax, receipt_show_discount, receipt_show_loyalty, enable_cash_drawer, drawer_open_code, cash_drawer_connection_type };
}

async function getRefundSettings() {
  const [enable_refunds, refund_window_days, require_receipt_for_refund, refund_restock_enabled] = await Promise.all([
    enableRefunds(),
    refundWindowDays(),
    requireReceiptForRefund(),
    refundRestockEnabled(),
  ]);
  return { enable_refunds, refund_window_days, require_receipt_for_refund, refund_restock_enabled };
}

async function getNotificationsSettings() {
  const [email_enabled, sms_enabled, in_app_notifications_enabled, notify_low_stock, notify_expiring_batches, notify_refund_processed, notify_purchase_completed, sms_provider] = await Promise.all([
    emailEnabled(),
    smsEnabled(),
    inAppNotificationsEnabled(),
    notifyLowStock(),
    notifyExpiringBatches(),
    notifyRefundProcessed(),
    notifyPurchaseCompleted(),
    smsProvider(),
  ]);
  return { email_enabled, sms_enabled, in_app_notifications_enabled, notify_low_stock, notify_expiring_batches, notify_refund_processed, notify_purchase_completed, sms_provider };
}

async function getReportsSettings() {
  const [export_formats, default_export_format, auto_backup_enabled, backup_schedule, backup_location, data_retention_days, include_audit_in_backup] = await Promise.all([
    exportFormats(),
    defaultExportFormat(),
    autoBackupEnabled(),
    backupSchedule(),
    backupLocation(),
    dataRetentionDays(),
    includeAuditInBackup(),
  ]);
  return { export_formats, default_export_format, auto_backup_enabled, backup_schedule, backup_location, data_retention_days, include_audit_in_backup };
}

async function getIntegrationsSettings() {
  const [webhooks_enabled, webhooks_array] = await Promise.all([
    webhooksEnabled(),
    webhooks(),
  ]);
  return { webhooks_enabled, webhooks: webhooks_array };
}

async function getAuditSecuritySettings() {
  const [audit_log_enabled, log_retention_days, log_events, force_https, session_encryption_enabled, gdpr_compliance_enabled, require_mfa_for_admin] = await Promise.all([
    auditLogEnabled(),
    logRetentionDays(),
    logEvents(),
    forceHttps(),
    sessionEncryptionEnabled(),
    gdprComplianceEnabled(),
    requireMfaForAdmin(),
  ]);
  return { audit_log_enabled, log_retention_days, log_events, force_https, session_encryption_enabled, gdpr_compliance_enabled, require_mfa_for_admin };
}

// ============================================================
// 🔄 SYNC SETTINGS (hybrid mode)
// ============================================================

/**
 * Get current sync mode (offline/online)
 * @returns {Promise<string>} "offline" | "online"
 */
async function syncMode() {
  return getValue("sync_mode", SettingType.GENERAL, "offline");
}

/**
 * Get server URL for online sync
 * @returns {Promise<string>}
 */
async function serverUrl() {
  return getValue("server_url", SettingType.GENERAL, "");
}

/**
 * Save sync mode and server URL (upsert)
 * @param {string} mode - 'offline' or 'online'
 * @param {string} [url] - server URL (required when mode === 'online')
 */
async function setSyncSettings(mode, url = "") {
  const { AppDataSource } = require("../../main/db/data-source");
  const repository = AppDataSource.getRepository(SystemSetting);
  if (!repository) {
    throw new Error("SystemSetting repository not available");
  }

  // Save sync_mode
  const syncModeKey = "sync_mode";
  let syncModeRecord = await repository.findOne({
    where: { key: syncModeKey, setting_type: SettingType.GENERAL, is_deleted: false }
  });
  if (!syncModeRecord) {
    syncModeRecord = repository.create({
      key: syncModeKey,
      setting_type: SettingType.GENERAL,
      value: mode,
      description: "Offline/Online mode for hybrid sync",
      is_public: true
    });
  } else {
    syncModeRecord.value = mode;
  }
  await repository.save(syncModeRecord);

  // Save server_url (if mode === 'online' and url provided; otherwise clear it)
  const serverUrlKey = "server_url";
  let serverUrlRecord = await repository.findOne({
    where: { key: serverUrlKey, setting_type: SettingType.GENERAL, is_deleted: false }
  });
  if (mode === "online" && url) {
    if (!serverUrlRecord) {
      serverUrlRecord = repository.create({
        key: serverUrlKey,
        setting_type: SettingType.GENERAL,
        value: url,
        description: "Server URL for online sync",
        is_public: true
      });
    } else {
      serverUrlRecord.value = url;
    }
    await repository.save(serverUrlRecord);
  } else if (mode === "offline") {
    // Clear the stored server URL when switching offline
    if (serverUrlRecord) {
      serverUrlRecord.value = "";
      await repository.save(serverUrlRecord);
    }
  }
}

// ============================================================
// 📤 EXPORT ALL FUNCTIONS
// ============================================================

/**
 * Get a system setting by key (any category)
 * @param {string} key - The setting key
 * @param {any} fallback - Default value if not found
 * @returns {Promise<any>}
 */
async function getSystemSetting(key, fallback = null) {
  return getValue(key, null, fallback);
}

module.exports = {
  // Core
  getSystemSetting,
  getValue,
  getBool,
  getInt,
  getDecimal,
  getArray,

  // General
  companyName,
  branchLocation,
  companyLocation, // Alias for PrinterService
  defaultTimezone,
  language,
  currency,
  decimalPlaces,
  autoLogoutMinutes,
  dateFormat,

  // Inventory
  lowStockThreshold,
  enableAutoReorder,
  autoReorderQuantity,
  allowNegativeStock,
  fifoEnabled,
  inventorySyncEnabled,

  // Sales & Pricing
  taxRate,
  defaultDiscountRate,
  maxDiscountPercent,
  enableDiscounts,
  defaultPaymentMethod,
  enableCashPayment,
  enableCardPayment,
  enableWalletPayment,
  priceRounding,

  // Loyalty
  enableLoyaltyPoints,
  loyaltyPointsEnabled, // Alias for State Services
  loyaltyPointRate,
  getLoyaltyPointRate,  // Alias for State Services
  loyaltyVipThreshold,
  loyaltyEliteThreshold,

  // Hardware (Printer & Cash Drawer)
  enableReceiptPrinting,
  receiptPrinterType,
  receiptHeaderMessage,
  receiptFooterMessage,
  receiptShowLogo,
  receiptShowTax,
  receiptShowDiscount,
  receiptShowLoyalty,
  enableCashDrawer,
  drawerOpenCode,
  cashDrawerConnectionType,

  // Refunds
  enableRefunds,
  refundWindowDays,
  requireReceiptForRefund,
  refundRestockEnabled,

  // Notifications
  emailEnabled,
  smsEnabled,
  inAppNotificationsEnabled,
  notifyLowStock,
  notifyExpiringBatches,
  notifyRefundProcessed,
  notifyPurchaseCompleted,
  smsProvider,
  smtpHost,
  smtpPort,
  smtpUsername,
  smtpPassword,
  smtpFromEmail,
  smtpFromName,
  getSmtpConfig,
  twilioAccountSid,
  twilioAuthToken,
  twilioPhoneNumber,
  twilioMessagingServiceSid,
  getTwilioConfig,

  // Reports
  exportFormats,
  defaultExportFormat,
  autoBackupEnabled,
  backupSchedule,
  backupLocation,
  dataRetentionDays,
  includeAuditInBackup,

  // Integrations
  webhooksEnabled,
  webhooks,

  // Audit & Security
  auditLogEnabled,
  logRetentionDays,
  logEvents,
  forceHttps,
  sessionEncryptionEnabled,
  gdprComplianceEnabled,
  requireMfaForAdmin,

  // Category groups
  getGeneralSettings,
  getInventorySettings,
  getSalesSettings,
  getLoyaltySettings,
  getHardwareSettings,
  getRefundSettings,
  getNotificationsSettings,
  getReportsSettings,
  getIntegrationsSettings,
  getAuditSecuritySettings,

  // Sync
  syncMode,
  serverUrl,
  setSyncSettings,
};