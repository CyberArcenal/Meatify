// src/stateServices/systemSetting/SystemSettingStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const { SystemSetting } = require("../../entities/systemSettings");
const SettingAppliedModule = require("./modules/status/SettingAppliedModule");
const SettingResetModule = require("./modules/status/SettingResetModule");
const SettingValidatedModule = require("./modules/status/SettingValidatedModule");
const { SystemSettingStatusModule, DEFAULTS } = require("./modules/SystemSettingStatusModule");
const SystemSettingAuditModule = require("./modules/SystemSettingAuditModule");
const SystemSettingCacheModule = require("./modules/SystemSettingCacheModule");

/**
 * SystemSettingStateTransitionService - Orchestrates system setting state transitions.
 * Handles side effects for setting changes, resets, and validations.
 */
class SystemSettingStateTransitionService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.settingRepo = dataSource.getRepository(SystemSetting);

    // ─── Initialize modules ──────────────────────────────────────
    this.cacheModule = new SystemSettingCacheModule();
    this.auditModule = new SystemSettingAuditModule();
    this.statusModule = new SystemSettingStatusModule();

    // ─── Status modules with dependencies ───────────────────────
    this.appliedModule = new SettingAppliedModule(this.cacheModule, this.auditModule);
    this.resetModule = new SettingResetModule(this.cacheModule, this.auditModule);
    this.validatedModule = new SettingValidatedModule();
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
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

  // ============================================================
  // 🔄 STATE TRANSITION SIDE EFFECTS
  // ============================================================

  /**
   * Apply a setting change (invalidate cache, reload services)
   * @param {Object} setting - The setting entity
   * @param {any} oldValue - The old value
   * @param {any} newValue - The new value
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onApply(setting, oldValue, newValue, user = "system", queryRunner = null) {
    logger.info(`[SystemSetting] Applying setting change for key "${setting.key}": ${oldValue} → ${newValue} by ${user}`);

    // 1. Handle apply side effects (cache invalidation + service reload)
    await this.appliedModule.handle(setting, oldValue, newValue, user, queryRunner);

    // 2. Audit log
    await this.auditModule.logApplied(setting, oldValue, newValue, user);
  }

  /**
   * Reset setting to factory default
   * @param {Object} setting - The setting entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The updated setting
   */
  async onReset(setting, user = "system", queryRunner = null) {
    const { updateDb } = require("../../utils/dbUtils/dbActions");
    logger.info(`[SystemSetting] Resetting setting "${setting.key}" to default by ${user}`);

    // 1. Fetch default value from constants
    const defaultValue = this.statusModule.getDefault(setting.key);

    // 2. Save and apply
    const repo = this._getRepo(queryRunner, this.settingRepo.target);
    const oldValue = setting.value;
    setting.value = this._prepareValueForStorage(defaultValue);
    setting.updatedAt = new Date();
    const updated = await updateDb(repo, setting, { queryRunner });

    // 3. Handle reset side effects (cache invalidation + service reload)
    await this.resetModule.handle(setting, defaultValue, oldValue, user, queryRunner);

    // 4. Audit log
    await this.auditModule.logReset(setting, oldValue, defaultValue, user);

    return updated;
  }

  /**
   * Validate a proposed value before applying
   * @param {Object} setting - The setting entity
   * @param {any} proposedValue - The proposed value
   * @returns {Promise<{ valid: boolean; errorMessage?: string }>}
   */
  async onValidate(setting, proposedValue) {
    return this.validatedModule.handle(setting, proposedValue);
  }

  // ============================================================
  // 🔧 UTILITY METHODS
  // ============================================================

  /**
   * Get default value for a setting key
   * @param {string} key - The setting key
   * @returns {any} The default value
   */
  getDefault(key) {
    return this.statusModule.getDefault(key);
  }

  /**
   * Check if a setting key has a default value
   * @param {string} key - The setting key
   * @returns {boolean}
   */
  hasDefault(key) {
    return this.statusModule.hasDefault(key);
  }

  /**
   * Get all default values
   * @returns {Object}
   */
  getAllDefaults() {
    return this.statusModule.getAllDefaults();
  }

  /**
   * Invalidate cache for a setting
   * @param {string} key - The setting key
   */
  invalidateCache(key) {
    this.cacheModule.invalidate(key);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cacheModule.clear();
  }
}

module.exports = { SystemSettingStateTransitionService };