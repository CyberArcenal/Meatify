// src/services/PurchaseItem.js
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
  "quantity",
  "unitPrice",
  "subtotal",
  "expiryDate",
  "createdAt",
  "updatedAt",
]);

class PurchaseItemService {
  constructor() {
    this.purchaseItemRepository = null;
    this.purchaseRepository = null;
    this.meatRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Purchase = require("../entities/Purchase");
    const Meat = require("../entities/Meat");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.purchaseItemRepository = AppDataSource.getRepository(PurchaseItem);
    this.purchaseRepository = AppDataSource.getRepository(Purchase);
    this.meatRepository = AppDataSource.getRepository(Meat);
    logger.debug("PurchaseItemService initialized");
  }

  async getRepositories() {
    if (!this.purchaseItemRepository) {
      await this.initialize();
    }
    return {
      purchaseItem: this.purchaseItemRepository,
      purchase: this.purchaseRepository,
      meat: this.meatRepository,
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
      `[PurchaseItem._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[PurchaseItem._getRepo] Using global repository (fallback)`);
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
      logger.warn(`[PurchaseItem] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get max quantity from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxQuantity(qr = null) {
    try {
      return await system.getDecimal("max_purchase_quantity", SettingType.INVENTORY, 9999.999);
    } catch (error) {
      logger.warn(`[PurchaseItem] Failed to get max quantity: ${error.message}, defaulting to 9999.999`);
      return 9999.999;
    }
  }

  /**
   * ✅ NEW: Get max unit price from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxUnitPrice(qr = null) {
    try {
      return await system.getDecimal("max_purchase_unit_price", SettingType.INVENTORY, 9999.99);
    } catch (error) {
      logger.warn(`[PurchaseItem] Failed to get max unit price: ${error.message}, defaulting to 9999.99`);
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
      return await system.getDecimal("max_purchase_subtotal", SettingType.INVENTORY, 999999.99);
    } catch (error) {
      logger.warn(`[PurchaseItem] Failed to get max subtotal: ${error.message}, defaulting to 999999.99`);
      return 999999.99;
    }
  }

  /**
   * ✅ NEW: Get item retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRetentionDays(qr = null) {
    try {
      return await system.getInt("purchase_item_retention_days", SettingType.INVENTORY, 730);
    } catch (error) {
      logger.warn(`[PurchaseItem] Failed to get retention days: ${error.message}, defaulting to 730`);
      return 730;
    }
  }

  /**
   * Create a new purchase item
   * @param {Object} data - { purchaseId, meatId, quantity, unitPrice, subtotal, expiryDate? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Purchase = require("../entities/Purchase");
    const Meat = require("../entities/Meat");

    const purchaseItemRepo = this._getRepo(qr, PurchaseItem);
    const purchaseRepo = this._getRepo(qr, Purchase);
    const meatRepo = this._getRepo(qr, Meat);

    try {
      // Validate required fields
      if (!data.purchaseId) throw new Error("purchaseId is required");
      if (!data.meatId) throw new Error("meatId is required");
      if (data.quantity === undefined || data.quantity === null || data.quantity <= 0) {
        throw new Error("quantity must be greater than 0");
      }
      if (data.unitPrice === undefined || data.unitPrice === null || data.unitPrice < 0) {
        throw new Error("unitPrice must be non-negative");
      }

      // ✅ Validate max quantity
      const maxQuantity = await this._getMaxQuantity(qr);
      if (data.quantity > maxQuantity) {
        throw new Error(`Quantity ${data.quantity} exceeds maximum allowed of ${maxQuantity}`);
      }

      // ✅ Validate max unit price
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      if (data.unitPrice > maxUnitPrice) {
        throw new Error(`Unit price ₱${data.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
      }

      // Validate purchase exists
      const purchase = await purchaseRepo.findOne({ where: { id: data.purchaseId } });
      if (!purchase) {
        throw new Error(`Purchase with ID ${data.purchaseId} not found`);
      }

      // ✅ Check if purchase is completed or cancelled
      if (purchase.status === "completed") {
        throw new Error("Cannot add items to a completed purchase");
      }
      if (purchase.status === "cancelled") {
        throw new Error("Cannot add items to a cancelled purchase");
      }

      // Validate meat exists and is active
      const meat = await meatRepo.findOne({ where: { id: data.meatId, isActive: true } });
      if (!meat) {
        throw new Error(`Meat with ID ${data.meatId} not found or inactive`);
      }

      // ✅ Validate expiry date if provided
      let expiryDate = null;
      if (data.expiryDate) {
        expiryDate = new Date(data.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          throw new Error("Invalid expiryDate format");
        }
      }

      // Compute subtotal if not provided
      let subtotal = data.subtotal;
      if (subtotal === undefined || subtotal === null) {
        subtotal = data.quantity * data.unitPrice;
      }

      // ✅ Validate max subtotal
      const maxSubtotal = await this._getMaxSubtotal(qr);
      if (subtotal > maxSubtotal) {
        throw new Error(`Subtotal ₱${subtotal} exceeds maximum allowed of ₱${maxSubtotal}`);
      }

      const purchaseItem = purchaseItemRepo.create({
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal: subtotal,
        expiryDate: expiryDate,
        purchase: purchase,
        meat: meat,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(purchaseItemRepo, purchaseItem, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("PurchaseItem", saved.id, saved, user);
      }

      logger.debug(`PurchaseItem created: #${saved.id} - Meat: ${meat.name}, Qty: ${saved.quantity}`);
      return saved;
    } catch (error) {
      console.error("Failed to create purchase item:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing purchase item (only specific fields allowed)
   * @param {number} id
   * @param {Object} data - { quantity?, unitPrice?, subtotal?, expiryDate? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    try {
      const existing = await repo.findOne({ where: { id }, relations: ["purchase", "meat"] });
      if (!existing) {
        throw new Error(`PurchaseItem with ID ${id} not found`);
      }

      // Prevent changing purchase or meat
      if (data.purchaseId !== undefined || data.meatId !== undefined) {
        throw new Error("Cannot change purchaseId or meatId after creation");
      }

      // ✅ Check if purchase is completed or cancelled
      if (existing.purchase && existing.purchase.status === "completed") {
        throw new Error("Cannot update items from a completed purchase");
      }
      if (existing.purchase && existing.purchase.status === "cancelled") {
        throw new Error("Cannot update items from a cancelled purchase");
      }

      const oldData = { ...existing };

      // ✅ Get max values for validation
      const maxQuantity = await this._getMaxQuantity(qr);
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      const maxSubtotal = await this._getMaxSubtotal(qr);

      // Update fields if provided
      if (data.quantity !== undefined) {
        if (data.quantity <= 0) throw new Error("quantity must be greater than 0");
        if (data.quantity > maxQuantity) {
          throw new Error(`Quantity ${data.quantity} exceeds maximum allowed of ${maxQuantity}`);
        }
        existing.quantity = data.quantity;
        // Recalculate subtotal if unitPrice exists
        existing.subtotal = existing.quantity * existing.unitPrice;
      }
      if (data.unitPrice !== undefined) {
        if (data.unitPrice < 0) throw new Error("unitPrice must be non-negative");
        if (data.unitPrice > maxUnitPrice) {
          throw new Error(`Unit price ₱${data.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
        }
        existing.unitPrice = data.unitPrice;
        existing.subtotal = existing.quantity * existing.unitPrice;
      }
      if (data.subtotal !== undefined) {
        // Allow manual subtotal override, but we recompute if quantity or price changed above
        // If subtotal provided and no quantity/price change, use it
        if (data.quantity === undefined && data.unitPrice === undefined) {
          if (data.subtotal > maxSubtotal) {
            throw new Error(`Subtotal ₱${data.subtotal} exceeds maximum allowed of ₱${maxSubtotal}`);
          }
          existing.subtotal = data.subtotal;
        }
        // If quantity or price changed, the recalculation above will override
      }
      if (data.expiryDate !== undefined) {
        if (data.expiryDate) {
          const expiryDate = new Date(data.expiryDate);
          if (isNaN(expiryDate.getTime())) {
            throw new Error("Invalid expiryDate format");
          }
          existing.expiryDate = expiryDate;
        } else {
          existing.expiryDate = null;
        }
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("PurchaseItem", id, oldData, saved, user);
      }

      logger.debug(`PurchaseItem updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update purchase item:", error.message);
      throw error;
    }
  }

  /**
   * Delete a purchase item (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    const item = await repo.findOne({ where: { id } });
    if (!item) {
      throw new Error(`PurchaseItem with ID ${id} not found`);
    }

    // Optionally check if the purchase is already completed/cancelled to prevent deletion
    const purchaseRepo = this._getRepo(qr, this.purchaseRepository.target);
    const purchase = await purchaseRepo.findOne({ where: { id: item.purchaseId } });
    if (purchase && purchase.status === "completed") {
      throw new Error(`Cannot delete item from a completed purchase`);
    }
    if (purchase && purchase.status === "cancelled") {
      throw new Error(`Cannot delete item from a cancelled purchase`);
    }

    await removeDb(repo, item, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("PurchaseItem", id, item, user);
    }

    logger.debug(`PurchaseItem #${id} permanently deleted`);
  }

  /**
   * Find purchase item by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    const item = await repo
      .createQueryBuilder("purchaseItem")
      .leftJoinAndSelect("purchaseItem.purchase", "purchase")
      .leftJoinAndSelect("purchaseItem.meat", "meat")
      .where("purchaseItem.id = :id", { id })
      .getOne();

    if (!item) {
      throw new Error(`PurchaseItem with ID ${id} not found`);
    }
    await logger.debug("PurchaseItem", id, "system");
    return item;
  }

  /**
   * Find all purchase items with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    const qb = repo
      .createQueryBuilder("purchaseItem")
      .leftJoinAndSelect("purchaseItem.purchase", "purchase")
      .leftJoinAndSelect("purchaseItem.meat", "meat");

    // ✅ Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("purchaseItem.createdAt >= :cutoffDate", { cutoffDate });
    }

    // Filters
    if (options.purchaseId) {
      qb.andWhere("purchaseItem.purchaseId = :purchaseId", { purchaseId: options.purchaseId });
    }
    if (options.meatId) {
      qb.andWhere("purchaseItem.meatId = :meatId", { meatId: options.meatId });
    }
    if (options.minQuantity !== undefined) {
      qb.andWhere("purchaseItem.quantity >= :minQuantity", { minQuantity: options.minQuantity });
    }
    if (options.maxQuantity !== undefined) {
      qb.andWhere("purchaseItem.quantity <= :maxQuantity", { maxQuantity: options.maxQuantity });
    }
    if (options.expiryDateFrom) {
      qb.andWhere("purchaseItem.expiryDate >= :expiryDateFrom", { expiryDateFrom: new Date(options.expiryDateFrom) });
    }
    if (options.expiryDateTo) {
      qb.andWhere("purchaseItem.expiryDate <= :expiryDateTo", { expiryDateTo: new Date(options.expiryDateTo) });
    }
    if (options.search) {
      qb.andWhere(
        "(meat.name LIKE :search OR purchase.referenceNo LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "createdAt";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[PurchaseItem] Invalid sortBy: ${sortBy}, falling back to createdAt`);
      sortBy = "createdAt";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`purchaseItem.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("PurchaseItem", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get purchase item statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    // ✅ Apply retention days filter
    const retentionDays = await this._getRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Total quantity and amount
    const totalResult = await repo
      .createQueryBuilder("purchaseItem")
      .select("SUM(purchaseItem.quantity)", "totalQuantity")
      .addSelect("SUM(purchaseItem.subtotal)", "totalAmount")
      .where("purchaseItem.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();

    // By meat
    const byMeat = await repo
      .createQueryBuilder("purchaseItem")
      .leftJoin("purchaseItem.meat", "meat")
      .select("meat.id", "meatId")
      .addSelect("meat.name", "meatName")
      .addSelect("COUNT(purchaseItem.id)", "count")
      .addSelect("SUM(purchaseItem.quantity)", "totalQuantity")
      .addSelect("SUM(purchaseItem.subtotal)", "totalAmount")
      .where("purchaseItem.createdAt >= :cutoffDate", { cutoffDate })
      .groupBy("meat.id")
      .orderBy("totalAmount", "DESC")
      .limit(5)
      .getRawMany();

    // Items with expiry
    const withExpiry = await repo
      .createQueryBuilder("purchaseItem")
      .where("purchaseItem.expiryDate IS NOT NULL")
      .andWhere("purchaseItem.createdAt >= :cutoffDate", { cutoffDate })
      .getCount();

    // ✅ Get max values from settings
    const maxQuantity = await this._getMaxQuantity(qr);
    const maxUnitPrice = await this._getMaxUnitPrice(qr);
    const maxSubtotal = await this._getMaxSubtotal(qr);

    // ✅ Count items exceeding max quantity
    const exceedingMaxQty = await repo
      .createQueryBuilder("purchaseItem")
      .where("purchaseItem.quantity > :maxQty", { maxQty: maxQuantity })
      .andWhere("purchaseItem.createdAt >= :cutoffDate", { cutoffDate })
      .getCount();

    return {
      totalQuantity: parseFloat(totalResult.totalQuantity) || 0,
      totalAmount: parseFloat(totalResult.totalAmount) || 0,
      topMeats: byMeat,
      itemsWithExpiry: withExpiry,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      maxQuantity,
      maxUnitPrice,
      maxSubtotal,
      exceedingMaxQty,
    };
  }

  /**
   * Export purchase items to CSV or JSON
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
          "Purchase Ref",
          "Meat",
          "Quantity",
          "Unit Price",
          "Subtotal",
          "Expiry Date",
          "Created At",
        ];
        const rows = items.map((i) => [
          i.id,
          i.purchase?.referenceNo ?? "",
          i.meat?.name ?? "",
          i.quantity,
          i.unitPrice,
          i.subtotal,
          i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : "",
          new Date(i.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `purchase_items_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: items,
          filename: `purchase_items_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("PurchaseItem", format, filters, user);
      }

      logger.debug(`Exported ${items.length} purchase items in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export purchase items:", error);
      throw error;
    }
  }

  /**
   * Bulk create purchase items
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
   * Bulk update purchase items
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
   * Import purchase items from CSV file
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
          purchaseId: parseInt(record.purchaseId, 10),
          meatId: parseInt(record.meatId, 10),
          quantity: parseFloat(record.quantity),
          unitPrice: parseFloat(record.unitPrice),
          subtotal: record.subtotal ? parseFloat(record.subtotal) : null,
          expiryDate: record.expiryDate || null,
        };
        if (!data.purchaseId || !data.meatId || !data.quantity || data.unitPrice === undefined) {
          throw new Error("purchaseId, meatId, quantity, and unitPrice are required");
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
   * ✅ NEW: Clean up old purchase items (hard delete)
   * @param {number} daysOld - Delete items older than this (overrides settings)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldItems(daysOld = null, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    // ✅ Use settings if not provided
    if (daysOld === null) {
      daysOld = await this._getRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // ✅ Only delete items from completed purchases
    const oldItems = await repo
      .createQueryBuilder("purchaseItem")
      .leftJoin("purchaseItem.purchase", "purchase")
      .where("purchaseItem.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("purchase.status = 'completed'")
      .getMany();

    if (oldItems.length === 0) {
      logger.info(`[PurchaseItem] No old items to clean up (threshold: ${daysOld} days)`);
      return { count: 0 };
    }

    let deletedCount = 0;
    for (const item of oldItems) {
      try {
        await removeDb(repo, item, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logCreate("PurchaseItem", item.id, item, user);
        }

        deletedCount++;
        logger.debug(`[PurchaseItem] Deleted item #${item.id} (older than ${daysOld} days)`);
      } catch (err) {
        logger.error(`[PurchaseItem] Failed to delete item #${item.id}:`, err);
      }
    }

    logger.info(`[PurchaseItem] Cleaned up ${deletedCount} old items (older than ${daysOld} days)`);
    return { count: deletedCount };
  }

  /**
   * ✅ NEW: Get purchase item retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getRetentionDays(qr);
    const auditEnabled = await this._isAuditEnabled(qr);

    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalItems = await repo.count();
    const oldItems = await repo
      .createQueryBuilder("purchaseItem")
      .leftJoin("purchaseItem.purchase", "purchase")
      .where("purchaseItem.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("purchase.status = 'completed'")
      .getCount();

    const maxQuantity = await this._getMaxQuantity(qr);
    const maxUnitPrice = await this._getMaxUnitPrice(qr);
    const maxSubtotal = await this._getMaxSubtotal(qr);

    return {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalItems,
      itemsToDelete: oldItems,
      maxQuantity,
      maxUnitPrice,
      maxSubtotal,
      auditEnabled,
    };
  }

  /**
   * ✅ NEW: Get items expiring soon (for monitoring)
   * @param {number} daysThreshold - Days before expiry to consider "soon"
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getExpiringSoonItems(daysThreshold = 30, qr = null) {
    const PurchaseItem = require("../entities/PurchaseItem");
    const repo = this._getRepo(qr, PurchaseItem);

    // ✅ Use settings if not provided
    if (daysThreshold === 30) {
      try {
        daysThreshold = await system.getInt("expiry_soon_threshold_days", SettingType.INVENTORY, 30);
      } catch (error) {
        logger.warn(`[PurchaseItem] Failed to get expiry threshold: ${error.message}, defaulting to 30`);
      }
    }

    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysThreshold);

    const items = await repo
      .createQueryBuilder("purchaseItem")
      .leftJoinAndSelect("purchaseItem.purchase", "purchase")
      .leftJoinAndSelect("purchaseItem.meat", "meat")
      .where("purchaseItem.expiryDate IS NOT NULL")
      .andWhere("purchaseItem.expiryDate <= :expiryDate", { expiryDate })
      .andWhere("purchaseItem.expiryDate >= :today", { today })
      .andWhere("purchase.status != 'cancelled'")
      .orderBy("purchaseItem.expiryDate", "ASC")
      .getMany();

    return {
      total: items.length,
      items,
      daysThreshold,
    };
  }
}

// Singleton instance
const purchaseItemService = new PurchaseItemService();
module.exports = purchaseItemService;