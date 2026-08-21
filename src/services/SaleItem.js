// src/services/SaleItem.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

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
    console.log("SaleItemService initialized");
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
    console.log(
      `[SaleItem._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[SaleItem._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
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

      // Compute lineTotal if not provided
      let lineTotal = data.lineTotal;
      if (lineTotal === undefined || lineTotal === null) {
        const discount = data.discount || 0;
        const tax = data.tax || 0;
        lineTotal = (data.unitPrice * data.weightKg) - discount + tax;
      }

      const saleItem = saleItemRepo.create({
        weightKg: data.weightKg,
        unitPrice: data.unitPrice,
        discount: data.discount || 0,
        tax: data.tax || 0,
        lineTotal: lineTotal,
        sale: sale,
        meat: meat,
        batch: batch,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(saleItemRepo, saleItem, { queryRunner: qr });
      await auditLogger.logCreate("SaleItem", saved.id, saved, user);
      console.log(`SaleItem created: #${saved.id} - Meat: ${meat.name}, Weight: ${saved.weightKg}kg`);
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

      // Update fields if provided
      if (data.weightKg !== undefined) {
        if (data.weightKg <= 0) throw new Error("weightKg must be greater than 0");
        existing.weightKg = data.weightKg;
        // Recalculate lineTotal if unitPrice exists
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.unitPrice !== undefined) {
        if (data.unitPrice < 0) throw new Error("unitPrice must be non-negative");
        existing.unitPrice = data.unitPrice;
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.discount !== undefined) {
        existing.discount = data.discount;
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.tax !== undefined) {
        existing.tax = data.tax;
        existing.lineTotal = (existing.unitPrice * existing.weightKg) - existing.discount + existing.tax;
      }
      if (data.lineTotal !== undefined) {
        // Allow manual lineTotal override if no other fields changed
        if (data.weightKg === undefined && data.unitPrice === undefined && 
            data.discount === undefined && data.tax === undefined) {
          existing.lineTotal = data.lineTotal;
        }
        // Otherwise, the recalculation above will override
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("SaleItem", id, oldData, saved, user);
      console.log(`SaleItem updated: #${id}`);
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
    await auditLogger.logDelete("SaleItem", id, item, user);
    console.log(`SaleItem #${id} permanently deleted`);
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
    await auditLogger.logView("SaleItem", id, "system");
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

    await auditLogger.logView("SaleItem", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get sale item statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const SaleItem = require("../entities/SaleItem");
    const repo = this._getRepo(qr, SaleItem);

    // Total weight and amount
    const totalResult = await repo
      .createQueryBuilder("saleItem")
      .select("SUM(saleItem.weightKg)", "totalWeight")
      .addSelect("SUM(saleItem.lineTotal)", "totalAmount")
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
      .groupBy("meat.id")
      .orderBy("totalAmount", "DESC")
      .limit(5)
      .getRawMany();

    // Average weight per item
    const avgWeightResult = await repo
      .createQueryBuilder("saleItem")
      .select("AVG(saleItem.weightKg)", "avgWeight")
      .getRawOne();

    // Items with discount
    const withDiscount = await repo
      .createQueryBuilder("saleItem")
      .where("saleItem.discount > 0")
      .getCount();

    return {
      totalWeight: parseFloat(totalResult.totalWeight) || 0,
      totalAmount: parseFloat(totalResult.totalAmount) || 0,
      averageWeight: parseFloat(avgWeightResult.avgWeight) || 0,
      topMeats: byMeat,
      itemsWithDiscount: withDiscount,
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
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
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

      await auditLogger.logExport("SaleItem", format, filters, user);
      console.log(`Exported ${items.length} sale items in ${format} format`);
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
}

// Singleton instance
const saleItemService = new SaleItemService();
module.exports = saleItemService;