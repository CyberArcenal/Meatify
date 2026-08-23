// src/services/Batch.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "batchCode",
  "initialQuantity",
  "remainingQuantity",
  "unitCost",
  "expiryDate",
  "receivedDate",
  "status",
  "note",
  "createdAt",
  "updatedAt",
]);

class BatchService {
  constructor() {
    this.batchRepository = null;
    this.meatRepository = null;
    this.supplierRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Batch = require("../entities/Batch");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.batchRepository = AppDataSource.getRepository(Batch);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    logger.debug("BatchService initialized");
  }

  async getRepositories() {
    if (!this.batchRepository) {
      await this.initialize();
    }
    return {
      batch: this.batchRepository,
      meat: this.meatRepository,
      supplier: this.supplierRepository,
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
      `[Batch._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Batch._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new batch
   * @param {Object} data - { meatId, quantity, unitCost, expiryDate, supplierId?, note?, batchCode? }
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Optional transaction query runner
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    const batchRepo = this._getRepo(qr, Batch);
    const meatRepo = this._getRepo(qr, Meat);
    const supplierRepo = this._getRepo(qr, Supplier);

    try {
      // Validate required fields
      if (!data.meatId) throw new Error("meatId is required");
      if (!data.quantity || data.quantity <= 0) throw new Error("quantity must be greater than 0");
      if (!data.unitCost || data.unitCost < 0) throw new Error("unitCost must be non-negative");
      if (!data.expiryDate) throw new Error("expiryDate is required");

      const meat = await meatRepo.findOne({ where: { id: data.meatId, isActive: true } });
      if (!meat) {
        throw new Error(`Meat with ID ${data.meatId} not found or inactive`);
      }

      let supplier = null;
      if (data.supplierId) {
        supplier = await supplierRepo.findOne({ where: { id: data.supplierId, isActive: true } });
        if (!supplier) {
          throw new Error(`Supplier with ID ${data.supplierId} not found or inactive`);
        }
      }

      // Auto-generate batch code if not provided
      let batchCode = data.batchCode;
      if (!batchCode) {
        batchCode = await this.generateBatchCode(batchRepo);
      } else {
        const existing = await batchRepo.findOne({ where: { batchCode } });
        if (existing) {
          throw new Error(`Batch code "${batchCode}" already exists`);
        }
      }

      const expiryDate = new Date(data.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new Error("Invalid expiryDate format");
      }

      const batch = batchRepo.create({
        batchCode,
        initialQuantity: data.quantity,
        remainingQuantity: data.quantity,
        unitCost: data.unitCost,
        expiryDate,
        receivedDate: new Date(),
        status: "active",
        note: data.note || null,
        meat: meat,
        supplier: supplier || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(batchRepo, batch, { queryRunner: qr });
      await auditLogger.logCreate("Batch", saved.id, saved, user);
      logger.debug(`Batch created: #${saved.id} - ${saved.batchCode}`);
      return saved;
    } catch (error) {
      console.error("Failed to create batch:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing batch
   * @param {number} id
   * @param {Object} data - Fields to update (quantity updates should go through state service)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    try {
      const existing = await batchRepo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Batch with ID ${id} not found`);
      }

      // Prevent direct updates to remainingQuantity and status – use state service for those
      if (data.remainingQuantity !== undefined) {
        throw new Error("Use BatchStateService to update remainingQuantity");
      }
      if (data.status !== undefined && data.status !== existing.status) {
        throw new Error("Use BatchStateService to update status");
      }

      const oldData = { ...existing };

      // Handle batch code uniqueness if changed
      if (data.batchCode && data.batchCode !== existing.batchCode) {
        const duplicate = await batchRepo.findOne({ where: { batchCode: data.batchCode } });
        if (duplicate) {
          throw new Error(`Batch code "${data.batchCode}" already exists`);
        }
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(batchRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Batch", id, oldData, saved, user);
      logger.debug(`Batch updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update batch:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a batch (set status = 'depleted' or 'expired')
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    try {
      const batch = await batchRepo.findOne({ where: { id } });
      if (!batch) {
        throw new Error(`Batch with ID ${id} not found`);
      }

      // If already depleted/expired, throw error
      if (batch.status === "depleted" || batch.status === "expired") {
        throw new Error(`Batch #${id} is already ${batch.status}`);
      }

      // We'll allow soft delete by setting status to 'depleted' but only if remainingQuantity is 0
      if (batch.remainingQuantity > 0) {
        throw new Error(
          `Cannot soft delete batch #${id} because remainingQuantity is ${batch.remainingQuantity}. Use state service to adjust quantity first.`
        );
      }

      const oldData = { ...batch };
      batch.status = "depleted";
      batch.updatedAt = new Date();

      const saved = await updateDb(batchRepo, batch, { queryRunner: qr });
      await auditLogger.debugDelete("Batch", id, oldData, user);
      logger.debug(`Batch #${id} soft deleted (depleted)`);
      return saved;
    } catch (error) {
      console.error("Failed to delete batch:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted batch (set status back to 'active')
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    try {
      const batch = await batchRepo.findOne({ where: { id } });
      if (!batch) {
        throw new Error(`Batch with ID ${id} not found`);
      }

      if (batch.status !== "depleted" && batch.status !== "expired") {
        throw new Error(`Batch #${id} is not soft-deleted (status: ${batch.status})`);
      }

      // Only allow restore if remainingQuantity > 0
      if (batch.remainingQuantity <= 0) {
        throw new Error(`Cannot restore batch #${id} because remainingQuantity is 0.`);
      }

      const oldData = { ...batch };
      batch.status = "active";
      batch.updatedAt = new Date();

      const saved = await updateDb(batchRepo, batch, { queryRunner: qr });
      await auditLogger.logUpdate("Batch", id, oldData, saved, user);
      logger.debug(`Batch #${id} restored to active`);
      return saved;
    } catch (error) {
      console.error("Failed to restore batch:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a batch (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const batch = await batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    // Check if batch has any sale items or movements linked – if yes, prevent deletion
    // You can add a check here if needed (e.g., count sale items referencing this batch)

    await removeDb(batchRepo, batch, { queryRunner: qr });
    await auditLogger.debugDelete("Batch", id, batch, user);
    logger.debug(`Batch #${id} permanently deleted`);
  }

  /**
   * Find batch by ID
   * @param {number} id
   * @param {boolean} includeDeleted - if true, includes all statuses
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeDeleted = false, qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const queryBuilder = batchRepo
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.meat", "meat")
      .leftJoinAndSelect("batch.supplier", "supplier")
      .where("batch.id = :id", { id });

    if (!includeDeleted) {
      queryBuilder.andWhere("batch.status IN ('active', 'on_hold')");
    }

    const batch = await queryBuilder.getOne();
    if (!batch) {
      throw new Error(`Batch with ID ${id} not found`);
    }
    await logger.debug("Batch", id, "system");
    return batch;
  }

  /**
   * Find all batches with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const qb = batchRepo
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.meat", "meat")
      .leftJoinAndSelect("batch.supplier", "supplier");

    // Filters
    if (options.meatId) {
      qb.andWhere("batch.meatId = :meatId", { meatId: options.meatId });
    }
    if (options.supplierId) {
      qb.andWhere("batch.supplierId = :supplierId", { supplierId: options.supplierId });
    }
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      qb.andWhere("batch.status IN (:...statuses)", { statuses });
    }
    if (options.expiryDateFrom) {
      qb.andWhere("batch.expiryDate >= :expiryDateFrom", {
        expiryDateFrom: new Date(options.expiryDateFrom),
      });
    }
    if (options.expiryDateTo) {
      qb.andWhere("batch.expiryDate <= :expiryDateTo", {
        expiryDateTo: new Date(options.expiryDateTo),
      });
    }
    if (options.minRemaining !== undefined) {
      qb.andWhere("batch.remainingQuantity >= :minRemaining", {
        minRemaining: options.minRemaining,
      });
    }
    if (options.maxRemaining !== undefined) {
      qb.andWhere("batch.remainingQuantity <= :maxRemaining", {
        maxRemaining: options.maxRemaining,
      });
    }
    if (options.search) {
      qb.andWhere(
        "(batch.batchCode LIKE :search OR batch.note LIKE :search OR meat.name LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Default: exclude depleted/expired unless explicitly requested
    if (!options.includeInactive) {
      qb.andWhere("batch.status IN ('active', 'on_hold')");
    }

    // Sorting (whitelist)
    let sortBy = options.sortBy || "expiryDate";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Batch] Invalid sortBy: ${sortBy}, falling back to expiryDate`);
      sortBy = "expiryDate";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`batch.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("Batch", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get batch statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    // Count by status
    const byStatus = await batchRepo
      .createQueryBuilder("batch")
      .select("batch.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("batch.status")
      .getRawMany();

    // Total remaining quantity
    const totalRemainingResult = await batchRepo
      .createQueryBuilder("batch")
      .select("SUM(batch.remainingQuantity)", "total")
      .where("batch.status IN ('active', 'on_hold')")
      .getRawOne();
    const totalRemaining = parseFloat(totalRemainingResult.total) || 0;

    // Expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSoon = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate <= :sevenDaysFromNow", { sevenDaysFromNow })
      .andWhere("batch.expiryDate >= :today", { today: new Date() })
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getCount();

    // Expired batches
    const expired = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate < :today", { today: new Date() })
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getCount();

    return {
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {}),
      totalRemaining,
      expiringSoon,
      expired,
    };
  }

  /**
   * Export batches to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportBatches(format = "json", filters = {}, user = "system", qr = null) {
    try {
      // Fetch all data without pagination for export
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const batches = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Batch Code",
          "Meat",
          "Supplier",
          "Initial Qty",
          "Remaining Qty",
          "Unit Cost",
          "Expiry Date",
          "Received Date",
          "Status",
          "Note",
          "Created At",
        ];
        const rows = batches.map((b) => [
          b.id,
          b.batchCode,
          b.meat?.name ?? "",
          b.supplier?.name ?? "",
          b.initialQuantity,
          b.remainingQuantity,
          b.unitCost,
          new Date(b.expiryDate).toLocaleDateString(),
          new Date(b.receivedDate).toLocaleDateString(),
          b.status,
          b.note ?? "",
          new Date(b.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `batches_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: batches,
          filename: `batches_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      await auditLogger.debugExport("Batch", format, filters, user);
      logger.debug(`Exported ${batches.length} batches in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export batches:", error);
      throw error;
    }
  }

  /**
   * Bulk create batches
   * @param {Array<Object>} batchesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(batchesArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of batchesArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ batch: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update batches
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
   * Import batches from CSV file
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
          quantity: parseFloat(record.quantity),
          unitCost: parseFloat(record.unitCost),
          expiryDate: record.expiryDate,
          supplierId: record.supplierId ? parseInt(record.supplierId, 10) : null,
          note: record.note || null,
          batchCode: record.batchCode || null,
        };
        if (!data.meatId || !data.quantity || !data.unitCost || !data.expiryDate) {
          throw new Error("meatId, quantity, unitCost, and expiryDate are required");
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
   * Generate a unique batch code
   * @param {import("typeorm").Repository<any>} repo
   * @returns {Promise<string>}
   */
  async generateBatchCode(repo) {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    let code = `BATCH-${datePart}-${randomPart}`;

    let attempts = 0;
    let existing = await repo.findOne({ where: { batchCode: code } });
    while (existing && attempts < 5) {
      const newRandom = Math.floor(1000 + Math.random() * 9000);
      code = `BATCH-${datePart}-${newRandom}`;
      existing = await repo.findOne({ where: { batchCode: code } });
      attempts++;
    }
    if (existing) {
      code = `BATCH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    return code;
  }
}

// Singleton instance
const batchService = new BatchService();
module.exports = batchService;