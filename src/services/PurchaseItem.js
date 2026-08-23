// src/services/PurchaseItem.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
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

      // Validate purchase exists
      const purchase = await purchaseRepo.findOne({ where: { id: data.purchaseId } });
      if (!purchase) {
        throw new Error(`Purchase with ID ${data.purchaseId} not found`);
      }

      // Validate meat exists and is active
      const meat = await meatRepo.findOne({ where: { id: data.meatId, isActive: true } });
      if (!meat) {
        throw new Error(`Meat with ID ${data.meatId} not found or inactive`);
      }

      // Compute subtotal if not provided
      let subtotal = data.subtotal;
      if (subtotal === undefined || subtotal === null) {
        subtotal = data.quantity * data.unitPrice;
      }

      const purchaseItem = purchaseItemRepo.create({
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal: subtotal,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        purchase: purchase,
        meat: meat,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(purchaseItemRepo, purchaseItem, { queryRunner: qr });
      await auditLogger.logCreate("PurchaseItem", saved.id, saved, user);
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

      const oldData = { ...existing };

      // Update fields if provided
      if (data.quantity !== undefined) {
        if (data.quantity <= 0) throw new Error("quantity must be greater than 0");
        existing.quantity = data.quantity;
        // Recalculate subtotal if unitPrice exists
        existing.subtotal = existing.quantity * existing.unitPrice;
      }
      if (data.unitPrice !== undefined) {
        if (data.unitPrice < 0) throw new Error("unitPrice must be non-negative");
        existing.unitPrice = data.unitPrice;
        existing.subtotal = existing.quantity * existing.unitPrice;
      }
      if (data.subtotal !== undefined) {
        // Allow manual subtotal override, but we recompute if quantity or price changed above
        // If subtotal provided and no quantity/price change, use it
        if (data.quantity === undefined && data.unitPrice === undefined) {
          existing.subtotal = data.subtotal;
        }
        // If quantity or price changed, the recalculation above will override
      }
      if (data.expiryDate !== undefined) {
        existing.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("PurchaseItem", id, oldData, saved, user);
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
    await auditLogger.debugDelete("PurchaseItem", id, item, user);
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

    // Total quantity and amount
    const totalResult = await repo
      .createQueryBuilder("purchaseItem")
      .select("SUM(purchaseItem.quantity)", "totalQuantity")
      .addSelect("SUM(purchaseItem.subtotal)", "totalAmount")
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
      .groupBy("meat.id")
      .orderBy("totalAmount", "DESC")
      .limit(5)
      .getRawMany();

    // Items with expiry
    const withExpiry = await repo
      .createQueryBuilder("purchaseItem")
      .where("purchaseItem.expiryDate IS NOT NULL")
      .getCount();

    return {
      totalQuantity: parseFloat(totalResult.totalQuantity) || 0,
      totalAmount: parseFloat(totalResult.totalAmount) || 0,
      topMeats: byMeat,
      itemsWithExpiry: withExpiry,
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
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
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

      await auditLogger.debugExport("PurchaseItem", format, filters, user);
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
}

// Singleton instance
const purchaseItemService = new PurchaseItemService();
module.exports = purchaseItemService;