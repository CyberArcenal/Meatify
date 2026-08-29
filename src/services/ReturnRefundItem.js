// src/services/ReturnRefundItem.js
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
  "weightKg",
  "unitPrice",
  "subtotal",
  "reason",
  "createdAt",
  "updatedAt",
]);

class ReturnRefundItemService {
  constructor() {
    this.returnItemRepository = null;
    this.returnRefundRepository = null;
    this.meatRepository = null;
    this.batchRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const ReturnRefund = require("../entities/ReturnRefund");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.returnItemRepository = AppDataSource.getRepository(ReturnRefundItem);
    this.returnRefundRepository = AppDataSource.getRepository(ReturnRefund);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.batchRepository = AppDataSource.getRepository(Batch);
    logger.debug("ReturnRefundItemService initialized");
  }

  async getRepositories() {
    if (!this.returnItemRepository) {
      await this.initialize();
    }
    return {
      returnItem: this.returnItemRepository,
      returnRefund: this.returnRefundRepository,
      meat: this.meatRepository,
      batch: this.batchRepository,
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
      `[ReturnRefundItem._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[ReturnRefundItem._getRepo] Using global repository (fallback)`);
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
      logger.warn(`[ReturnRefundItem] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Check if restock is enabled for refunds
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isRestockEnabled(qr = null) {
    try {
      return await system.refundRestockEnabled();
    } catch (error) {
      logger.warn(`[ReturnRefundItem] Failed to check restock enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get max weight per item from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxWeightKg(qr = null) {
    try {
      return await system.getDecimal("max_return_weight_kg", SettingType.SALES, 999.999);
    } catch (error) {
      logger.warn(`[ReturnRefundItem] Failed to get max weight: ${error.message}, defaulting to 999.999`);
      return 999.999;
    }
  }

  /**
   * ✅ NEW: Get max unit price from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxUnitPrice(qr = null) {
    try {
      return await system.getDecimal("max_return_unit_price", SettingType.SALES, 9999.99);
    } catch (error) {
      logger.warn(`[ReturnRefundItem] Failed to get max unit price: ${error.message}, defaulting to 9999.99`);
      return 9999.99;
    }
  }

  /**
   * ✅ NEW: Get max subtotal from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxSubtotal(qr = null) {
    try {
      return await system.getDecimal("max_return_subtotal", SettingType.SALES, 999999.99);
    } catch (error) {
      logger.warn(`[ReturnRefundItem] Failed to get max subtotal: ${error.message}, defaulting to 999999.99`);
      return 999999.99;
    }
  }

  /**
   * ✅ NEW: Get max reason length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxReasonLength(qr = null) {
    try {
      return await system.getInt("max_return_item_reason_length", SettingType.SALES, 500);
    } catch (error) {
      logger.warn(`[ReturnRefundItem] Failed to get max reason length: ${error.message}, defaulting to 500`);
      return 500;
    }
  }

  /**
   * ✅ NEW: Get retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRetentionDays(qr = null) {
    try {
      return await system.getInt("return_item_retention_days", SettingType.SALES, 730);
    } catch (error) {
      logger.warn(`[ReturnRefundItem] Failed to get retention days: ${error.message}, defaulting to 730`);
      return 730;
    }
  }

  /**
   * Create a new return refund item
   * @param {Object} data - { returnRefundId, meatId, batchId, weightKg, unitPrice, subtotal?, reason? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const ReturnRefund = require("../entities/ReturnRefund");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");

    const returnItemRepo = this._getRepo(qr, ReturnRefundItem);
    const returnRefundRepo = this._getRepo(qr, ReturnRefund);
    const meatRepo = this._getRepo(qr, Meat);
    const batchRepo = this._getRepo(qr, Batch);

    try {
      // ✅ Check refund restock setting
      const restockEnabled = await this._isRestockEnabled(qr);
      if (!restockEnabled) {
        throw new Error("Restocking on refund is disabled in system settings");
      }

      // Validate required fields
      if (!data.returnRefundId) throw new Error("returnRefundId is required");
      if (!data.meatId) throw new Error("meatId is required");
      if (!data.batchId) throw new Error("batchId is required");
      if (data.weightKg === undefined || data.weightKg === null || data.weightKg <= 0) {
        throw new Error("weightKg must be greater than 0");
      }
      if (data.unitPrice === undefined || data.unitPrice === null || data.unitPrice < 0) {
        throw new Error("unitPrice must be non-negative");
      }

      // ✅ Validate max weight
      const maxWeight = await this._getMaxWeightKg(qr);
      if (data.weightKg > maxWeight) {
        throw new Error(`Weight ${data.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`);
      }

      // ✅ Validate max unit price
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      if (data.unitPrice > maxUnitPrice) {
        throw new Error(`Unit price ₱${data.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
      }

      // ✅ Validate reason length
      if (data.reason) {
        const maxReasonLength = await this._getMaxReasonLength(qr);
        if (data.reason.length > maxReasonLength) {
          throw new Error(`Reason cannot exceed ${maxReasonLength} characters`);
        }
      }

      // Validate return refund exists
      const returnRefund = await returnRefundRepo.findOne({ where: { id: data.returnRefundId } });
      if (!returnRefund) {
        throw new Error(`ReturnRefund with ID ${data.returnRefundId} not found`);
      }

      // Check if return is already processed - prevent adding items to processed returns
      if (returnRefund.status === "processed") {
        throw new Error(`Cannot add items to a processed return`);
      }
      if (returnRefund.status === "cancelled") {
        throw new Error(`Cannot add items to a cancelled return`);
      }

      // Validate meat exists and is active
      const meat = await meatRepo.findOne({ where: { id: data.meatId, isActive: true } });
      if (!meat) {
        throw new Error(`Meat with ID ${data.meatId} not found or inactive`);
      }

      // Validate batch exists and belongs to the meat
      const batch = await batchRepo.findOne({ where: { id: data.batchId } });
      if (!batch) {
        throw new Error(`Batch with ID ${data.batchId} not found`);
      }
      if (batch.meatId !== data.meatId) {
        throw new Error(`Batch #${data.batchId} does not belong to meat #${data.meatId}`);
      }

      // Compute subtotal if not provided
      let subtotal = data.subtotal;
      if (subtotal === undefined || subtotal === null) {
        subtotal = data.unitPrice * data.weightKg;
      }

      // ✅ Validate max subtotal
      const maxSubtotal = await this._getMaxSubtotal(qr);
      if (subtotal > maxSubtotal) {
        throw new Error(`Subtotal ₱${subtotal} exceeds maximum allowed of ₱${maxSubtotal}`);
      }

      const returnItem = returnItemRepo.create({
        weightKg: data.weightKg,
        unitPrice: data.unitPrice,
        subtotal: subtotal,
        reason: data.reason || null,
        returnRefund: returnRefund,
        meat: meat,
        batch: batch,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(returnItemRepo, returnItem, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("ReturnRefundItem", saved.id, saved, user);
      }

      logger.debug(`ReturnRefundItem created: #${saved.id} - Meat: ${meat.name}, Weight: ${saved.weightKg}kg`);
      return saved;
    } catch (error) {
      console.error("Failed to create return refund item:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing return refund item (only specific fields allowed)
   * @param {number} id
   * @param {Object} data - { weightKg?, unitPrice?, subtotal?, reason? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    try {
      const existing = await repo.findOne({
        where: { id },
        relations: ["returnRefund", "meat", "batch"]
      });
      if (!existing) {
        throw new Error(`ReturnRefundItem with ID ${id} not found`);
      }

      // Prevent changing returnRefund, meat, or batch
      if (data.returnRefundId !== undefined || data.meatId !== undefined || data.batchId !== undefined) {
        throw new Error("Cannot change returnRefundId, meatId, or batchId after creation");
      }

      // Check if the parent return is already processed
      if (existing.returnRefund && existing.returnRefund.status === "processed") {
        throw new Error(`Cannot update items in a processed return`);
      }
      if (existing.returnRefund && existing.returnRefund.status === "cancelled") {
        throw new Error(`Cannot update items in a cancelled return`);
      }

      const oldData = { ...existing };

      // ✅ Get max values for validation
      const maxWeight = await this._getMaxWeightKg(qr);
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      const maxSubtotal = await this._getMaxSubtotal(qr);
      const maxReasonLength = await this._getMaxReasonLength(qr);

      // Update fields if provided
      if (data.weightKg !== undefined) {
        if (data.weightKg <= 0) throw new Error("weightKg must be greater than 0");
        if (data.weightKg > maxWeight) {
          throw new Error(`Weight ${data.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`);
        }
        existing.weightKg = data.weightKg;
        // Recalculate subtotal if unitPrice exists
        existing.subtotal = existing.unitPrice * existing.weightKg;
      }
      if (data.unitPrice !== undefined) {
        if (data.unitPrice < 0) throw new Error("unitPrice must be non-negative");
        if (data.unitPrice > maxUnitPrice) {
          throw new Error(`Unit price ₱${data.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
        }
        existing.unitPrice = data.unitPrice;
        existing.subtotal = existing.unitPrice * existing.weightKg;
      }
      if (data.subtotal !== undefined) {
        // Allow manual subtotal override if no other fields changed
        if (data.weightKg === undefined && data.unitPrice === undefined) {
          if (data.subtotal > maxSubtotal) {
            throw new Error(`Subtotal ₱${data.subtotal} exceeds maximum allowed of ₱${maxSubtotal}`);
          }
          existing.subtotal = data.subtotal;
        }
        // Otherwise, the recalculation above will override
      }
      if (data.reason !== undefined) {
        if (data.reason && data.reason.length > maxReasonLength) {
          throw new Error(`Reason cannot exceed ${maxReasonLength} characters`);
        }
        existing.reason = data.reason;
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("ReturnRefundItem", id, oldData, saved, user);
      }

      logger.debug(`ReturnRefundItem updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update return refund item:", error.message);
      throw error;
    }
  }

  /**
   * Delete a return refund item (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    const item = await repo.findOne({ where: { id }, relations: ["returnRefund"] });
    if (!item) {
      throw new Error(`ReturnRefundItem with ID ${id} not found`);
    }

    // Check if the parent return is already processed
    if (item.returnRefund && item.returnRefund.status === "processed") {
      throw new Error(`Cannot delete items from a processed return. Use state service to reverse.`);
    }
    if (item.returnRefund && item.returnRefund.status === "cancelled") {
      throw new Error(`Cannot delete items from a cancelled return.`);
    }

    await removeDb(repo, item, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("ReturnRefundItem", id, item, user);
    }

    logger.debug(`ReturnRefundItem #${id} permanently deleted`);
  }

  /**
   * Find return refund item by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    const item = await repo
      .createQueryBuilder("returnItem")
      .leftJoinAndSelect("returnItem.returnRefund", "returnRefund")
      .leftJoinAndSelect("returnItem.meat", "meat")
      .leftJoinAndSelect("returnItem.batch", "batch")
      .where("returnItem.id = :id", { id })
      .getOne();

    if (!item) {
      throw new Error(`ReturnRefundItem with ID ${id} not found`);
    }
    await logger.debug("ReturnRefundItem", id, "system");
    return item;
  }

  /**
   * Find all return refund items with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    const qb = repo
      .createQueryBuilder("returnItem")
      .leftJoinAndSelect("returnItem.returnRefund", "returnRefund")
      .leftJoinAndSelect("returnItem.meat", "meat")
      .leftJoinAndSelect("returnItem.batch", "batch");

    // ✅ Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("returnItem.createdAt >= :cutoffDate", { cutoffDate });
    }

    // Filters
    if (options.returnRefundId) {
      qb.andWhere("returnItem.returnRefundId = :returnRefundId", {
        returnRefundId: options.returnRefundId
      });
    }
    if (options.meatId) {
      qb.andWhere("returnItem.meatId = :meatId", { meatId: options.meatId });
    }
    if (options.batchId) {
      qb.andWhere("returnItem.batchId = :batchId", { batchId: options.batchId });
    }
    if (options.minWeight !== undefined) {
      qb.andWhere("returnItem.weightKg >= :minWeight", { minWeight: options.minWeight });
    }
    if (options.maxWeight !== undefined) {
      qb.andWhere("returnItem.weightKg <= :maxWeight", { maxWeight: options.maxWeight });
    }
    if (options.minAmount !== undefined) {
      qb.andWhere("returnItem.subtotal >= :minAmount", { minAmount: options.minAmount });
    }
    if (options.maxAmount !== undefined) {
      qb.andWhere("returnItem.subtotal <= :maxAmount", { maxAmount: options.maxAmount });
    }
    if (options.startDate) {
      qb.andWhere("returnItem.createdAt >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("returnItem.createdAt <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(meat.name LIKE :search OR returnRefund.referenceNo LIKE :search OR batch.batchCode LIKE :search OR returnItem.reason LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "createdAt";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[ReturnRefundItem] Invalid sortBy: ${sortBy}, falling back to createdAt`);
      sortBy = "createdAt";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`returnItem.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("ReturnRefundItem", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get return refund item statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    // ✅ Apply retention days filter
    const retentionDays = await this._getRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Total weight and amount
    const totalResult = await repo
      .createQueryBuilder("returnItem")
      .select("SUM(returnItem.weightKg)", "totalWeight")
      .addSelect("SUM(returnItem.subtotal)", "totalAmount")
      .where("returnItem.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();

    // By meat
    const byMeat = await repo
      .createQueryBuilder("returnItem")
      .leftJoin("returnItem.meat", "meat")
      .select("meat.id", "meatId")
      .addSelect("meat.name", "meatName")
      .addSelect("COUNT(returnItem.id)", "count")
      .addSelect("SUM(returnItem.weightKg)", "totalWeight")
      .addSelect("SUM(returnItem.subtotal)", "totalAmount")
      .where("returnItem.createdAt >= :cutoffDate", { cutoffDate })
      .groupBy("meat.id")
      .orderBy("totalAmount", "DESC")
      .limit(5)
      .getRawMany();

    // Average weight per item
    const avgWeightResult = await repo
      .createQueryBuilder("returnItem")
      .select("AVG(returnItem.weightKg)", "avgWeight")
      .where("returnItem.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();

    // Items with reason
    const withReason = await repo
      .createQueryBuilder("returnItem")
      .where("returnItem.reason IS NOT NULL")
      .andWhere("returnItem.createdAt >= :cutoffDate", { cutoffDate })
      .getCount();

    // ✅ Get max values from settings
    const maxWeight = await this._getMaxWeightKg(qr);
    const maxUnitPrice = await this._getMaxUnitPrice(qr);
    const maxSubtotal = await this._getMaxSubtotal(qr);

    // ✅ Count items exceeding max weight
    const exceedingMaxWeight = await repo
      .createQueryBuilder("returnItem")
      .where("returnItem.weightKg > :maxWeight", { maxWeight })
      .andWhere("returnItem.createdAt >= :cutoffDate", { cutoffDate })
      .getCount();

    return {
      totalWeight: parseFloat(totalResult.totalWeight) || 0,
      totalAmount: parseFloat(totalResult.totalAmount) || 0,
      averageWeight: parseFloat(avgWeightResult.avgWeight) || 0,
      topMeats: byMeat,
      itemsWithReason: withReason,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      maxWeight,
      maxUnitPrice,
      maxSubtotal,
      exceedingMaxWeight,
    };
  }

  /**
   * Export return refund items to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportItems(format = "json", filters = {}, user = "system", qr = null) {
    try {
      // Fetch all data without pagination for export
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined, ignoreRetention: true }, qr);
      const items = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Return Refund",
          "Meat",
          "Batch Code",
          "Weight (kg)",
          "Unit Price",
          "Subtotal",
          "Reason",
          "Created At",
        ];
        const rows = items.map((i) => [
          i.id,
          i.returnRefund?.referenceNo ?? "",
          i.meat?.name ?? "",
          i.batch?.batchCode ?? "",
          i.weightKg,
          i.unitPrice,
          i.subtotal,
          i.reason ?? "",
          new Date(i.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `return_items_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: items,
          filename: `return_items_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("ReturnRefundItem", format, filters, user);
      }

      logger.debug(`Exported ${items.length} return refund items in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export return refund items:", error);
      throw error;
    }
  }

  /**
   * Bulk create return refund items
   * @param {Array<Object>} itemsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(itemsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of itemsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ item: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update return refund items
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
   * Import return refund items from CSV file
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
          returnRefundId: parseInt(record.returnRefundId, 10),
          meatId: parseInt(record.meatId, 10),
          batchId: parseInt(record.batchId, 10),
          weightKg: parseFloat(record.weightKg),
          unitPrice: parseFloat(record.unitPrice),
          subtotal: record.subtotal ? parseFloat(record.subtotal) : null,
          reason: record.reason || null,
        };
        if (!data.returnRefundId || !data.meatId || !data.batchId || !data.weightKg || data.unitPrice === undefined) {
          throw new Error("returnRefundId, meatId, batchId, weightKg, and unitPrice are required");
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
   * ✅ NEW: Clean up old return refund items (hard delete)
   * @param {number} daysOld - Delete items older than this (overrides settings)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldItems(daysOld = null, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    // ✅ Use settings if not provided
    if (daysOld === null) {
      daysOld = await this._getRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // ✅ Only delete items from processed returns
    const oldItems = await repo
      .createQueryBuilder("returnItem")
      .leftJoin("returnItem.returnRefund", "returnRefund")
      .where("returnItem.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("returnRefund.status = 'processed'")
      .getMany();

    if (oldItems.length === 0) {
      logger.info(`[ReturnRefundItem] No old items to clean up (threshold: ${daysOld} days)`);
      return { count: 0 };
    }

    let deletedCount = 0;
    for (const item of oldItems) {
      try {
        await removeDb(repo, item, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logCreate("ReturnRefundItem", item.id, item, user);
        }

        deletedCount++;
        logger.debug(`[ReturnRefundItem] Deleted item #${item.id} (older than ${daysOld} days)`);
      } catch (err) {
        logger.error(`[ReturnRefundItem] Failed to delete item #${item.id}:`, err);
      }
    }

    logger.info(`[ReturnRefundItem] Cleaned up ${deletedCount} old items (older than ${daysOld} days)`);
    return { count: deletedCount };
  }

  /**
   * ✅ NEW: Get return refund item retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getRetentionDays(qr);
    const restockEnabled = await this._isRestockEnabled(qr);
    const auditEnabled = await this._isAuditEnabled(qr);

    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalItems = await repo.count();
    const oldItems = await repo
      .createQueryBuilder("returnItem")
      .leftJoin("returnItem.returnRefund", "returnRefund")
      .where("returnItem.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("returnRefund.status = 'processed'")
      .getCount();

    const maxWeight = await this._getMaxWeightKg(qr);
    const maxUnitPrice = await this._getMaxUnitPrice(qr);
    const maxSubtotal = await this._getMaxSubtotal(qr);

    return {
      restockEnabled,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalItems,
      itemsToDelete: oldItems,
      maxWeight,
      maxUnitPrice,
      maxSubtotal,
      auditEnabled,
    };
  }

  /**
   * ✅ NEW: Get items by return refund ID with summary
   * @param {number} returnRefundId
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getItemsByReturn(returnRefundId, qr = null) {
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const repo = this._getRepo(qr, ReturnRefundItem);

    const items = await repo
      .createQueryBuilder("returnItem")
      .leftJoinAndSelect("returnItem.meat", "meat")
      .leftJoinAndSelect("returnItem.batch", "batch")
      .where("returnItem.returnRefundId = :returnRefundId", { returnRefundId })
      .orderBy("returnItem.createdAt", "DESC")
      .getMany();

    const summary = {
      returnRefundId,
      totalItems: items.length,
      totalWeight: 0,
      totalAmount: 0,
      items,
    };

    for (const item of items) {
      summary.totalWeight += item.weightKg;
      summary.totalAmount += item.subtotal;
    }

    return summary;
  }
}

// Singleton instance
const returnRefundItemService = new ReturnRefundItemService();
module.exports = returnRefundItemService;