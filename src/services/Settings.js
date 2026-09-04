// src/services/SystemSettingService.js
//@ts-check
const { app } = require("electron");
const auditLogger = require("../utils/auditLogger");
const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
const { logger } = require("../utils/logger");
const { validate } = require("../validation");
const {
  systemSettingCreateSchema,
  systemSettingUpdateSchema,
  systemSettingGroupedSchema,
} = require("../validation/schemas/systemSetting.schema");
const { z } = require("zod");

class SystemSettingService {
  constructor() {
    this.settingRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const { SystemSetting } = require("../entities/systemSettings");
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    this.settingRepository = AppDataSource.getRepository(SystemSetting);
    logger.debug("SystemSettingService initialized");
  }

  async getRepositories() {
    if (!this.settingRepository) await this.initialize();
    return { setting: this.settingRepository };
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    const qrType =
      qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    logger.debug(
      `[SystemSetting._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[SystemSetting._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * @param {null | undefined} value
   */
  _prepareValueForStorage(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  /**
   * @param {unknown} value
   */
  _normalizeOutput(value) {
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
      try {
        const parsed = JSON.parse(value);
        if (
          Array.isArray(parsed) ||
          (typeof parsed === "object" && parsed !== null)
        )
          return parsed;
      } catch {}
    }
    return value;
  }

  // ----------------------------------------------------------------------
  // READ OPERATIONS
  // ----------------------------------------------------------------------

  async getAllSettings(includeDeleted = false) {
    const { setting: repo } = await this.getRepositories();
    const where = includeDeleted ? {} : { is_deleted: false };
    const settings = await repo.find({ where });
    return settings.map((s) => ({
      ...s,
      value: this._normalizeOutput(s.value),
    }));
  }

  async getPublicSettings() {
    const { setting: repo } = await this.getRepositories();
    const settings = await repo.find({
      where: { is_public: true, is_deleted: false },
    });
    return settings.map((s) => ({
      ...s,
      value: this._normalizeOutput(s.value),
    }));
  }

  /**
   * @param {any} settingType
   */
  async getByType(settingType) {
    const { setting: repo } = await this.getRepositories();
    const settings = await repo.find({
      where: { setting_type: settingType, is_deleted: false },
    });
    return settings.map((s) => ({
      ...s,
      value: this._normalizeOutput(s.value),
    }));
  }

  /**
   * @param {any} key
   */
  async getSettingByKey(key, settingType = null) {
    const { setting: repo } = await this.getRepositories();
    const where = { key, is_deleted: false };
    if (settingType) where.setting_type = settingType;
    const setting = await repo.findOne({ where });
    if (!setting) return null;
    return { ...setting, value: this._normalizeOutput(setting.value) };
  }

  /**
   * @param {any} key
   */
  async getValueByKey(key, defaultValue = null) {
    const setting = await this.getSettingByKey(key);
    return setting ? setting.value : defaultValue;
  }

  // ----------------------------------------------------------------------
  // WRITE OPERATIONS - WITH VALIDATION
  // ----------------------------------------------------------------------

  /**
   * Create a new setting
   * @param {Object} data - { key, value, setting_type, description?, is_public? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async createSetting(data, user = "system", qr = null) {
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    // ✅ Validate input
    const validated = validate(systemSettingCreateSchema, data, 'System setting creation');

    const valueToStore = this._prepareValueForStorage(validated.value);
    const setting = repo.create({
      key: validated.key,
      value: valueToStore,
      setting_type: validated.setting_type,
      description: validated.description || null,
      is_public: validated.is_public ?? false,
      is_deleted: false,
    });

    const saved = await saveDb(repo, setting, { queryRunner: qr });
    await auditLogger.logCreate("SystemSetting", saved.id, saved, user);
    return { ...saved, value: this._normalizeOutput(saved.value) };
  }

  /**
   * Update an existing setting
   * @param {number} id
   * @param {Object} data - { value?, key?, setting_type?, description?, is_public?, is_deleted? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateSetting(id, data, user = "system", qr = null) {
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    // ✅ Validate input
    const validated = validate(systemSettingUpdateSchema, data, 'System setting update');

    const existing = await repo.findOne({ where: { id, is_deleted: false } });
    if (!existing) throw new Error(`Setting with id ${id} not found`);

    const oldData = { ...existing };

    // Apply validated changes
    if (validated.key !== undefined) existing.key = validated.key;
    if (validated.value !== undefined) {
      existing.value = this._prepareValueForStorage(validated.value);
    }
    if (validated.setting_type !== undefined) existing.setting_type = validated.setting_type;
    if (validated.description !== undefined) existing.description = validated.description;
    if (validated.is_public !== undefined) existing.is_public = validated.is_public;
    if (validated.is_deleted !== undefined) existing.is_deleted = validated.is_deleted;

    existing.updated_at = new Date();

    const saved = await updateDb(repo, existing, { queryRunner: qr });
    await auditLogger.logUpdate("SystemSetting", id, oldData, saved, user);
    return { ...saved, value: this._normalizeOutput(saved.value) };
  }

  /**
   * Set a value by key (create or update)
   * @param {string} key
   * @param {any} value
   * @param {Object} options
   * @param {string} [options.setting_type]
   * @param {string} [options.description]
   * @param {boolean} [options.is_public]
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async setValueByKey(key, value, options = {}, user = "system", qr = null) {
    // ✅ Validate key and value
    const validated = validate(
      z.object({
        key: z.string().min(1, 'Key is required').max(100),
        value: z.any(),
        setting_type: z.enum(['general', 'inventory', 'sales', 'notifications', 'cashier']).optional(),
        description: z.string().max(500).optional(),
        is_public: z.boolean().optional(),
      }),
      { key, value, ...options },
      'Set value by key'
    );

    const existing = await this.getSettingByKey(validated.key, validated.setting_type);
    if (existing) {
      return this.updateSetting(
        existing.id,
        {
          value: validated.value,
          setting_type: validated.setting_type,
          description: validated.description,
          is_public: validated.is_public,
        },
        user,
        qr
      );
    } else {
      return this.createSetting(
        {
          key: validated.key,
          value: validated.value,
          setting_type: validated.setting_type || "general",
          description: validated.description || `Auto-generated setting for ${validated.key}`,
          is_public: validated.is_public ?? false,
        },
        user,
        qr
      );
    }
  }

  /**
   * Delete a setting (soft delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async deleteSetting(id, user = "system", qr = null) {
    const { SystemSetting } = require("../entities/systemSettings");
    const repo = this._getRepo(qr, SystemSetting);

    // ✅ Validate id
    const validated = validate(
      z.object({ id: z.number().int().positive() }),
      { id },
      'Delete setting'
    );

    const setting = await repo.findOne({ where: { id: validated.id, is_deleted: false } });
    if (!setting) throw new Error(`Setting with id ${validated.id} not found`);

    setting.is_deleted = true;
    setting.updated_at = new Date();

    const saved = await updateDb(repo, setting, { queryRunner: qr });
    await auditLogger.logCreate("SystemSetting", validated.id, setting, user);
    return saved;
  }

  /**
   * Bulk update settings (create or update)
   * @param {Array<Object>} settingsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkUpdate(settingsArray, user = "system", qr = null) {
    // ✅ Validate array
    const validated = validate(
      z.array(systemSettingCreateSchema.or(systemSettingUpdateSchema)),
      settingsArray,
      'Bulk settings update'
    );

    const results = { updated: [], errors: [] };
    for (const item of validated) {
      try {
        const existing = await this.getSettingByKey(item.key, item.setting_type);
        let saved;
        if (existing) {
          saved = await this.updateSetting(existing.id, item, user, qr);
          results.updated.push({ ...saved, action: "updated" });
        } else {
          saved = await this.createSetting(item, user, qr);
          results.updated.push({ ...saved, action: "created" });
        }
      } catch (err) {
        results.errors.push({ key: item.key, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk delete settings
   * @param {number[]} ids
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkDelete(ids, user = "system", qr = null) {
    // ✅ Validate array
    const validated = validate(
      z.array(z.number().int().positive()),
      ids,
      'Bulk delete settings'
    );

    const results = { deleted: [], errors: [] };
    for (const id of validated) {
      try {
        await this.deleteSetting(id, user, qr);
        results.deleted.push(id);
      } catch (err) {
        results.errors.push({ id, error: err.message });
      }
    }
    return results;
  }

  /**
   * Get all settings grouped by type
   * @returns {Promise<Object>}
   */
  async getGroupedConfig() {
    const settings = await this.getAllSettings();
    const grouped = {};
    for (const s of settings) {
      if (!grouped[s.setting_type]) grouped[s.setting_type] = {};
      grouped[s.setting_type][s.key] = s.value;
    }
    return grouped;
  }

  /**
   * Update grouped configuration
   * @param {Object} configData - { category: { key: value } }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateGroupedConfig(configData, user = "system", qr = null) {
    // ✅ Validate grouped config
    const validated = validate(systemSettingGroupedSchema, configData, 'Grouped config update');

    const results = { updated: [], errors: [] };
    for (const [category, dict] of Object.entries(validated)) {
      for (const [key, value] of Object.entries(dict)) {
        try {
          const saved = await this.setValueByKey(
            key,
            value,
            { setting_type: category },
            user,
            qr,
          );
          results.updated.push({ category, key, id: saved.id });
        } catch (err) {
          results.errors.push({ category, key, error: err.message });
        }
      }
    }
    return results;
  }

  /**
   * Get system information
   * @param {Object} options
   * @param {string} [options.appName] - Override app name
   */
  async getSystemInfo(options = {}) {
    // Use app.getVersion() instead of reading package.json
    const version = app ? app.getVersion() : "1.0.0";
    const appName = options.appName || "Meatify";

    return {
      version,
      name: appName,
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
      debug_mode: process.env.NODE_ENV === "development",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      current_time: new Date().toISOString(),
      setting_types: Object.values(
        require("../entities/systemSettings").SettingType,
      ),
    };
  }

  /**
   * Get a setting value as string
   * @param {string} key
   * @param {string} defaultValue
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getString(key, defaultValue = "", qr = null) {
    const value = await this.getValueByKey(key, defaultValue);
    return typeof value === "string" ? value : String(value);
  }

  /**
   * Get a setting value as number
   * @param {string} key
   * @param {number} defaultValue
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getNumber(key, defaultValue = 0, qr = null) {
    const value = await this.getValueByKey(key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get a setting value as boolean
   * @param {string} key
   * @param {boolean} defaultValue
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getBoolean(key, defaultValue = false, qr = null) {
    const value = await this.getValueByKey(key, defaultValue);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") return true;
      if (lower === "false" || lower === "0" || lower === "no") return false;
    }
    return defaultValue;
  }

  /**
   * Get a setting value as array
   * @param {string} key
   * @param {Array} defaultValue
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getArray(key, defaultValue = [], qr = null) {
    const value = await this.getValueByKey(key, defaultValue);
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return defaultValue;
  }

  /**
   * Get a setting value as object
   * @param {string} key
   * @param {Object} defaultValue
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getObject(key, defaultValue = {}, qr = null) {
    const value = await this.getValueByKey(key, defaultValue);
    if (typeof value === "object" && value !== null) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null) return parsed;
      } catch {}
    }
    return defaultValue;
  }
}

const systemSettingService = new SystemSettingService();
module.exports = systemSettingService;