// src/services/BaseService.js
//@ts-check

const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");

/**
 * Base service class providing common CRUD, pagination, bulk operations,
 * audit logging, and system setting helpers.
 * 
 * @template T
 */
class BaseService {
  /**
   * @param {Function} entityClass - The entity class (e.g., Category, Meat)
   * @param {Object} options
   * @param {Set<string>} [options.allowedSortColumns] - Columns allowed for sorting (prevents SQL injection)
   * @param {string} [options.defaultSort] - Default sort column
   * @param {string} [options.defaultSortOrder] - Default sort order ('ASC' | 'DESC')
   * @param {string} [options.entityName] - Entity name for logging/audit (defaults to entityClass.name)
   * @param {Object} [options.defaultFilters] - Default filters applied to findAll
   */
  constructor(entityClass, options = {}) {
    this.entityClass = entityClass;
    this.entityName = options.entityName || entityClass.name;
    this.allowedSortColumns = options.allowedSortColumns || new Set(['id', 'createdAt', 'updatedAt']);
    this.defaultSort = options.defaultSort || 'createdAt';
    this.defaultSortOrder = options.defaultSortOrder || 'DESC';
    this.defaultFilters = options.defaultFilters || {};
    this._repository = null;
  }

  // ============================================================
  // 🔧 REPOSITORY HELPERS
  // ============================================================

  /**
   * Get the repository for this entity (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} [entityClass] - Override entity class
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass = null) {
    const target = entityClass || this.entityClass;
    if (qr && typeof qr === 'object' && !!qr.manager) {
      return qr.manager.getRepository(target);
    }
    const { AppDataSource } = require("../main/db/data-source");
    return AppDataSource.getRepository(target);
  }

  // ============================================================
  // 🔒 AUDIT & SETTINGS
  // ============================================================

  /**
   * Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[${this.entityName}] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * Get a setting value (with fallback) for a specific key and type
   * @param {string} key
   * @param {string} settingType
   * @param {any} defaultValue
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<any>}
   */
  async _getSetting(key, settingType, defaultValue, qr = null) {
    try {
      return await system.getValue(key, settingType, defaultValue);
    } catch (error) {
      logger.warn(`[${this.entityName}] Failed to get setting ${key}: ${error.message}, using default`);
      return defaultValue;
    }
  }

  /**
   * Get default active status from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _getDefaultActiveStatus(qr = null) {
    return this._getSetting('default_active_status', SettingType.INVENTORY, true, qr);
  }

  /**
   * Get max notes length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNotesLength(qr = null) {
    return this._getSetting('max_notes_length', SettingType.INVENTORY, 500, qr);
  }

  // ============================================================
  // 🔍 GENERIC READ METHODS (can be overridden)
  // ============================================================

  /**
   * Find entity by ID
   * @param {number} id
   * @param {boolean} includeDeleted - Include soft-deleted if true
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<any>}
   */
  async findById(id, includeDeleted = false, qr = null) {
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new Error(`Invalid ${this.entityName} ID: ${id}`);
    }
    const repo = this._getRepo(qr);
    const qb = repo.createQueryBuilder(this.entityName.toLowerCase());
    qb.where(`${this.entityName.toLowerCase()}.id = :id`, { id });

    if (!includeDeleted && this._hasSoftDelete()) {
      qb.andWhere(`${this.entityName.toLowerCase()}.deletedAt IS NULL`);
    }

    const entity = await qb.getOne();
    if (!entity) {
      throw new Error(`${this.entityName} with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Find all entities with pagination and filters.
   * Override this method to apply specific filters and joins.
   * @param {Object} options - { page, limit, sortBy, sortOrder, ...customFilters }
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ data: any[], pagination: Object }>}
   */
  async findAll(options = {}, qr = null) {
    const repo = this._getRepo(qr);
    const qb = repo.createQueryBuilder(this.entityName.toLowerCase());

    // Apply default filters if any
    for (const [key, value] of Object.entries(this.defaultFilters)) {
      if (value !== undefined && value !== null) {
        qb.andWhere(`${this.entityName.toLowerCase()}.${key} = :${key}`, { [key]: value });
      }
    }

    // Override with provided filters (subclasses should add their own)
    // This base method doesn't know about specific fields; subclasses override.

    // Sorting (with whitelist)
    let sortBy = options.sortBy || this.defaultSort;
    if (!this.allowedSortColumns.has(sortBy)) {
      logger.warn(`[${this.entityName}] Invalid sortBy: ${sortBy}, falling back to ${this.defaultSort}`);
      sortBy = this.defaultSort;
    }
    const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`${this.entityName.toLowerCase()}.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    return result; // { data: [], pagination: {} }
  }

  // ============================================================
  // ✏️ GENERIC WRITE METHODS (may need override)
  // ============================================================

  /**
   * Create a new entity (subclasses should implement specific validation)
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = 'system', qr = null) {
    throw new Error(`create() must be implemented in ${this.entityName}Service`);
  }

  /**
   * Update an existing entity (subclasses should implement)
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = 'system', qr = null) {
    throw new Error(`update() must be implemented in ${this.entityName}Service`);
  }

  /**
   * Soft delete (set isActive = false or deletedAt)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = 'system', qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(qr);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`${this.entityName} with ID ${id} not found`);
    }
    if (entity.isActive !== undefined) {
      entity.isActive = false;
    } else if (entity.deletedAt !== undefined) {
      entity.deletedAt = new Date();
    } else {
      throw new Error(`Soft delete not supported for ${this.entityName}`);
    }
    entity.updatedAt = new Date();
    const saved = await updateDb(repo, entity, { queryRunner: qr });
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate(this.entityName, id, entity, user);
    }
    return saved;
  }

  /**
   * Restore a soft-deleted entity
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = 'system', qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(qr);
    const entity = await repo.findOne({ where: { id }, withDeleted: true });
    if (!entity) {
      throw new Error(`${this.entityName} with ID ${id} not found`);
    }
    if (entity.isActive !== undefined) {
      entity.isActive = true;
    } else if (entity.deletedAt !== undefined) {
      entity.deletedAt = null;
    } else {
      throw new Error(`Restore not supported for ${this.entityName}`);
    }
    entity.updatedAt = new Date();
    const saved = await updateDb(repo, entity, { queryRunner: qr });
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(this.entityName, id, { action: 'restored' }, saved, user);
    }
    return saved;
  }

  /**
   * Permanently delete (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = 'system', qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(qr);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`${this.entityName} with ID ${id} not found`);
    }
    await removeDb(repo, entity, { queryRunner: qr });
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate(this.entityName, id, entity, user);
    }
  }

  // ============================================================
  // 📤 BULK & EXPORT/IMPORT
  // ============================================================

  /**
   * Bulk create entities
   * @param {Array<Object>} dataArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ created: any[], errors: Array<{ data: any, error: string }> }>}
   */
  async bulkCreate(dataArray, user = 'system', qr = null) {
    const results = { created: [], errors: [] };
    for (const data of dataArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update entities
   * @param {Array<{ id: number, updates: Object }>} updatesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ updated: any[], errors: Array<{ id: number, error: string }> }>}
   */
  async bulkUpdate(updatesArray, user = 'system', qr = null) {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        const saved = await this.update(id, updates, user, qr);
        results.updated.push(saved);
      } catch (err) {
        results.errors.push({ id, error: err.message });
      }
    }
    return results;
  }

  /**
   * Export entities to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters - Same as findAll
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ format: string, data: string|any[], filename: string }>}
   */
  async export(format = 'json', filters = {}, user = 'system', qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const entities = result.data;

      let exportData;
      if (format === 'csv') {
        // Subclasses should override to provide proper headers/rows
        const headers = ['ID', 'Created At', 'Updated At'];
        const rows = entities.map(e => [e.id, e.createdAt, e.updatedAt]);
        exportData = {
          format: 'csv',
          data: [headers, ...rows].map(row => row.join(',')).join('\n'),
          filename: `${this.entityName.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.csv`
        };
      } else {
        exportData = {
          format: 'json',
          data: entities,
          filename: `${this.entityName.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.json`
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate(this.entityName, format, filters, user);
      }
      logger.debug(`Exported ${entities.length} ${this.entityName} in ${format} format`);
      return exportData;
    } catch (error) {
      logger.error(`Failed to export ${this.entityName}:`, error);
      throw error;
    }
  }

  /**
   * Import entities from CSV file (subclasses should override)
   * @param {string} filePath
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ imported: any[], errors: Array<{ row: any, error: string }> }>}
   */
  async importFromCSV(filePath, user = 'system', qr = null) {
    throw new Error(`importFromCSV must be implemented in ${this.entityName}Service`);
  }

  // ============================================================
  // 🧰 UTILITY HELPERS
  // ============================================================

  /**
   * Check if entity has soft delete column (deletedAt or isActive)
   * @returns {boolean}
   */
  _hasSoftDelete() {
    // Simple check – we can inspect entity columns if needed.
    // For now, we assume deletedAt or isActive.
    const entity = new this.entityClass();
    return entity.deletedAt !== undefined || entity.isActive !== undefined;
  }

  /**
   * Generate a unique code (SKU, reference, etc.)
   * @param {import("typeorm").Repository<any>} repo
   * @param {string} prefix
   * @param {string} field - The field to check uniqueness against
   * @param {number} [randomLength=4]
   * @returns {Promise<string>}
   */
  async _generateUniqueCode(repo, prefix, field, randomLength = 4) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * Math.pow(10, randomLength)).toString().padStart(randomLength, '0');
    let code = `${prefix}-${datePart}-${randomPart}`;
    let attempts = 0;
    let existing = await repo.findOne({ where: { [field]: code } });
    while (existing && attempts < 5) {
      const newRandom = Math.floor(Math.random() * Math.pow(10, randomLength)).toString().padStart(randomLength, '0');
      code = `${prefix}-${datePart}-${newRandom}`;
      existing = await repo.findOne({ where: { [field]: code } });
      attempts++;
    }
    if (existing) {
      code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    return code;
  }
}

module.exports = { BaseService };