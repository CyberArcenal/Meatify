// src/services/Meat.js
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
   * Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(
        `[Meat] Failed to check audit enabled status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get default active status from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _getDefaultActiveStatus(qr = null) {
    try {
      return await system.getBool(
        "default_meat_active",
        SettingType.INVENTORY,
        true,
      );
    } catch (error) {
      logger.warn(
        `[Meat] Failed to get default active status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get SKU prefix from settings or company name
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _getSkuPrefix(qr = null) {
    try {
      const prefix = await system.getValue(
        "meat_sku_prefix",
        SettingType.INVENTORY,
        null,
      );
      if (prefix && prefix.trim()) {
        return prefix.trim().toUpperCase();
      }
      const company = await system.companyName();
      return company.substring(0, 4).toUpperCase() || "MEAT";
    } catch (error) {
      logger.warn(
        `[Meat] Failed to get SKU prefix: ${error.message}, defaulting to "MEAT"`,
      );
      return "MEAT";
    }
  }

  /**
   * Get max price per kg from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxPrice(qr = null) {
    try {
      return await system.getDecimal(
        "max_price_per_kg",
        SettingType.SALES,
        9999.99,
      );
    } catch (error) {
      logger.warn(
        `[Meat] Failed to get max price: ${error.message}, defaulting to 9999.99`,
      );
      return 9999.99;
    }
  }

  /**
   * Get max name length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNameLength(qr = null) {
    try {
      return await system.getInt(
        "max_meat_name_length",
        SettingType.INVENTORY,
        100,
      );
    } catch (error) {
      logger.warn(
        `[Meat] Failed to get max name length: ${error.message}, defaulting to 100`,
      );
      return 100;
    }
  }

  /**
   * Get max description length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxDescriptionLength(qr = null) {
    try {
      return await system.getInt(
        "max_meat_description_length",
        SettingType.INVENTORY,
        500,
      );
    } catch (error) {
      logger.warn(
        `[Meat] Failed to get max description length: ${error.message}, defaulting to 500`,
      );
      return 500;
    }
  }

  /**
   * Validate barcode format
   * @param {string} barcode
   * @returns {boolean}
   */
  _isValidBarcode(barcode) {
    if (!barcode) return true;
    return (
      barcode.length >= 4 && barcode.length <= 20 && /^[\d\-]+$/.test(barcode)
    );
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

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
      qb.andWhere("category.id = :categoryId", {
        categoryId: options.categoryId,
      });
    }
    if (options.supplierId) {
      qb.andWhere("supplier.id = :supplierId", {
        supplierId: options.supplierId,
      });
    }
    if (options.minPrice !== undefined) {
      qb.andWhere("meat.pricePerKg >= :minPrice", {
        minPrice: options.minPrice,
      });
    }
    if (options.maxPrice !== undefined) {
      qb.andWhere("meat.pricePerKg <= :maxPrice", {
        maxPrice: options.maxPrice,
      });
    }
    if (options.search) {
      qb.andWhere(
        "(meat.name LIKE :search OR meat.sku LIKE :search OR meat.barcode LIKE :search OR meat.description LIKE :search)",
        { search: `%${options.search}%` },
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

    const maxPriceAllowed = await this._getMaxPrice(qr);

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

    const aboveMaxPrice = await meatRepo
      .createQueryBuilder("meat")
      .where("meat.pricePerKg > :maxPrice", { maxPrice: maxPriceAllowed })
      .andWhere("meat.isActive = true")
      .getCount();

    const noCategory = await meatRepo
      .createQueryBuilder("meat")
      .where("meat.categoryId IS NULL")
      .andWhere("meat.isActive = true")
      .getCount();

    return {
      totalActive,
      totalInactive,
      averagePricePerKg: avgPrice,
      maxPriceAllowed,
      aboveMaxPrice,
      noCategory,
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
      const result = await this.findAll(
        { ...filters, limit: undefined, page: undefined },
        qr,
      );
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

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Meat", format, filters, user);
      }

      logger.debug(`Exported ${meats.length} meats in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export meats:", error);
      throw error;
    }
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (CRUD)
  // ============================================================

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
      if (
        data.pricePerKg === undefined ||
        data.pricePerKg === null ||
        data.pricePerKg < 0
      ) {
        throw new Error("pricePerKg must be a non-negative number");
      }

      // Validate name length
      const maxNameLength = await this._getMaxNameLength(qr);
      if (data.name.length > maxNameLength) {
        throw new Error(`Meat name cannot exceed ${maxNameLength} characters`);
      }

      // Validate description length
      if (data.description) {
        const maxDescLength = await this._getMaxDescriptionLength(qr);
        if (data.description.length > maxDescLength) {
          throw new Error(
            `Description cannot exceed ${maxDescLength} characters`,
          );
        }
      }

      // Validate max price
      const maxPrice = await this._getMaxPrice(qr);
      if (data.pricePerKg > maxPrice) {
        throw new Error(
          `Price ₱${data.pricePerKg} exceeds maximum allowed of ₱${maxPrice}`,
        );
      }

      // Validate barcode format
      if (data.barcode && !this._isValidBarcode(data.barcode)) {
        throw new Error(`Invalid barcode format: "${data.barcode}"`);
      }

      // Auto-generate SKU if not provided
      let sku = data.sku;
      if (!sku) {
        const prefix = await this._getSkuPrefix(qr);
        sku = await this.generateSku(meatRepo, prefix);
      } else {
        const existing = await meatRepo.findOne({ where: { sku } });
        if (existing) {
          throw new Error(`SKU "${sku}" already exists`);
        }
      }

      // Validate barcode uniqueness if provided
      if (data.barcode) {
        const existing = await meatRepo.findOne({
          where: { barcode: data.barcode },
        });
        if (existing) {
          throw new Error(`Barcode "${data.barcode}" already exists`);
        }
      }

      // Validate category if provided
      let category = null;
      if (data.categoryId) {
        category = await categoryRepo.findOne({
          where: { id: data.categoryId, isActive: true },
        });
        if (!category) {
          throw new Error(
            `Category with ID ${data.categoryId} not found or inactive`,
          );
        }
      }

      // Validate supplier if provided
      let supplier = null;
      if (data.supplierId) {
        supplier = await supplierRepo.findOne({
          where: { id: data.supplierId, isActive: true },
        });
        if (!supplier) {
          throw new Error(
            `Supplier with ID ${data.supplierId} not found or inactive`,
          );
        }
      }

      // Use system setting for default active status
      const defaultActive = await this._getDefaultActiveStatus(qr);
      const isActive =
        data.isActive !== undefined ? data.isActive : defaultActive;

      let imagePath = data.image || null;

      const meat = meatRepo.create({
        sku,
        name: data.name,
        barcode: data.barcode || null,
        description: data.description || null,
        pricePerKg: data.pricePerKg,
        isActive: isActive,
        image: imagePath,
        category: category,
        supplier: supplier,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(meatRepo, meat, { queryRunner: qr });

      // Audit log for creation
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Meat", saved.id, saved, user);
      }

      logger.debug(
        `Meat created: #${saved.id} - ${saved.name} (SKU: ${saved.sku})`,
      );
      return saved;
    } catch (error) {
      console.error("Failed to create meat:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing meat product (basic fields only – not isActive or pricePerKg)
   * Use dedicated methods for status and price changes.
   * @param {number} id
   * @param {Object} data - Fields to update (name, description, barcode, categoryId, supplierId, image)
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

      // Prevent direct update of isActive or pricePerKg – use dedicated methods
      if (data.isActive !== undefined && data.isActive !== existing.isActive) {
        throw new Error("Use MeatStateService to update isActive status");
      }
      if (
        data.pricePerKg !== undefined &&
        data.pricePerKg !== existing.pricePerKg
      ) {
        throw new Error("Use updatePrice method to update pricePerKg");
      }

      // Validate name length if changed
      if (data.name) {
        const maxNameLength = await this._getMaxNameLength(qr);
        if (data.name.length > maxNameLength) {
          throw new Error(
            `Meat name cannot exceed ${maxNameLength} characters`,
          );
        }
      }

      // Validate description length if changed
      if (data.description) {
        const maxDescLength = await this._getMaxDescriptionLength(qr);
        if (data.description.length > maxDescLength) {
          throw new Error(
            `Description cannot exceed ${maxDescLength} characters`,
          );
        }
      }

      // SKU uniqueness (if changed)
      if (data.sku && data.sku !== existing.sku) {
        const duplicate = await meatRepo.findOne({ where: { sku: data.sku } });
        if (duplicate) {
          throw new Error(`SKU "${data.sku}" already exists`);
        }
      }

      // Barcode uniqueness (if changed)
      if (data.barcode && data.barcode !== existing.barcode) {
        if (!this._isValidBarcode(data.barcode)) {
          throw new Error(`Invalid barcode format: "${data.barcode}"`);
        }
        const duplicate = await meatRepo.findOne({
          where: { barcode: data.barcode },
        });
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
            throw new Error(
              `Category with ID ${data.categoryId} not found or inactive`,
            );
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
            throw new Error(
              `Supplier with ID ${data.supplierId} not found or inactive`,
            );
          }
          existing.supplier = supplier;
        }
        delete data.supplierId;
      }

      // Handle image
      if (data.image !== undefined) {
        existing.image = data.image;
        delete data.image;
      }

      // Apply other fields
      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(meatRepo, existing, { queryRunner: qr });

      // Audit log for update
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Meat", id, oldData, saved, user);
      }

      logger.debug(`Meat updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update meat:", error.message);
      throw error;
    }
  }

  /**
   * ✅ DEDICATED SETTER: Update isActive status
   * @param {number} id
   * @param {boolean} isActive
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateIsActive(id, isActive, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    const existing = await meatRepo.findOne({ where: { id } });
    if (!existing) {
      throw new Error(`Meat with ID ${id} not found`);
    }

    if (existing.isActive === isActive) {
      logger.debug(`Meat #${id} already has isActive=${isActive}`);
      return existing;
    }

    // If deactivating, check for active batches
    if (!isActive) {
      const Batch = require("../entities/Batch");
      const batchRepo = this._getRepo(qr, Batch);
      const activeBatches = await batchRepo.count({
        where: { meat: { id }, status: "active" },
      });
      if (activeBatches > 0) {
        throw new Error(
          `Cannot deactivate meat #${id} because it has ${activeBatches} active batch(es). Please deplete or expire them first.`,
        );
      }
    }

    const oldData = { isActive: existing.isActive };
    existing.isActive = isActive;
    existing.updatedAt = new Date();

    const saved = await updateDb(meatRepo, existing, { queryRunner: qr });

    // Audit log for status change
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate("Meat", id, oldData, saved, user);
    }

    logger.debug(
      `Meat #${id} isActive updated: ${oldData.isActive} → ${isActive}`,
    );
    return saved;
  }

  /**
   * Activate a meat product (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async activate(id, user = "system", qr = null) {
    return this.updateIsActive(id, true, user, qr);
  }

  /**
   * Deactivate a meat product (set isActive = false)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async deactivate(id, user = "system", qr = null) {
    return this.updateIsActive(id, false, user, qr);
  }

  /**
   * ✅ DEDICATED SETTER: Update price
   * @param {number} id
   * @param {number} newPrice
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updatePrice(id, newPrice, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    if (newPrice < 0) {
      throw new Error("Price cannot be negative");
    }

    const maxPrice = await this._getMaxPrice(qr);
    if (newPrice > maxPrice) {
      throw new Error(
        `Price ₱${newPrice} exceeds maximum allowed of ₱${maxPrice}`,
      );
    }

    const existing = await meatRepo.findOne({ where: { id } });
    if (!existing) {
      throw new Error(`Meat with ID ${id} not found`);
    }

    const oldData = { pricePerKg: existing.pricePerKg };
    existing.pricePerKg = newPrice;
    existing.updatedAt = new Date();

    const saved = await updateDb(meatRepo, existing, { queryRunner: qr });

    // Audit log for price change
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate("Meat", id, oldData, saved, user);
    }

    logger.debug(
      `Meat #${id} price updated: ${oldData.pricePerKg} → ${newPrice}`,
    );
    return saved;
  }

  /**
   * Bulk price update with validation
   * @param {Array<{ id: number, price: number }>} updates
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkPriceUpdate(updates, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    const maxPrice = await this._getMaxPrice(qr);

    for (const { id, price } of updates) {
      try {
        if (price < 0) {
          throw new Error("Price cannot be negative");
        }
        if (price > maxPrice) {
          throw new Error(
            `Price ₱${price} exceeds maximum allowed of ₱${maxPrice}`,
          );
        }

        const saved = await this.updatePrice(id, price, user, qr);
        results.updated.push(saved);
      } catch (err) {
        results.errors.push({ id, price, error: err.message });
      }
    }

    logger.info(
      `[Meat] Bulk price update: ${results.updated.length} updated, ${results.errors.length} errors`,
    );
    return results;
  }

  /**
   * Soft delete a meat (set isActive = false) – use updateIsActive
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    return this.updateIsActive(id, false, user, qr);
  }

  /**
   * Restore a soft-deleted meat (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    return this.updateIsActive(id, true, user, qr);
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

    // Check if there are active batches – prevent deletion
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);
    const activeBatches = await batchRepo.count({
      where: { meat: { id }, status: "active" },
    });
    if (activeBatches > 0) {
      throw new Error(
        `Cannot delete meat #${id} because it has ${activeBatches} active batch(es). Please deplete or expire them first.`,
      );
    }

    await removeDb(meatRepo, meat, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("Meat", id, meat, user);
    }

    logger.debug(`Meat #${id} permanently deleted`);
  }

  // ============================================================
  // 📤 BULK & IMPORT OPERATIONS
  // ============================================================

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
          categoryId: record.categoryId
            ? parseInt(record.categoryId, 10)
            : null,
          supplierId: record.supplierId
            ? parseInt(record.supplierId, 10)
            : null,
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

  // ============================================================
  // 🧹 CLEANUP & HELPERS
  // ============================================================

  /**
   * Clean up inactive meats (hard delete)
   * @param {number} daysOld - Inactive for this many days
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanInactiveMeats(daysOld = 365, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    if (daysOld === 365) {
      try {
        daysOld = await system.getInt(
          "inactive_meat_cleanup_days",
          SettingType.INVENTORY,
          365,
        );
      } catch (error) {
        logger.warn(
          `[Meat] Failed to get inactive cleanup days: ${error.message}, defaulting to 365`,
        );
      }
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const inactiveMeats = await meatRepo
      .createQueryBuilder("meat")
      .where("meat.isActive = false")
      .andWhere("meat.updatedAt < :cutoffDate", { cutoffDate })
      .getMany();

    let deletedCount = 0;
    for (const meat of inactiveMeats) {
      try {
        const Batch = require("../entities/Batch");
        const batchRepo = this._getRepo(qr, Batch);
        const batchCount = await batchRepo.count({
          where: { meat: { id: meat.id } },
        });

        if (batchCount > 0) {
          logger.debug(
            `[Meat] Skipping meat #${meat.id} (${meat.name}) - has ${batchCount} batches`,
          );
          continue;
        }

        await removeDb(meatRepo, meat, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logCreate("Meat", meat.id, meat, user);
        }

        deletedCount++;
        logger.info(
          `[Meat] Permanently deleted inactive meat #${meat.id} (${meat.name})`,
        );
      } catch (err) {
        logger.error(`[Meat] Failed to clean inactive meat #${meat.id}:`, err);
      }
    }

    logger.info(
      `[Meat] Cleaned up ${deletedCount} inactive meats (older than ${daysOld} days)`,
    );
    return { count: deletedCount };
  }

  /**
   * Get meat health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const Meat = require("../entities/Meat");
    const meatRepo = this._getRepo(qr, Meat);

    const totalActive = await meatRepo.count({ where: { isActive: true } });
    const totalInactive = await meatRepo.count({ where: { isActive: false } });

    const maxPrice = await this._getMaxPrice(qr);

    const aboveMaxPrice = await meatRepo
      .createQueryBuilder("meat")
      .where("meat.pricePerKg > :maxPrice", { maxPrice })
      .andWhere("meat.isActive = true")
      .getCount();

    const noCategory = await meatRepo
      .createQueryBuilder("meat")
      .where("meat.categoryId IS NULL")
      .andWhere("meat.isActive = true")
      .getCount();

    const noSupplier = await meatRepo
      .createQueryBuilder("meat")
      .where("meat.supplierId IS NULL")
      .andWhere("meat.isActive = true")
      .getCount();

    const noBarcode = await meatRepo
      .createQueryBuilder("meat")
      .where("meat.barcode IS NULL")
      .andWhere("meat.isActive = true")
      .getCount();

    const priceStats = await meatRepo
      .createQueryBuilder("meat")
      .select("MIN(meat.pricePerKg)", "min")
      .addSelect("MAX(meat.pricePerKg)", "max")
      .where("meat.isActive = true")
      .getRawOne();

    return {
      totalActive,
      totalInactive,
      aboveMaxPrice,
      noCategory,
      noSupplier,
      noBarcode,
      priceRange: {
        min: parseFloat(priceStats.min) || 0,
        max: parseFloat(priceStats.max) || 0,
      },
      maxPriceAllowed: maxPrice,
      healthScore:
        totalActive > 0
          ? Math.round(
              ((totalActive - aboveMaxPrice - noCategory - noSupplier) /
                totalActive) *
                100,
            )
          : 100,
    };
  }

  /**
   * Generate a unique SKU
   * @param {import("typeorm").Repository<any>} repo
   * @param {string} prefix - Optional prefix (defaults to "MEAT")
   * @returns {Promise<string>}
   */
  async generateSku(repo, prefix = "MEAT") {
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
