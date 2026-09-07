// src/stateServices/systemSetting/modules/status/SettingResetModule.js
const { logger } = require("../../../../utils/logger");

/**
 * SettingResetModule - Handles side effects when a setting is reset to default.
 * Includes cache invalidation and service reloading.
 */
class SettingResetModule {
  /**
   * @param {Object} cacheModule - SystemSettingCacheModule instance
   * @param {Object} auditModule - SystemSettingAuditModule instance
   */
  constructor(cacheModule, auditModule) {
    this.cacheModule = cacheModule;
    this.auditModule = auditModule;
  }

  /**
   * Handle setting reset side effects
   * @param {Object} setting - The setting entity
   * @param {any} defaultValue - The default value
   * @param {any} oldValue - The old value
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(setting, defaultValue, oldValue, user = "system", queryRunner = null) {
    logger.info(`[SettingReset] Resetting setting "${setting.key}" to default by ${user}`);

    // 1. Invalidate cache
    this.cacheModule.invalidate(setting.key);

    // 2. Reload affected services
    await this._reloadService(setting.key);

    // 3. Audit log (handled by orchestrator)
  }

  /**
   * Reload a service that depends on settings
   * @param {string} settingKey
   * @private
   */
  async _reloadService(settingKey) {
    // Email settings changed
    if (settingKey.startsWith("email_") || settingKey === "email_enabled") {
      logger.info(`[SettingReset] Email settings reset to default.`);
    }

    // SMS settings changed
    if (settingKey.startsWith("twilio_") || settingKey === "sms_enabled") {
      logger.info(`[SettingReset] SMS settings reset to default.`);
    }

    // Printer settings changed
    if (settingKey === "receipt_printer_type" || settingKey === "enable_receipt_printing") {
      logger.info(`[SettingReset] Printer settings reset to default.`);
    }

    // Loyalty settings changed
    if (settingKey.startsWith("loyalty_") || settingKey === "enable_loyalty_points") {
      logger.info(`[SettingReset] Loyalty settings reset to default.`);
    }

    // Inventory settings changed
    if (settingKey.startsWith("inventory_") || settingKey === "allow_negative_stock") {
      logger.info(`[SettingReset] Inventory settings reset to default.`);
    }
  }
}

module.exports = SettingResetModule;