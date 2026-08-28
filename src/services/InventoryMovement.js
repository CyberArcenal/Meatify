// src/services/InventoryMovement.js
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
    const qrType =
      qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    logger.debug(
      `[InventoryMovement._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[InventoryMovement._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * ✅ NEW: Check if audit logging is enabled
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
   * ✅ NEW: Get allowed movement types from settings
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
   * ✅ NEW: Get max notes length from settings
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
   * ✅ NEW: Check if FIFO is enabled
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
   * ✅ NEW: Check if negative stock is allowed
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
   * ✅ NEW: Get movement retention days from settings
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

  /**
   * Create a new inventory movement (no side effects – state service handles batch updates)
   * @param {Object} data - { meatId, batchId?, movementType, qtyChange, notes?, saleId? }
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Optional transaction query runner
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
      // Validate required fields
      if (!data.meatId) throw new Error("meatId is required");
      if (!data.movementType) throw new Error("movementType is required");
      if (data.qtyChange === undefined || data.qtyChange === null) {
        throw new Error("qtyChange is required");
      }
      if (data.qtyChange === 0) {
        throw new Error("qtyChange cannot be zero");
      }

      // ✅ Validate movement type against allowed list
      const allowedTypes = await this._getAllowedMovementTypes(qr);
      if (!allowedTypes.includes(data.movementType)) {
        throw new Error(
          `Invalid movement type: "${data.movementType}". Allowed: ${allowedTypes.join(", ")}`
        );
      }

      // ✅ Validate notes length
      if (data.notes) {
        const maxLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxLength) {
          throw new Error(`Notes cannot exceed ${maxLength} characters`);
        }
      }

      // ✅ Check if negative stock is allowed (for validation)
      const negativeAllowed = await this._isNegativeStockAllowed(qr);
      if (!negativeAllowed && data.qtyChange < 0) {
        // This is just a warning - actual validation happens in state service
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
        // Optionally verify batch belongs to the meat
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

      // ✅ Check if audit logging is enabled before logging
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
   * Update an existing movement (only notes, movementType, timestamp allowed – batch/meat should not change)
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

      // Prevent updating meat, batch, sale, qtyChange (those are immutable)
      if (data.meatId || data.batchId || data.saleId || data.qtyChange !== undefined) {
        throw new Error("Cannot change meat, batch, sale, or qtyChange after creation.");
      }

      // ✅ Validate movement type if provided
      if (data.movementType) {
        const allowedTypes = await this._getAllowedMovementTypes(qr);
        if (!allowedTypes.includes(data.movementType)) {
          throw new Error(
            `Invalid movement type: "${data.movementType}". Allowed: ${allowedTypes.join(", ")}`
          );
        }
      }

      // ✅ Validate notes length if provided
      if (data.notes) {
        const maxLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxLength) {
          throw new Error(`Notes cannot exceed ${maxLength} characters`);
        }
      }

      const oldData = { ...existing };

      // Only allow updating notes, movementType, timestamp (rarely)
      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(movementRepo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
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
   * Soft delete a movement (set deletedAt) – if your entity supports soft delete; otherwise we skip or just mark as deleted via a flag.
   * Since InventoryMovement may not have a deletedAt, we can choose to just hard delete, but we'll implement a soft delete using an `isDeleted` flag? 
   * For consistency with other services, we'll add a `deletedAt` column? But the entity might not have it. For now, we'll just prevent deletion.
   * To keep it simple, we'll just provide a hard delete (permanent delete) method.
   */
  // We'll skip soft delete; implement permanent delete only.

  /**
   * Permanently delete an inventory movement (hard delete) – use with caution.
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

    // ✅ Check if movement is too old to delete (optional)
    // You can add a check based on settings

    await removeDb(movementRepo, movement, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.debugDelete("InventoryMovement", id, movement, user);
    }

    logger.debug(`InventoryMovement #${id} permanently deleted`);
  }

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

    // ✅ Apply retention days filter automatically if not specified
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
      // ✅ Validate movement types against allowed list
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
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get movement statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    // ✅ Apply retention days filter
    const retentionDays = await this._getMovementRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Count by type (with retention filter)
    const byType = await movementRepo
      .createQueryBuilder("movement")
      .select("movement.movementType", "type")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(movement.qtyChange)", "totalChange")
      .where("movement.timestamp >= :cutoffDate", { cutoffDate })
      .groupBy("movement.movementType")
      .getRawMany();

    // Total net movement (with retention filter)
    const totalNetResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(movement.qtyChange)", "net")
      .where("movement.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalNet = parseFloat(totalNetResult.net) || 0;

    // Positive movements sum (with retention filter)
    const totalInResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(movement.qtyChange)", "in")
      .where("movement.qtyChange > 0")
      .andWhere("movement.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalIn = parseFloat(totalInResult.in) || 0;

    // Negative movements sum (absolute) (with retention filter)
    const totalOutResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(ABS(movement.qtyChange))", "out")
      .where("movement.qtyChange < 0")
      .andWhere("movement.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalOut = parseFloat(totalOutResult.out) || 0;

    // Last 7 days count
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp >= :sevenDaysAgo", { sevenDaysAgo })
      .getCount();

    // ✅ Get total movement count (with retention filter)
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
      // Fetch all data without pagination for export
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

      // ✅ Check if audit logging is enabled before logging
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

  /**
   * Bulk create movements (no side effects)
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

  /**
   * ✅ NEW: Clean up old movements (hard delete)
   * @param {number} daysOld - Delete movements older than this (overrides settings)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldMovements(daysOld = null, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(qr, InventoryMovement);

    // ✅ Use settings if not provided
    if (daysOld === null) {
      daysOld = await this._getMovementRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // ✅ Only delete movements that are not linked to active sales or batches (optional)
    const oldMovements = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp < :cutoffDate", { cutoffDate })
      .andWhere("movement.saleId IS NULL") // Optional: only delete movements not linked to sales
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
          await auditLogger.debugDelete("InventoryMovement", movement.id, movement, user);
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
   * ✅ NEW: Get movement summary by meat
   * @param {number} meatId
   * @param {number} days - Look back period in days
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
      movements: movements.slice(0, 50), // Return last 50 movements
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
   * ✅ NEW: Get movement retention info
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