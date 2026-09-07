// src/stateServices/systemSetting/modules/SystemSettingAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * SystemSettingAuditModule - Handles audit logging for system setting events.
 * Delegates to the common AuditLogger.
 */
class SystemSettingAuditModule {
  /**
   * Log setting change (apply)
   * @param {Object} setting - The setting entity
   * @param {any} oldValue - The old value
   * @param {any} newValue - The new value
   * @param {string} user - User performing the action
   */
  async logApplied(setting, oldValue, newValue, user = "system") {
    await AuditLogger.logUpdate(
      "SystemSetting",
      setting.id,
      { oldValue, newValue },
      { applied: true },
      user
    );
  }

  /**
   * Log setting reset
   * @param {Object} setting - The setting entity
   * @param {any} oldValue - The old value
   * @param {any} newValue - The new value (default)
   * @param {string} user - User performing the action
   */
  async logReset(setting, oldValue, newValue, user = "system") {
    await AuditLogger.logUpdate(
      "SystemSetting",
      setting.id,
      { reset: true, oldValue },
      { newValue },
      user
    );
  }
}

module.exports = SystemSettingAuditModule;