// src/services/Meat.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "sku",
  "name",
  "barcode",
  "description",
  "pricePerKg",
  "isActive",
  "createdAt",
  "updatedAt",
]);

class MeatService {
  constructor() {
    this.meatRepository = null;
    this.categoryRepository = null;
    this.supplierRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Meat = require("../entities/Meat");
    const Category = require("../entities/Category");
    const Supplier = require("../entities/Supplier");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    logger.debug("MeatService initialized");
  }

  async getRepositories() {
    if (!this.meatRepository) {
      await this.initialize();
    }
    return {
      meat: this.meatRepository,
      category: this.categoryRepository,
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
      `[Meat._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Meat._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new meat product
   * @param {Object} data - { sku?, name, barcode?, description?, pricePerKg, isActive?, categoryId?, supplierId?, image? }
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Optional transaction query runner
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const Category = require("../entities/Category");
    const Supplier = require("../entities/Supplier");

    const meatRepo = this._getRepo(qr, Meat);
    const categoryRepo = this._getRepo(qr, Category);
    const supplierRepo = this._getRepo(qr, Supplier);

    try {
      // Validate required fields
      if (!data.name) throw new Error("name is required");
      if (data.pricePerKg === undefined || data.pricePerKg === null || data.pricePerKg < 0) {
        throw new Error("pricePerKg must be a non-negative number");
      }

      // Auto-generate SKU if not provided
      let sku = data.sku;
      if (!sku) {
        sku = await this.generateSku(meatRepo);
      } else {
        const existing = await meatRepo.findOne({ where: { sku } });
        if (existing) {
          throw new Error(`SKU "${sku}" already exists`);
        }
      }

      // Validate barcode uniqueness if provided
      if (data.barcode) {
        const existing = await meatRepo.findOne({ where: { barcode: data.barcode } });
        if (existing) {
          throw new Error(`Barcode "${data.barcode}" already exists`);
        }
      }

      // Validate category if provided
      let category = null;
      if (data.categoryId) {
        category = await categoryRepo.findOne({ where: { id: data.categoryId, isActive: true } });
        if (!category) {
          throw new Error(`Category with ID ${data.categoryId} not found or inactive`);
        }
      }

      // Validate supplier if provided
      let supplier = null;
      if (data.supplierId) {
        supplier = await supplierRepo.findOne({ where: { id: data.supplierId, isActive: true } });
        if (!supplier) {
          throw new Error(`Supplier with ID ${data.supplierId} not found or inactive`);
        }
      }

      // Handle image (if any) – you can implement file storage later
      let imagePath = data.image || null;

      const meat = meatRepo.create({
        sku,
        name: data.name,
        barcode: data.barcode || null,
        description: data.description || null,
        pricePerKg: data.pricePerKg,
        isActive: data.isActive !== undefined ? data.isActive : true,
        image: imagePath,
        category: category,
        supplier: supplier,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(meatRepo, meat, { queryRunner: qr });
      await auditLogger.logCreate("Meat", saved.id, saved, user);
      logger.debug(`Meat created: #${saved.id} - ${saved.name} (SKU: ${saved.sku})`);
      return saved;
    } catch (error) {
      console.error("Failed to create meat:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing meat product
   * @param {number} id
   * @param {Object} data - Fields to update
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const Category = require("../entities/Category");
    const Supplier = require("../entities/Supplier");

    const meatRepo = this._getRepo(qr, Meat);
    const categoryRepo = this._getRepo(qr, Category);
    const supplierRepo = this._getRepo(qr, Supplier);

    try {
      const existing = await meatRepo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Meat with ID ${id} not found`);
      }

      const oldData = { ...existing };

      // SKU uniqueness
      if (data.sku && data.sku !== existing.sku) {
        const duplicate = await meatRepo.findOne({ where: { sku: data.sku } });
        if (duplicate) {
          throw new Error(`SKU "${data.sku}" already exists`);
        }
      }

      // Barcode uniqueness
      if (data.barcode && data.barcode !== existing.barcode) {
        const duplicate = await meatRepo.findOne({ where: { barcode: data.barcode } });
        if (duplicate) {
          throw new Error(`Barcode "${data.barcode}" already exists`);
        }
      }

      // Handle category update
      if (data.categoryId !== undefined) {
        if (data.categoryId === null || data.categoryId === "") {
          existing.category = null;
        } else {
          const category = await categoryRepo.findOne({
            where: { id: data.categoryId, isActive: true },
          });
          if (!category) {
            throw new Error(`Category with ID ${data.categoryId} not found or inactive`);
          }
          existing.category = category;
        }
        delete data.categoryId;
      }

      // Handle supplier update
      if (data.supplierId !== undefined) {
        if (data.supplierId === null || data.supplierId === "") {
          existing.supplier = null;
        } else {
          const supplier = await supplierRepo.findOne({
            where: { id: data.supplierId, isActive: true },
          });
          if (!supplier) {
            throw new Error(`Supplier with ID ${data.supplierId} not found or inactive`);
          }
          existing.supplier = supplier;
        }
        delete data.supplierId;
      }

      // Handle image
      if (data.image !== undefined) {
        // You can add file deletion logic here if needed
        existing.image = data.image;
        delete data.image;
      }

      // Apply other fields
      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(meatRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Meat", id, oldData, saved, user);
      logger.debug(`Meat updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update meat:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a meat (set isActive = false)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    try {
      const meat = await meatRepo.findOne({ where: { id } });
      if (!meat) {
        throw new Error(`Meat with ID ${id} not found`);
      }

      if (!meat.isActive) {
        throw new Error(`Meat #${id} is already inactive`);
      }

      const oldData = { ...meat };
      meat.isActive = false;
      meat.updatedAt = new Date();

      const saved = await updateDb(meatRepo, meat, { queryRunner: qr });
      await auditLogger.debugDelete("Meat", id, oldData, user);
      logger.debug(`Meat deactivated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete meat:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted meat (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    try {
      const meat = await meatRepo.findOne({ where: { id } });
      if (!meat) {
        throw new Error(`Meat with ID ${id} not found`);
      }

      if (meat.isActive) {
        throw new Error(`Meat #${id} is already active`);
      }

      const oldData = { ...meat };
      meat.isActive = true;
      meat.updatedAt = new Date();

      const saved = await updateDb(meatRepo, meat, { queryRunner: qr });
      await auditLogger.logUpdate("Meat", id, oldData, saved, user);
      logger.debug(`Meat restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore meat:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a meat (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    const meat = await meatRepo.findOne({ where: { id } });
    if (!meat) {
      throw new Error(`Meat with ID ${id} not found`);
    }

    // Check if there are active batches – prevent deletion if there are any active batches
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);
    const activeBatches = await batchRepo.count({
      where: { meat: { id }, status: "active" },
    });
    if (activeBatches > 0) {
      throw new Error(
        `Cannot delete meat #${id} because it has ${activeBatches} active batch(es). Please deplete or expire them first.`
      );
    }

    // Optionally delete image file if needed

    await removeDb(meatRepo, meat, { queryRunner: qr });
    await auditLogger.debugDelete("Meat", id, meat, user);
    logger.debug(`Meat #${id} permanently deleted`);
  }

  /**
   * Find meat by ID
   * @param {number} id
   * @param {boolean} includeInactive - if true, includes inactive
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeInactive = false, qr = null) {
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    const queryBuilder = meatRepo
      .createQueryBuilder("meat")
      .leftJoinAndSelect("meat.category", "category")
      .leftJoinAndSelect("meat.supplier", "supplier")
      .where("meat.id = :id", { id });

    if (!includeInactive) {
      queryBuilder.andWhere("meat.isActive = true");
    }

    const meat = await queryBuilder.getOne();
    if (!meat) {
      throw new Error(`Meat with ID ${id} not found`);
    }
    await logger.debug("Meat", id, "system");
    return meat;
  }

  /**
   * Find all meats with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    const qb = meatRepo
      .createQueryBuilder("meat")
      .leftJoinAndSelect("meat.category", "category")
      .leftJoinAndSelect("meat.supplier", "supplier");

    // Filters
    if (options.isActive !== undefined) {
      qb.andWhere("meat.isActive = :isActive", { isActive: options.isActive });
    }
    if (options.categoryId) {
      qb.andWhere("category.id = :categoryId", { categoryId: options.categoryId });
    }
    if (options.supplierId) {
      qb.andWhere("supplier.id = :supplierId", { supplierId: options.supplierId });
    }
    if (options.minPrice !== undefined) {
      qb.andWhere("meat.pricePerKg >= :minPrice", { minPrice: options.minPrice });
    }
    if (options.maxPrice !== undefined) {
      qb.andWhere("meat.pricePerKg <= :maxPrice", { maxPrice: options.maxPrice });
    }
    if (options.search) {
      qb.andWhere(
        "(meat.name LIKE :search OR meat.sku LIKE :search OR meat.barcode LIKE :search OR meat.description LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "name";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Meat] Invalid sortBy: ${sortBy}, falling back to name`);
      sortBy = "name";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`meat.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("Meat", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get meat statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    const totalActive = await meatRepo.count({ where: { isActive: true } });
    const totalInactive = await meatRepo.count({ where: { isActive: false } });

    const avgPriceResult = await meatRepo
      .createQueryBuilder("meat")
      .select("AVG(meat.pricePerKg)", "avg")
      .where("meat.isActive = true")
      .getRawOne();
    const avgPrice = parseFloat(avgPriceResult.avg) || 0;

    // Count by category (active meats only)
    const byCategory = await meatRepo
      .createQueryBuilder("meat")
      .leftJoin("meat.category", "category")
      .select("category.id", "categoryId")
      .addSelect("category.name", "categoryName")
      .addSelect("COUNT(*)", "count")
      .where("meat.isActive = true")
      .groupBy("category.id")
      .getRawMany();

    return {
      totalActive,
      totalInactive,
      averagePricePerKg: avgPrice,
      byCategory,
    };
  }

  /**
   * Export meats to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportMeats(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const meats = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "SKU",
          "Name",
          "Barcode",
          "Description",
          "Price Per Kg",
          "Active",
          "Category",
          "Supplier",
          "Created At",
          "Updated At",
        ];
        const rows = meats.map((m) => [
          m.id,
          m.sku,
          m.name,
          m.barcode ?? "",
          m.description ?? "",
          m.pricePerKg,
          m.isActive ? "Yes" : "No",
          m.category?.name ?? "",
          m.supplier?.name ?? "",
          new Date(m.createdAt).toLocaleString(),
          m.updatedAt ? new Date(m.updatedAt).toLocaleString() : "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `meats_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: meats,
          filename: `meats_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      await auditLogger.debugExport("Meat", format, filters, user);
      logger.debug(`Exported ${meats.length} meats in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export meats:", error);
      throw error;
    }
  }

  /**
   * Bulk create meats
   * @param {Array<Object>} meatsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(meatsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of meatsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ meat: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update meats
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
   * Import meats from CSV file
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
          sku: record.sku || null,
          name: record.name,
          barcode: record.barcode || null,
          description: record.description || null,
          pricePerKg: parseFloat(record.pricePerKg),
          isActive: record.isActive !== "false",
          categoryId: record.categoryId ? parseInt(record.categoryId, 10) : null,
          supplierId: record.supplierId ? parseInt(record.supplierId, 10) : null,
        };
        if (!data.name || isNaN(data.pricePerKg)) {
          throw new Error("name and pricePerKg are required");
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
   * Generate a unique SKU
   * @param {import("typeorm").Repository<any>} repo
   * @returns {Promise<string>}
   */
  async generateSku(repo) {
    const prefix = "MEAT";
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(100 + Math.random() * 900);
    let sku = `${prefix}-${datePart}-${randomPart}`;
    let attempts = 0;
    let existing = await repo.findOne({ where: { sku } });
    while (existing && attempts < 5) {
      const newRandom = Math.floor(100 + Math.random() * 900);
      sku = `${prefix}-${datePart}-${newRandom}`;
      existing = await repo.findOne({ where: { sku } });
      attempts++;
    }
    if (existing) {
      sku = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    return sku;
  }
}

// Singleton instance
const meatService = new MeatService();
module.exports = meatService;