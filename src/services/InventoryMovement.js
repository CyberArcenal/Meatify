// src/services/InventoryMovement.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
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
      await auditLogger.logCreate("InventoryMovement", saved.id, saved, user);
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

      const oldData = { ...existing };

      // Only allow updating notes, movementType, timestamp (rarely)
      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(movementRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("InventoryMovement", id, oldData, saved, user);
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

    // Optionally check if movement is too old to delete? We'll just allow.

    await removeDb(movementRepo, movement, { queryRunner: qr });
    await auditLogger.debugDelete("InventoryMovement", id, movement, user);
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

    // Count by type
    const byType = await movementRepo
      .createQueryBuilder("movement")
      .select("movement.movementType", "type")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(movement.qtyChange)", "totalChange")
      .groupBy("movement.movementType")
      .getRawMany();

    // Total net movement (sum of all qtyChange)
    const totalNetResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(movement.qtyChange)", "net")
      .getRawOne();
    const totalNet = parseFloat(totalNetResult.net) || 0;

    // Positive movements sum
    const totalInResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(movement.qtyChange)", "in")
      .where("movement.qtyChange > 0")
      .getRawOne();
    const totalIn = parseFloat(totalInResult.in) || 0;

    // Negative movements sum (absolute)
    const totalOutResult = await movementRepo
      .createQueryBuilder("movement")
      .select("SUM(ABS(movement.qtyChange))", "out")
      .where("movement.qtyChange < 0")
      .getRawOne();
    const totalOut = parseFloat(totalOutResult.out) || 0;

    // Last 7 days count
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp >= :sevenDaysAgo", { sevenDaysAgo })
      .getCount();

    return {
      byType,
      totalNet,
      totalIn,
      totalOut,
      last7Days,
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
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
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

      await auditLogger.debugExport("InventoryMovement", format, filters, user);
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
}

// Singleton instance
const inventoryMovementService = new InventoryMovementService();
module.exports = inventoryMovementService;