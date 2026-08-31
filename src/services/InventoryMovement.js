// src/services/InventoryMovement.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "movementType",
  "qtyChange",
  "timestamp",
  "notes",
  "createdAt",
  "updatedAt",
]);

class InventoryMovementService {
  constructor() {
    this.movementRepository = null;
    this.meatRepository = null;
    this.batchRepository = null;
    this.saleRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const InventoryMovement = require("../entities/InventoryMovement");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");
    const Sale = require("../entities/Sale");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.movementRepository = AppDataSource.getRepository(InventoryMovement);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.batchRepository = AppDataSource.getRepository(Batch);
    this.saleRepository = AppDataSource.getRepository(Sale);
    logger.debug("InventoryMovementService initialized");
  }

  async getRepositories() {
    if (!this.movementRepository) {
      await this.initialize();
    }
    return {
      movement: this.movementRepository,
      meat: this.meatRepository,
      batch: this.batchRepository,
      sale: this.saleRepository,
    };
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    const qrType = qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    logger.debug(`[InventoryMovement._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[InventoryMovement._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[InventoryMovement] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * Get allowed movement types from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedMovementTypes(qr = null) {
    try {
      return await system.getArray("allowed_movement_types", SettingType.INVENTORY, [
        "sale", "refund", "adjustment", "purchase", "expiry_write_off"
      ]);
    } catch (error) {
      logger.warn(`[InventoryMovement] Failed to get allowed movement types: ${error.message}, using defaults`);
      return ["sale", "refund", "adjustment", "purchase", "expiry_write_off"];
    }
  }

  /**
   * Get max notes length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNotesLength(qr = null) {
    try {
      return await system.getInt("max_movement_notes_length", SettingType.INVENTORY, 500);
    } catch (error) {
      logger.warn(`[InventoryMovement] Failed to get max notes length: ${error.message}, defaulting to 500`);
      return 500;
    }
  }

  /**
   * Check if FIFO is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isFifoEnabled(qr = null) {
    try {
      return await system.fifoEnabled();
    } catch (error) {
      logger.warn(`[InventoryMovement] Failed to check FIFO enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * Check if negative stock is allowed
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isNegativeStockAllowed(qr = null) {
    try {
      return await system.allowNegativeStock();
    } catch (error) {
      logger.warn(`[InventoryMovement] Failed to check negative stock allowed: ${error.message}, defaulting to false`);
      return false;
    }
  }

  /**
   * Get movement retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMovementRetentionDays(qr = null) {
    try {
      return await system.getInt("movement_retention_days", SettingType.INVENTORY, 365);
    } catch (error) {
      logger.warn(`[InventoryMovement] Failed to get retention days: ${error.message}, defaulting to 365`);
      return 365;
    }
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  /**
   * Find movement by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const movement = await movementRepo
      .createQueryBuilder("movement")
      .leftJoinAndSelect("movement.meat", "meat")
      .leftJoinAndSelect("movement.batch", "batch")
      .leftJoinAndSelect("movement.sale", "sale")
      .where("movement.id = :id", { id })
      .getOne();

    if (!movement) {
      throw new Error(`InventoryMovement with ID ${id} not found`);
    }
    await logger.debug("InventoryMovement", id, "system");
    return movement;
  }

  /**
   * Find all movements with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const qb = movementRepo
      .createQueryBuilder("movement")
      .leftJoinAndSelect("movement.meat", "meat")
      .leftJoinAndSelect("movement.batch", "batch")
      .leftJoinAndSelect("movement.sale", "sale");

    // Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getMovementRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("movement.timestamp >= :cutoffDate", { cutoffDate });
    }

    // Filters
    if (options.meatId) {
      qb.andWhere("movement.meatId = :meatId", { meatId: options.meatId });
    }
    if (options.batchId) {
      qb.andWhere("movement.batchId = :batchId", { batchId: options.batchId });
    }
    if (options.saleId) {
      qb.andWhere("movement.saleId = :saleId", { saleId: options.saleId });
    }
    if (options.movementType) {
      const types = Array.isArray(options.movementType) ? options.movementType : [options.movementType];
      const allowedTypes = await this._getAllowedMovementTypes(qr);
      const invalidTypes = types.filter(t => !allowedTypes.includes(t));
      if (invalidTypes.length > 0) {
        logger.warn(`[InventoryMovement] Invalid movement types: ${invalidTypes.join(", ")}. Allowed: ${allowedTypes.join(", ")}`);
      }
      qb.andWhere("movement.movementType IN (:...types)", { types });
    }
    if (options.startDate) {
      qb.andWhere("movement.timestamp >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("movement.timestamp <= :endDate", { endDate: end });
    }
    if (options.direction === "positive") {
      qb.andWhere("movement.qtyChange > 0");
    } else if (options.direction === "negative") {
      qb.andWhere("movement.qtyChange < 0");
    }
    if (options.search) {
      qb.andWhere(
        "(movement.notes LIKE :search OR meat.name LIKE :search OR batch.batchCode LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "timestamp";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[InventoryMovement] Invalid sortBy: ${sortBy}, falling back to timestamp`);
      sortBy = "timestamp";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`movement.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("InventoryMovement", null, "system");
    return result;
  }

  /**
   * Get movement statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const retentionDays = await this._getMovementRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const byType = await movementRepo
      .createQueryBuilder("movement")
      .select("movement.movementType", "type")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(movement.qtyChange)", "totalChange")
      .where("movement.timestamp >= :cutoffDate", { cutoffDate })
      .groupBy("movement.movementType")
      .getRawMany();

    const totalNetResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(movement.qtyChange)", "net")
      .where("movement.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalNet = parseFloat(totalNetResult.net) || 0;

    const totalInResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(movement.qtyChange)", "in")
      .where("movement.qtyChange > 0")
      .andWhere("movement.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalIn = parseFloat(totalInResult.in) || 0;

    const totalOutResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(ABS(movement.qtyChange))", "out")
      .where("movement.qtyChange < 0")
      .andWhere("movement.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalOut = parseFloat(totalOutResult.out) || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp >= :sevenDaysAgo", { sevenDaysAgo })
      .getCount();

    const totalCount = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp >= :cutoffDate", { cutoffDate })
      .getCount();

    return {
      byType,
      totalNet,
      totalIn,
      totalOut,
      last7Days,
      totalCount,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  /**
   * Export movements to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportMovements(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined, ignoreRetention: true }, qr);
      const movements = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Type",
          "Qty Change",
          "Meat",
          "Batch Code",
          "Sale ID",
          "Notes",
          "Timestamp",
          "Created At",
        ];
        const rows = movements.map((m) => [
          m.id,
          m.movementType,
          m.qtyChange,
          m.meat?.name ?? "",
          m.batch?.batchCode ?? "",
          m.sale?.id ?? "",
          m.notes ?? "",
          new Date(m.timestamp).toLocaleString(),
          new Date(m.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `inventory_movements_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: movements,
          filename: `inventory_movements_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("InventoryMovement", format, filters, user);
      }

      logger.debug(`Exported ${movements.length} inventory movements in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export inventory movements:", error);
      throw error;
    }
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (CRUD)
  // ============================================================

  /**
   * Create a new inventory movement
   * @param {Object} data - { meatId, batchId?, movementType, qtyChange, notes?, saleId? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");
    const Sale = require("../entities/Sale");

    const movementRepo = this._getRepo(qr, InventoryMovement);
    const meatRepo = this._getRepo(qr, Meat);
    const batchRepo = this._getRepo(qr, Batch);
    const saleRepo = this._getRepo(qr, Sale);

    try {
      if (!data.meatId) throw new Error("meatId is required");
      if (!data.movementType) throw new Error("movementType is required");
      if (data.qtyChange === undefined || data.qtyChange === null) {
        throw new Error("qtyChange is required");
      }
      if (data.qtyChange === 0) {
        throw new Error("qtyChange cannot be zero");
      }

      const allowedTypes = await this._getAllowedMovementTypes(qr);
      if (!allowedTypes.includes(data.movementType)) {
        throw new Error(
          `Invalid movement type: "${data.movementType}". Allowed: ${allowedTypes.join(", ")}`
        );
      }

      if (data.notes) {
        const maxLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxLength) {
          throw new Error(`Notes cannot exceed ${maxLength} characters`);
        }
      }

      const negativeAllowed = await this._isNegativeStockAllowed(qr);
      if (!negativeAllowed && data.qtyChange < 0) {
        logger.warn(`[InventoryMovement] Negative stock is disabled, but creating negative movement of ${data.qtyChange}`);
      }

      const meat = await meatRepo.findOne({ where: { id: data.meatId, isActive: true } });
      if (!meat) {
        throw new Error(`Meat with ID ${data.meatId} not found or inactive`);
      }

      let batch = null;
      if (data.batchId) {
        batch = await batchRepo.findOne({ where: { id: data.batchId } });
        if (!batch) {
          throw new Error(`Batch with ID ${data.batchId} not found`);
        }
        if (batch.meatId !== data.meatId) {
          throw new Error(`Batch #${data.batchId} does not belong to meat #${data.meatId}`);
        }
      }

      let sale = null;
      if (data.saleId) {
        sale = await saleRepo.findOne({ where: { id: data.saleId } });
        if (!sale) {
          throw new Error(`Sale with ID ${data.saleId} not found`);
        }
      }

      const movement = movementRepo.create({
        movementType: data.movementType,
        qtyChange: data.qtyChange,
        notes: data.notes || null,
        timestamp: new Date(),
        meat: meat,
        batch: batch || null,
        sale: sale || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(movementRepo, movement, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("InventoryMovement", saved.id, saved, user);
      }

      logger.debug(`InventoryMovement created: #${saved.id} - ${saved.movementType} (${saved.qtyChange})`);
      return saved;
    } catch (error) {
      console.error("Failed to create inventory movement:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing movement
   * @param {number} id
   * @param {Object} data - Fields to update
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    try {
      const existing = await movementRepo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`InventoryMovement with ID ${id} not found`);
      }

      if (data.meatId || data.batchId || data.saleId || data.qtyChange !== undefined) {
        throw new Error("Cannot change meat, batch, sale, or qtyChange after creation.");
      }

      if (data.movementType) {
        const allowedTypes = await this._getAllowedMovementTypes(qr);
        if (!allowedTypes.includes(data.movementType)) {
          throw new Error(
            `Invalid movement type: "${data.movementType}". Allowed: ${allowedTypes.join(", ")}`
          );
        }
      }

      if (data.notes) {
        const maxLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxLength) {
          throw new Error(`Notes cannot exceed ${maxLength} characters`);
        }
      }

      const oldData = { ...existing };
      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(movementRepo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("InventoryMovement", id, oldData, saved, user);
      }

      logger.debug(`InventoryMovement updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update inventory movement:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete an inventory movement
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const movement = await movementRepo.findOne({ where: { id } });
    if (!movement) {
      throw new Error(`InventoryMovement with ID ${id} not found`);
    }

    await removeDb(movementRepo, movement, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("InventoryMovement", id, movement, user);
    }

    logger.debug(`InventoryMovement #${id} permanently deleted`);
  }

  // ============================================================
  // 🔄 BUSINESS LOGIC METHODS
  // ============================================================

  /**
   * Recalculate batch remaining quantities from all movements
   * @param {number} batchId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async recalcBatchRemaining(batchId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const InventoryMovement = require("../entities/InventoryMovement");

    const batchRepo = this._getRepo(qr, Batch);
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const batch = await batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error(`Batch #${batchId} not found`);
    }

    const result = await movementRepo
      .createQueryBuilder("movement", qr)
      .select("SUM(movement.qtyChange)", "total")
      .where("movement.batchId = :batchId", { batchId })
      .getRawOne();
    const netChange = parseFloat(result.total) || 0;

    const newRemaining = batch.initialQuantity + netChange;
    if (newRemaining < 0) {
      throw new Error(`Recalculated remaining quantity for batch #${batchId} is negative (${newRemaining})`);
    }

    const oldRemaining = batch.remainingQuantity;
    batch.remainingQuantity = newRemaining;
    if (batch.remainingQuantity === 0 && batch.status !== "expired") {
      batch.status = "depleted";
    } else if (batch.remainingQuantity > 0 && batch.status === "depleted") {
      batch.status = "active";
    }
    batch.updatedAt = new Date();

    await updateDb(batchRepo, batch, { queryRunner: qr, skipSignal: false });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Batch",
        batchId,
        { remainingQuantity: oldRemaining },
        { remainingQuantity: batch.remainingQuantity },
        user
      );
    }

    logger.info(`[InventoryMovement] Recalculated batch #${batchId}: ${oldRemaining} → ${batch.remainingQuantity}`);
    return batch;
  }

  // ============================================================
  // 📤 BULK & IMPORT OPERATIONS
  // ============================================================

  /**
   * Bulk create movements
   * @param {Array<Object>} movementsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(movementsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of movementsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ movement: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update movements
   * @param {Array<{ id: number, updates: Object }>} updatesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkUpdate(updatesArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        const saved = await this.update(id, updates, user, qr);
        results.updated.push(saved);
      } catch (err) {
        results.errors.push({ id, updates, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import movements from CSV file
   * @param {string} filePath
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async importFromCSV(filePath, user = "system", qr = null) {
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
        const data = {
          meatId: parseInt(record.meatId, 10),
          batchId: record.batchId ? parseInt(record.batchId, 10) : null,
          movementType: record.movementType,
          qtyChange: parseFloat(record.qtyChange),
          notes: record.notes || null,
          saleId: record.saleId ? parseInt(record.saleId, 10) : null,
        };
        if (!data.meatId || !data.movementType || isNaN(data.qtyChange) || data.qtyChange === 0) {
          throw new Error("meatId, movementType, and non-zero qtyChange are required");
        }
        const saved = await this.create(data, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }

  // ============================================================
  // 🧹 CLEANUP & RETENTION
  // ============================================================

  /**
   * Clean up old movements (hard delete)
   * @param {number} daysOld
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldMovements(daysOld = null, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    if (daysOld === null) {
      daysOld = await this._getMovementRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldMovements = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp < :cutoffDate", { cutoffDate })
      .andWhere("movement.saleId IS NULL")
      .getMany();

    if (oldMovements.length === 0) {
      logger.info(`[InventoryMovement] No old movements to clean up (threshold: ${daysOld} days)`);
      return { count: 0 };
    }

    let deletedCount = 0;
    for (const movement of oldMovements) {
      try {
        await removeDb(movementRepo, movement, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logCreate("InventoryMovement", movement.id, movement, user);
        }

        deletedCount++;
        logger.debug(`[InventoryMovement] Deleted movement #${movement.id} (older than ${daysOld} days)`);
      } catch (err) {
        logger.error(`[InventoryMovement] Failed to delete movement #${movement.id}:`, err);
      }
    }

    logger.info(`[InventoryMovement] Cleaned up ${deletedCount} old movements (older than ${daysOld} days)`);
    return { count: deletedCount };
  }

  /**
   * Get movement summary by meat
   * @param {number} meatId
   * @param {number} days
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getMovementSummaryByMeat(meatId, days = 30, qr = null) {
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.meatId = :meatId", { meatId })
      .andWhere("movement.timestamp >= :startDate", { startDate })
      .orderBy("movement.timestamp", "DESC")
      .getMany();

    const summary = {
      meatId,
      days,
      totalIn: 0,
      totalOut: 0,
      netChange: 0,
      totalMovements: movements.length,
      byType: {},
      movements: movements.slice(0, 50),
    };

    for (const movement of movements) {
      if (movement.qtyChange > 0) {
        summary.totalIn += movement.qtyChange;
      } else {
        summary.totalOut += Math.abs(movement.qtyChange);
      }

      if (!summary.byType[movement.movementType]) {
        summary.byType[movement.movementType] = { count: 0, totalQty: 0 };
      }
      summary.byType[movement.movementType].count += 1;
      summary.byType[movement.movementType].totalQty += movement.qtyChange;
    }

    summary.netChange = summary.totalIn - summary.totalOut;
    return summary;
  }

  /**
   * Get movement retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getMovementRetentionDays(qr);
    const auditEnabled = await this._isAuditEnabled(qr);

    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalMovements = await movementRepo.count();
    const oldMovements = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp < :cutoffDate", { cutoffDate })
      .getCount();

    return {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalMovements,
      movementsToDelete: oldMovements,
      auditEnabled,
    };
  }
}

// Singleton instance
const inventoryMovementService = new InventoryMovementService();
module.exports = inventoryMovementService;