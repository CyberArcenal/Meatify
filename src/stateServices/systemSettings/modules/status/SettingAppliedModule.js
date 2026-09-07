// src/stateServices/systemSetting/modules/status/SettingAppliedModule.js
const { logger } = require("../../../../utils/logger");

/**
 * SettingAppliedModule - Handles side effects when a setting is applied/changed.
 * Includes cache invalidation and service reloading.
 */
class SettingAppliedModule {
  /**
   * @param {Object} cacheModule - SystemSettingCacheModule instance
   * @param {Object} auditModule - SystemSettingAuditModule instance
   */
  constructor(cacheModule, auditModule) {
    this.cacheModule = cacheModule;
    this.auditModule = auditModule;
  }

  /**
   * Handle setting apply side effects
   * @param {Object} setting - The setting entity
   * @param {any} oldValue - The old value
   * @param {any} newValue - The new value
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(setting, oldValue, newValue, user = "system", queryRunner = null) {
    logger.info(`[SettingApplied] Applying setting change for key "${setting.key}": ${oldValue} → ${newValue} by ${user}`);

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
      logger.info(`[SettingApplied] Email settings changed, will affect future sends.`);
    }

    // SMS settings changed
    if (settingKey.startsWith("twilio_") || settingKey === "sms_enabled") {
      logger.info(`[SettingApplied] SMS settings changed.`);
    }

    // Printer settings changed
    if (settingKey === "receipt_printer_type" || settingKey === "enable_receipt_printing") {
      logger.info(`[SettingApplied] Printer settings changed.`);
    }

    // Currency changed – notify frontend
    if (settingKey === "currency") {
      logger.info(`[SettingApplied] Currency changed, UI should refresh.`);
    }

    // Loyalty settings changed
    if (settingKey.startsWith("loyalty_") || settingKey === "enable_loyalty_points") {
      logger.info(`[SettingApplied] Loyalty settings changed.`);
    }

    // Inventory settings changed
    if (settingKey.startsWith("inventory_") || settingKey === "allow_negative_stock") {
      logger.info(`[SettingApplied] Inventory settings changed.`);
    }
  }
}

module.exports = SettingAppliedModule;