// src/services/SaleItem.js
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
  "discount",
  "tax",
  "lineTotal",
  "createdAt",
  "updatedAt",
]);

class SaleItemService {
  constructor() {
    this.saleItemRepository = null;
    this.saleRepository = null;
    this.meatRepository = null;
    this.batchRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const SaleItem = require("../entities/SaleItem");
    const Sale = require("../entities/Sale");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.saleItemRepository = AppDataSource.getRepository(SaleItem);
    this.saleRepository = AppDataSource.getRepository(Sale);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.batchRepository = AppDataSource.getRepository(Batch);
    logger.debug("SaleItemService initialized");
  }

  async getRepositories() {
    if (!this.saleItemRepository) {
      await this.initialize();
    }
    return {
      saleItem: this.saleItemRepository,
      sale: this.saleRepository,
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
      `[SaleItem._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[SaleItem._getRepo] Using global repository (fallback)`);
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
      logger.warn(`[SaleItem] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get tax rate from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getTaxRate(qr = null) {
    try {
      return await system.taxRate();
    } catch (error) {
      logger.warn(`[SaleItem] Failed to get tax rate: ${error.message}, defaulting to 0`);
      return 0;
    }
  }

  /**
   * ✅ NEW: Check if discounts are enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isDiscountsEnabled(qr = null) {
    try {
      return await system.enableDiscounts();
    } catch (error) {
      logger.warn(`[SaleItem] Failed to check discounts enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get max discount percent from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxDiscountPercent(qr = null) {
    try {
      return await system.maxDiscountPercent();
    } catch (error) {
      logger.warn(`[SaleItem] Failed to get max discount percent: ${error.message}, defaulting to 20`);
      return 20;
    }
  }

  /**
   * ✅ NEW: Get max weight per item from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxWeightKg(qr = null) {
    try {
      return await system.getDecimal("max_sale_weight_kg", SettingType.SALES, 999.999);
    } catch (error) {
      logger.warn(`[SaleItem] Failed to get max weight: ${error.message}, defaulting to 999.999`);
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
      return await system.getDecimal("max_sale_unit_price", SettingType.SALES, 9999.99);
    } catch (error) {
      logger.warn(`[SaleItem] Failed to get max unit price: ${error.message}, defaulting to 9999.99`);
      return 9999.99;
    }
  }

  /**
   * ✅ NEW: Get max line total from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxLineTotal(qr = null) {
    try {
      return await system.getDecimal("max_sale_line_total", SettingType.SALES, 999999.99);
    } catch (error) {
      logger.warn(`[SaleItem] Failed to get max line total: ${error.message}, defaulting to 999999.99`);
      return 999999.99;
    }
  }

  /**
   * ✅ NEW: Get retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRetentionDays(qr = null) {
    try {
      return await system.getInt("sale_item_retention_days", SettingType.SALES, 730);
    } catch (error) {
      logger.warn(`[SaleItem] Failed to get retention days: ${error.message}, defaulting to 730`);
      return 730;
    }
  }

  /**
   * Create a new sale item
   * @param {Object} data - { saleId, meatId, batchId, weightKg, unitPrice, discount?, tax?, lineTotal? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const SaleItem = require("../entities/SaleItem");
    const Sale = require("../entities/Sale");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");

    const saleItemRepo = this._getRepo(qr, SaleItem);
    const saleRepo = this._getRepo(qr, Sale);
    const meatRepo = this._getRepo(qr, Meat);
    const batchRepo = this._getRepo(qr, Batch);

    try {
      // Validate required fields
      if (!data.saleId) throw new Error("saleId is required");
      if (!data.meatId) throw new Error("meatId is required");
      if (!data.batchId) throw new Error("batchId is required");
      if (data.weightKg === undefined || data.weightKg === null || data.weightKg <= 0) {
        throw new Error("weightKg must be greater than 0");
      }
      if (data.unitPrice === undefined || data.unitPrice === null || data.unitPrice < 0) {
        throw new Error("unitPrice must be non-negative");
      }

      // ✅ Get settings
      const taxRate = await this._getTaxRate(qr);
      const discountsEnabled = await this._isDiscountsEnabled(qr);
      const maxDiscountPercent = await this._getMaxDiscountPercent(qr);
      const maxWeight = await this._getMaxWeightKg(qr);
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      const maxLineTotal = await this._getMaxLineTotal(qr);

      // ✅ Validate max weight
      if (data.weightKg > maxWeight) {
        throw new Error(`Weight ${data.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`);
      }

      // ✅ Validate max unit price
      if (data.unitPrice > maxUnitPrice) {
        throw new Error(`Unit price ₱${data.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
      }

      // Validate sale exists
      const sale = await saleRepo.findOne({ where: { id: data.saleId } });
      if (!sale) {
        throw new Error(`Sale with ID ${data.saleId} not found`);
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

      // ✅ Validate tax
      const tax = data.tax || 0;
      if (tax > taxRate) {
        throw new Error(`Tax ${tax}% exceeds maximum tax rate of ${taxRate}%`);
      }

      // ✅ Validate discount
      const discount = data.discount || 0;
      if (discount > 0) {
        if (!discountsEnabled) {
          throw new Error("Discounts are disabled in system settings");
        }
        const discountPercent = (discount / (data.unitPrice * data.weightKg)) * 100;
        if (discountPercent > maxDiscountPercent) {
          throw new Error(
            `Discount ${discountPercent.toFixed(1)}% exceeds maximum allowed of ${maxDiscountPercent}%`
          );
        }
      }

      // Compute lineTotal if not provided
      let lineTotal = data.lineTotal;
      if (lineTotal === undefined || lineTotal === null) {
        lineTotal = (data.unitPrice * data.weightKg) - discount + tax;
      }

      // ✅ Validate max line total
      if (lineTotal > maxLineTotal) {
        throw new Error(`Line total ₱${lineTotal} exceeds maximum allowed of ₱${maxLineTotal}`);
      }

      const saleItem = saleItemRepo.create({
        weightKg: data.weightKg,
        unitPrice: data.unitPrice,
        discount: discount,
        tax: tax,
        lineTotal: lineTotal,
        sale: sale,
        meat: meat,
        batch: batch,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(saleItemRepo, saleItem, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("SaleItem", saved.id, saved, user);
      }

      logger.debug(`SaleItem created: #${saved.id} - Meat: ${meat.name}, Weight: ${saved.weightKg}kg`);
      return saved;
    } catch (error) {
      console.error("Failed to create sale item:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing sale item (only specific fields allowed)
   * @param {number} id
   * @param {Object} data - { weightKg?, unitPrice?, discount?, tax?, lineTotal? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    try {
      const existing = await repo.findOne({ where: { id }, relations: ["sale", "meat", "batch"] });
      if (!existing) {
        throw new Error(`SaleItem with ID ${id} not found`);
      }

      // Prevent changing sale, meat, or batch
      if (data.saleId !== undefined || data.meatId !== undefined || data.batchId !== undefined) {
        throw new Error("Cannot change saleId, meatId, or batchId after creation");
      }

      const oldData = { ...existing };

      // ✅ Get settings for validation
      const taxRate = await this._getTaxRate(qr);
      const discountsEnabled = await this._isDiscountsEnabled(qr);
      const maxDiscountPercent = await this._getMaxDiscountPercent(qr);
      const maxWeight = await this._getMaxWeightKg(qr);
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      const maxLineTotal = await this._getMaxLineTotal(qr);

      // Update fields if provided
      if (data.weightKg !== undefined) {
        if (data.weightKg <= 0) throw new Error("weightKg must be greater than 0");
        if (data.weightKg > maxWeight) {
          throw new Error(`Weight ${data.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`);
        }
        existing.weightKg = data.weightKg;
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.unitPrice !== undefined) {
        if (data.unitPrice < 0) throw new Error("unitPrice must be non-negative");
        if (data.unitPrice > maxUnitPrice) {
          throw new Error(`Unit price ₱${data.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
        }
        existing.unitPrice = data.unitPrice;
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.discount !== undefined) {
        if (data.discount > 0 && !discountsEnabled) {
          throw new Error("Discounts are disabled in system settings");
        }
        if (data.discount > 0) {
          const discountPercent = (data.discount / (existing.unitPrice * existing.weightKg)) * 100;
          if (discountPercent > maxDiscountPercent) {
            throw new Error(
              `Discount ${discountPercent.toFixed(1)}% exceeds maximum allowed of ${maxDiscountPercent}%`
            );
          }
        }
        existing.discount = data.discount;
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.tax !== undefined) {
        if (data.tax > taxRate) {
          throw new Error(`Tax ${data.tax}% exceeds maximum tax rate of ${taxRate}%`);
        }
        existing.tax = data.tax;
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.lineTotal !== undefined) {
        // Allow manual lineTotal override if no other fields changed
        if (data.weightKg === undefined && data.unitPrice === undefined &&
            data.discount === undefined && data.tax === undefined) {
          if (data.lineTotal > maxLineTotal) {
            throw new Error(`Line total ₱${data.lineTotal} exceeds maximum allowed of ₱${maxLineTotal}`);
          }
          existing.lineTotal = data.lineTotal;
        }
        // Otherwise, the recalculation above will override
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("SaleItem", id, oldData, saved, user);
      }

      logger.debug(`SaleItem updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update sale item:", error.message);
      throw error;
    }
  }

  /**
   * Delete a sale item (hard delete) – use with caution
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    const item = await repo.findOne({ where: { id } });
    if (!item) {
      throw new Error(`SaleItem with ID ${id} not found`);
    }

    // Check if the sale is already paid – prevent deletion of items from paid sales
    const saleRepo = this._getRepo(qr, this.saleRepository.target);
    const sale = await saleRepo.findOne({ where: { id: item.saleId } });
    if (sale && sale.status === "paid") {
      throw new Error(`Cannot delete item from a paid sale. Use state service to refund.`);
    }
    if (sale && sale.status === "refunded") {
      throw new Error(`Cannot delete item from a refunded sale.`);
    }

    await removeDb(repo, item, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("SaleItem", id, item, user);
    }

    logger.debug(`SaleItem #${id} permanently deleted`);
  }

  /**
   * Find sale item by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    const item = await repo
      .createQueryBuilder("saleItem")
      .leftJoinAndSelect("saleItem.sale", "sale")
      .leftJoinAndSelect("saleItem.meat", "meat")
      .leftJoinAndSelect("saleItem.batch", "batch")
      .where("saleItem.id = :id", { id })
      .getOne();

    if (!item) {
      throw new Error(`SaleItem with ID ${id} not found`);
    }
    await logger.debug("SaleItem", id, "system");
    return item;
  }

  /**
   * Find all sale items with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    const qb = repo
      .createQueryBuilder("saleItem")
      .leftJoinAndSelect("saleItem.sale", "sale")
      .leftJoinAndSelect("saleItem.meat", "meat")
      .leftJoinAndSelect("saleItem.batch", "batch");

    // ✅ Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("saleItem.createdAt >= :cutoffDate", { cutoffDate });
    }

    // Filters
    if (options.saleId) {
      qb.andWhere("saleItem.saleId = :saleId", { saleId: options.saleId });
    }
    if (options.meatId) {
      qb.andWhere("saleItem.meatId = :meatId", { meatId: options.meatId });
    }
    if (options.batchId) {
      qb.andWhere("saleItem.batchId = :batchId", { batchId: options.batchId });
    }
    if (options.minWeight !== undefined) {
      qb.andWhere("saleItem.weightKg >= :minWeight", { minWeight: options.minWeight });
    }
    if (options.maxWeight !== undefined) {
      qb.andWhere("saleItem.weightKg <= :maxWeight", { maxWeight: options.maxWeight });
    }
    if (options.minAmount !== undefined) {
      qb.andWhere("saleItem.lineTotal >= :minAmount", { minAmount: options.minAmount });
    }
    if (options.maxAmount !== undefined) {
      qb.andWhere("saleItem.lineTotal <= :maxAmount", { maxAmount: options.maxAmount });
    }
    if (options.startDate) {
      qb.andWhere("saleItem.createdAt >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("saleItem.createdAt <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(meat.name LIKE :search OR CAST(sale.id AS TEXT) LIKE :search OR batch.batchCode LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "createdAt";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[SaleItem] Invalid sortBy: ${sortBy}, falling back to createdAt`);
      sortBy = "createdAt";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`saleItem.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("SaleItem", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get sale item statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    // ✅ Apply retention days filter
    const retentionDays = await this._getRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Total weight and amount
    const totalResult = await repo
      .createQueryBuilder("saleItem")
      .select("SUM(saleItem.weightKg)", "totalWeight")
      .addSelect("SUM(saleItem.lineTotal)", "totalAmount")
      .where("saleItem.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();

    // By meat
    const byMeat = await repo
      .createQueryBuilder("saleItem")
      .leftJoin("saleItem.meat", "meat")
      .select("meat.id", "meatId")
      .addSelect("meat.name", "meatName")
      .addSelect("COUNT(saleItem.id)", "count")
      .addSelect("SUM(saleItem.weightKg)", "totalWeight")
      .addSelect("SUM(saleItem.lineTotal)", "totalAmount")
      .where("saleItem.createdAt >= :cutoffDate", { cutoffDate })
      .groupBy("meat.id")
      .orderBy("totalAmount", "DESC")
      .limit(5)
      .getRawMany();

    // Average weight per item
    const avgWeightResult = await repo
      .createQueryBuilder("saleItem")
      .select("AVG(saleItem.weightKg)", "avgWeight")
      .where("saleItem.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();

    // Items with discount
    const withDiscount = await repo
      .createQueryBuilder("saleItem")
      .where("saleItem.discount > 0")
      .andWhere("saleItem.createdAt >= :cutoffDate", { cutoffDate })
      .getCount();

    // ✅ Get settings info
    const taxRate = await this._getTaxRate(qr);
    const discountsEnabled = await this._isDiscountsEnabled(qr);
    const maxDiscountPercent = await this._getMaxDiscountPercent(qr);
    const maxWeight = await this._getMaxWeightKg(qr);
    const maxUnitPrice = await this._getMaxUnitPrice(qr);
    const maxLineTotal = await this._getMaxLineTotal(qr);

    return {
      totalWeight: parseFloat(totalResult.totalWeight) || 0,
      totalAmount: parseFloat(totalResult.totalAmount) || 0,
      averageWeight: parseFloat(avgWeightResult.avgWeight) || 0,
      topMeats: byMeat,
      itemsWithDiscount: withDiscount,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      taxRate,
      discountsEnabled,
      maxDiscountPercent,
      maxWeight,
      maxUnitPrice,
      maxLineTotal,
    };
  }

  /**
   * Export sale items to CSV or JSON
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
          "Sale ID",
          "Meat",
          "Batch Code",
          "Weight (kg)",
          "Unit Price",
          "Discount",
          "Tax",
          "Line Total",
          "Created At",
        ];
        const rows = items.map((i) => [
          i.id,
          i.sale?.id ?? "",
          i.meat?.name ?? "",
          i.batch?.batchCode ?? "",
          i.weightKg,
          i.unitPrice,
          i.discount,
          i.tax,
          i.lineTotal,
          new Date(i.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `sale_items_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: items,
          filename: `sale_items_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("SaleItem", format, filters, user);
      }

      logger.debug(`Exported ${items.length} sale items in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export sale items:", error);
      throw error;
    }
  }

  /**
   * Bulk create sale items
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
   * Bulk update sale items
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
   * Import sale items from CSV file
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
          saleId: parseInt(record.saleId, 10),
          meatId: parseInt(record.meatId, 10),
          batchId: parseInt(record.batchId, 10),
          weightKg: parseFloat(record.weightKg),
          unitPrice: parseFloat(record.unitPrice),
          discount: record.discount ? parseFloat(record.discount) : 0,
          tax: record.tax ? parseFloat(record.tax) : 0,
          lineTotal: record.lineTotal ? parseFloat(record.lineTotal) : null,
        };
        if (!data.saleId || !data.meatId || !data.batchId || !data.weightKg || data.unitPrice === undefined) {
          throw new Error("saleId, meatId, batchId, weightKg, and unitPrice are required");
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
   * ✅ NEW: Clean up old sale items (hard delete)
   * @param {number} daysOld - Delete items older than this (overrides settings)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldItems(daysOld = null, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    // ✅ Use settings if not provided
    if (daysOld === null) {
      daysOld = await this._getRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // ✅ Only delete items from paid sales (not refunded or voided)
    const oldItems = await repo
      .createQueryBuilder("saleItem")
      .leftJoin("saleItem.sale", "sale")
      .where("saleItem.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("sale.status = 'paid'")
      .getMany();

    if (oldItems.length === 0) {
      logger.info(`[SaleItem] No old items to clean up (threshold: ${daysOld} days)`);
      return { count: 0 };
    }

    let deletedCount = 0;
    for (const item of oldItems) {
      try {
        await removeDb(repo, item, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logCreate("SaleItem", item.id, item, user);
        }

        deletedCount++;
        logger.debug(`[SaleItem] Deleted item #${item.id} (older than ${daysOld} days)`);
      } catch (err) {
        logger.error(`[SaleItem] Failed to delete item #${item.id}:`, err);
      }
    }

    logger.info(`[SaleItem] Cleaned up ${deletedCount} old items (older than ${daysOld} days)`);
    return { count: deletedCount };
  }

  /**
   * ✅ NEW: Get sale item retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getRetentionDays(qr);
    const auditEnabled = await this._isAuditEnabled(qr);

    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalItems = await repo.count();
    const oldItems = await repo
      .createQueryBuilder("saleItem")
      .leftJoin("saleItem.sale", "sale")
      .where("saleItem.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("sale.status = 'paid'")
      .getCount();

    const taxRate = await this._getTaxRate(qr);
    const maxDiscountPercent = await this._getMaxDiscountPercent(qr);

    return {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalItems,
      itemsToDelete: oldItems,
      taxRate,
      maxDiscountPercent,
      auditEnabled,
    };
  }

  /**
   * ✅ NEW: Get sale items by sale ID with summary
   * @param {number} saleId
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getItemsBySale(saleId, qr = null) {
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    const items = await repo
      .createQueryBuilder("saleItem")
      .leftJoinAndSelect("saleItem.meat", "meat")
      .leftJoinAndSelect("saleItem.batch", "batch")
      .where("saleItem.saleId = :saleId", { saleId })
      .orderBy("saleItem.createdAt", "DESC")
      .getMany();

    const summary = {
      saleId,
      totalItems: items.length,
      totalWeight: 0,
      totalAmount: 0,
      totalDiscount: 0,
      totalTax: 0,
      items,
    };

    for (const item of items) {
      summary.totalWeight += item.weightKg;
      summary.totalAmount += item.lineTotal;
      summary.totalDiscount += item.discount || 0;
      summary.totalTax += item.tax || 0;
    }

    return summary;
  }
}

// Singleton instance
const saleItemService = new SaleItemService();
module.exports = saleItemService;