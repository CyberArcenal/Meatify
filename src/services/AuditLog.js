// src/services/AuditLog.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system"); // ✅ ADDED - for flexible settings
const { SettingType } = require("../entities/systemSettings"); // ✅ ADDED - for setting types

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "action",
  "entity",
  "entityId",
  "user",
  "timestamp",
]);

class AuditLogService {
  constructor() {
    this.auditLogRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const { AuditLog } = require("../entities/AuditLog");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.auditLogRepository = AppDataSource.getRepository(AuditLog);
    logger.debug("AuditLogService initialized");
  }

  async getRepository() {
    if (!this.auditLogRepository) {
      await this.initialize();
    }
    return this.auditLogRepository;
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    // Log the type for debugging
    const qrType =
      qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    logger.debug(
      `[AuditLog._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    // Only use the transactional manager if qr is a valid QueryRunner object
    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    // Fallback to global data source
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[AuditLog._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditLogEnabled(qr = null) {
    // ✅ Use system setting to check if audit logging is enabled
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[AuditLog] Failed to check audit log enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * Get log retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getLogRetentionDays(qr = null) {
    // ✅ Use system setting for log retention
    try {
      return await system.logRetentionDays();
    } catch (error) {
      logger.warn(`[AuditLog] Failed to get log retention days: ${error.message}, defaulting to 30`);
      return 30;
    }
  }

  /**
   * Get allowed audit actions from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedActions(qr = null) {
    // ✅ Use system setting for allowed log events
    try {
      return await system.logEvents();
    } catch (error) {
      logger.warn(`[AuditLog] Failed to get allowed actions: ${error.message}, using defaults`);
      return ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];
    }
  }

  /**
   * Create a new audit log entry
   * @param {Object} data - { action, entity, entityId?, user?, description? }
   * @param {string} user - User performing the action (for logger)
   * @param {import("typeorm").QueryRunner | null} qr - Optional transaction query runner
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const { AuditLog } = require("../entities/AuditLog");

    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      logger.debug(`[AuditLog] Audit logging is disabled, skipping create for ${data.action} on ${data.entity}`);
      return null;
    }

    const repo = this._getRepo(qr, AuditLog);

    try {
      // Validate required fields
      if (!data.action) throw new Error("Action is required");
      if (!data.entity) throw new Error("Entity is required");

      // ✅ Validate action against allowed list
      const allowedActions = await this._getAllowedActions(qr);
      if (!allowedActions.includes(data.action)) {
        logger.warn(`[AuditLog] Action "${data.action}" is not in allowed list: ${allowedActions.join(", ")}`);
        // Still allow but log warning - or you can throw error if strict
        // throw new Error(`Action "${data.action}" is not allowed for audit logging`);
      }

      const log = repo.create({
        action: data.action,
        entity: data.entity,
        entityId: data.entityId || null,
        user: data.user || user,
        timestamp: new Date(),
        description: data.description || null, // optional field if exists, otherwise ignore
      });

      const saved = await saveDb(repo, log, { queryRunner: qr });

      // Audit log of the audit log creation (to keep track, but avoid infinite loop)
      // We use the direct auditLogger utility which does NOT call this service.
      await auditLogger.logCreate("AuditLog", saved.id, saved, user);

      logger.debug(`AuditLog created: #${saved.id} - ${data.action} on ${data.entity}`);
      return saved;
    } catch (error) {
      console.error("Failed to create audit log:", error.message);
      throw error;
    }
  }

  /**
   * Find audit log by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      throw new Error("Audit logging is disabled");
    }

    const { AuditLog } = require("../entities/AuditLog");
    const repo = this._getRepo(qr, AuditLog);

    const log = await repo.findOne({ where: { id } });
    if (!log) {
      throw new Error(`AuditLog with ID ${id} not found`);
    }
    await logger.debug("AuditLog", id, "system");
    return log;
  }

  /**
   * Find all audit logs with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      logger.debug("[AuditLog] Audit logging is disabled, returning empty result");
      return { data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } };
    }

    const { AuditLog } = require("../entities/AuditLog");
    const repo = this._getRepo(qr, AuditLog);
    const qb = repo.createQueryBuilder("log");

    // ✅ Apply retention days filter automatically if not specified
    const retentionDays = await this._getLogRetentionDays(qr);
    if (!options.startDate && !options.endDate) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("log.timestamp >= :cutoffDate", { cutoffDate });
    }

    // Filters
    if (options.action) {
      qb.andWhere("log.action = :action", { action: options.action });
    }
    if (options.entity) {
      qb.andWhere("log.entity = :entity", { entity: options.entity });
    }
    if (options.entityId) {
      qb.andWhere("log.entityId = :entityId", { entityId: options.entityId });
    }
    if (options.user) {
      qb.andWhere("log.user = :user", { user: options.user });
    }
    if (options.startDate) {
      qb.andWhere("log.timestamp >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("log.timestamp <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(log.action LIKE :search OR log.entity LIKE :search OR log.user LIKE :search OR log.description LIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    // Sorting (with whitelist)
    let sortBy = options.sortBy || "timestamp";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[AuditLog] Invalid sortBy: ${sortBy}, falling back to timestamp`);
      sortBy = "timestamp";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`log.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("AuditLog", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Hard delete an audit log (use with caution – for cleanup)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      throw new Error("Audit logging is disabled");
    }

    const { removeDb } = require("../utils/dbUtils/dbActions");
    const { AuditLog } = require("../entities/AuditLog");
    const repo = this._getRepo(qr, AuditLog);

    const log = await repo.findOne({ where: { id } });
    if (!log) {
      throw new Error(`AuditLog with ID ${id} not found`);
    }

    await removeDb(repo, log, { queryRunner: qr });
    await auditLogger.debugDelete("AuditLog", id, log, user);
    logger.debug(`AuditLog #${id} permanently deleted`);
  }

  /**
   * Get audit log statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      logger.debug("[AuditLog] Audit logging is disabled, returning empty statistics");
      return {
        total: 0,
        last7Days: 0,
        byAction: {},
        byEntity: {},
      };
    }

    const { AuditLog } = require("../entities/AuditLog");
    const repo = this._getRepo(qr, AuditLog);

    // ✅ Apply retention days filter
    const retentionDays = await this._getLogRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Count by action
    const byAction = await repo
      .createQueryBuilder("log")
      .select("log.action", "action")
      .addSelect("COUNT(*)", "count")
      .where("log.timestamp >= :cutoffDate", { cutoffDate })
      .groupBy("log.action")
      .getRawMany();

    // Count by entity
    const byEntity = await repo
      .createQueryBuilder("log")
      .select("log.entity", "entity")
      .addSelect("COUNT(*)", "count")
      .where("log.timestamp >= :cutoffDate", { cutoffDate })
      .groupBy("log.entity")
      .getRawMany();

    const total = await repo.count({
      where: { timestamp: { $gte: cutoffDate } },
    });

    // Last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await repo
      .createQueryBuilder("log")
      .where("log.timestamp >= :sevenDaysAgo", { sevenDaysAgo })
      .getCount();

    return {
      total,
      last7Days,
      byAction: byAction.reduce((acc, row) => {
        acc[row.action] = parseInt(row.count, 10);
        return acc;
      }, {}),
      byEntity: byEntity.reduce((acc, row) => {
        acc[row.entity] = parseInt(row.count, 10);
        return acc;
      }, {}),
    };
  }

  /**
   * Export audit logs to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters - Export filters (same as findAll)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportAuditLogs(format = "json", filters = {}, user = "system", qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      throw new Error("Audit logging is disabled, cannot export");
    }

    try {
      // Fetch all data without pagination for export
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const logs = result.data;

      let exportData;
      if (format === "csv") {
        const headers = ["ID", "Action", "Entity", "Entity ID", "User", "Timestamp", "Description"];
        const rows = logs.map((log) => [
          log.id,
          log.action,
          log.entity,
          log.entityId ?? "",
          log.user ?? "",
          new Date(log.timestamp).toLocaleString(),
          log.description ?? "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `audit_logs_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: logs,
          filename: `audit_logs_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      await auditLogger.debugExport("AuditLog", format, filters, user);
      logger.debug(`Exported ${logs.length} audit logs in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export audit logs:", error);
      throw error;
    }
  }

  /**
   * Bulk create audit logs
   * @param {Array<Object>} logsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(logsArray, user = "system", qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      logger.debug("[AuditLog] Audit logging is disabled, skipping bulk create");
      return { created: [], errors: [] };
    }

    const results = { created: [], errors: [] };
    for (const data of logsArray) {
      try {
        const saved = await this.create(data, user, qr);
        if (saved) {
          results.created.push(saved);
        }
      } catch (err) {
        results.errors.push({ log: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import audit logs from a CSV file
   * @param {string} filePath
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async importFromCSV(filePath, user = "system", qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      throw new Error("Audit logging is disabled, cannot import");
    }

    const fs = require("fs").promises;
    const csv = require("csv-parse/sync");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { imported: [], errors: [] };
    for (const record of records) {
      try {
        const logData = {
          action: record.action,
          entity: record.entity,
          entityId: record.entityId ? parseInt(record.entityId, 10) : null,
          user: record.user || user,
          description: record.description || null,
        };
        // Basic validation
        if (!logData.action || !logData.entity) {
          throw new Error("Action and Entity are required");
        }
        const saved = await this.create(logData, user, qr);
        if (saved) {
          results.imported.push(saved);
        }
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }

  /**
   * ✅ NEW: Clean up old audit logs based on retention settings
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldLogs(user = "system", qr = null) {
    // ✅ Check if audit logging is enabled
    const auditEnabled = await this._isAuditLogEnabled(qr);
    if (!auditEnabled) {
      logger.debug("[AuditLog] Audit logging is disabled, skipping cleanup");
      return { count: 0 };
    }

    const { removeDb } = require("../utils/dbUtils/dbActions");
    const { AuditLog } = require("../entities/AuditLog");
    const repo = this._getRepo(qr, AuditLog);

    const retentionDays = await this._getLogRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldLogs = await repo
      .createQueryBuilder("log")
      .where("log.timestamp < :cutoffDate", { cutoffDate })
      .getMany();

    if (oldLogs.length === 0) {
      logger.info(`[AuditLog] No old logs to clean up (retention: ${retentionDays} days)`);
      return { count: 0 };
    }

    let deletedCount = 0;
    for (const log of oldLogs) {
      try {
        await removeDb(repo, log, { queryRunner: qr });
        deletedCount++;
      } catch (err) {
        logger.error(`[AuditLog] Failed to delete log #${log.id}:`, err);
      }
    }

    logger.info(`[AuditLog] Cleaned up ${deletedCount} old audit logs (older than ${retentionDays} days)`);
    return { count: deletedCount };
  }

  /**
   * ✅ NEW: Get audit log retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getLogRetentionDays(qr);
    const auditEnabled = await this._isAuditLogEnabled(qr);

    const { AuditLog } = require("../entities/AuditLog");
    const repo = this._getRepo(qr, AuditLog);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalLogs = await repo.count();
    const oldLogs = await repo
      .createQueryBuilder("log")
      .where("log.timestamp < :cutoffDate", { cutoffDate })
      .getCount();

    return {
      auditEnabled,
      retentionDays,
      totalLogs,
      logsToDelete: oldLogs,
      cutoffDate: cutoffDate.toISOString(),
    };
  }
}

// Singleton instance
const auditLogService = new AuditLogService();
module.exports = auditLogService;