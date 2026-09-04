// src/services/Category.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");
const { validate } = require("../validation");
const {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryMergeSchema,
} = require("../validation/schemas/category.schema");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "name",
  "description",
  "isActive",
  "createdAt",
  "updatedAt",
]);

class CategoryService {
  constructor() {
    this.categoryRepository = null;
    this.meatRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Category = require("../entities/Category");
    const Meat = require("../entities/Meat");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.meatRepository = AppDataSource.getRepository(Meat);
    logger.debug("CategoryService initialized");
  }

  async getRepositories() {
    if (!this.categoryRepository) {
      await this.initialize();
    }
    return {
      category: this.categoryRepository,
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
      `[Category._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Category._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  /**
   * Find category by ID
   * @param {number} id
   * @param {boolean} includeInactive
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeInactive = false, qr = null) {
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    const queryBuilder = repo
      .createQueryBuilder("category")
      .where("category.id = :id", { id });

    if (!includeInactive) {
      queryBuilder.andWhere("category.isActive = true");
    }

    const category = await queryBuilder.getOne();
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return category;
  }

  /**
   * Find all categories with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    const qb = repo.createQueryBuilder("category");

    if (options.isActive !== undefined) {
      qb.andWhere("category.isActive = :isActive", {
        isActive: options.isActive,
      });
    }
    if (options.search) {
      qb.andWhere(
        "(category.name LIKE :search OR category.description LIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    let sortBy = options.sortBy || "name";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      sortBy = "name";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`category.${sortBy}`, sortOrder);

    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    return result;
  }

  /**
   * Get category statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Category = require("../entities/Category");
    const Meat = require("../entities/Meat");

    const categoryRepo = this._getRepo(qr, Category);
    const meatRepo = this._getRepo(qr, Meat);

    const totalActive = await categoryRepo.count({ where: { isActive: true } });
    const totalInactive = await categoryRepo.count({
      where: { isActive: false },
    });

    const categoriesWithMeats = await categoryRepo
      .createQueryBuilder("category")
      .leftJoin("category.meats", "meat")
      .select("category.id", "id")
      .addSelect("category.name", "name")
      .addSelect("COUNT(meat.id)", "meatCount")
      .where("category.isActive = true")
      .groupBy("category.id")
      .orderBy("meatCount", "DESC")
      .getRawMany();

    const totalMeats = await meatRepo.count({
      where: { isActive: true },
    });

    const emptyCategories = await categoryRepo
      .createQueryBuilder("category")
      .leftJoin("category.meats", "meat")
      .select("category.id", "id")
      .addSelect("category.name", "name")
      .addSelect("COUNT(meat.id)", "meatCount")
      .where("category.isActive = true")
      .groupBy("category.id")
      .having("COUNT(meat.id) = 0")
      .getRawMany();

    return {
      totalActive,
      totalInactive,
      totalMeats,
      categoriesWithMeats,
      emptyCategories: emptyCategories.map((c) => ({
        id: c.id,
        name: c.name,
      })),
      emptyCategoryCount: emptyCategories.length,
    };
  }

  /**
   * Export categories to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportCategories(
    format = "json",
    filters = {},
    user = "system",
    qr = null,
  ) {
    try {
      const result = await this.findAll(
        { ...filters, limit: undefined, page: undefined },
        qr,
      );
      const categories = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Name",
          "Description",
          "Active",
          "Created At",
          "Updated At",
        ];
        const rows = categories.map((c) => [
          c.id,
          c.name,
          c.description ?? "",
          c.isActive ? "Yes" : "No",
          new Date(c.createdAt).toLocaleString(),
          c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `categories_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: categories,
          filename: `categories_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Category", format, filters, user);
      }

      logger.debug(
        `Exported ${categories.length} categories in ${format} format`,
      );
      return exportData;
    } catch (error) {
      console.error("Failed to export categories:", error);
      throw error;
    }
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (Setters) - WITH VALIDATION
  // ============================================================

  /**
   * Create a new category
   * @param {Object} data - { name, description?, isActive? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    // ✅ Validate input
    const validated = validate(categoryCreateSchema, data, "Category creation");

    try {
      const { name, description, isActive } = validated;

      // ✅ Check name uniqueness
      const existing = await repo.findOne({ where: { name } });
      if (existing) {
        throw new Error(`Category with name "${name}" already exists`);
      }

      // ✅ Use system setting for default active status
      const defaultActive = await this._getDefaultActiveStatus(qr);
      const finalIsActive = isActive !== undefined ? isActive : defaultActive;

      const category = repo.create({
        name: name,
        description: description || null,
        isActive: finalIsActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(repo, category, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Category", saved.id, saved, user);
      }

      logger.debug(`Category created: #${saved.id} - ${saved.name}`);
      return saved;
    } catch (error) {
      console.error("Failed to create category:", error.message);
      throw error;
    }
  }

  /**
   * Update category (generic fields only – not isActive)
   * Use updateIsActive for status changes.
   * @param {number} id
   * @param {Object} data - { name?, description? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    // ✅ Validate input
    const validated = validate(categoryUpdateSchema, data, "Category update");

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Category with ID ${id} not found`);
      }

      const oldData = { ...existing };

      // Use validated data
      const { name, description, isActive } = validated;

      // ❌ Prevent direct isActive updates – use updateIsActive
      if (isActive !== undefined && isActive !== existing.isActive) {
        throw new Error("Use updateIsActive to update category status");
      }

      // ✅ Update name with uniqueness check
      if (name && name !== existing.name) {
        const duplicate = await repo.findOne({ where: { name: name } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Category with name "${name}" already exists`);
        }
        existing.name = name;
      }

      // ✅ Update description
      if (description !== undefined) {
        existing.description = description;
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Category", id, oldData, saved, user);
      }

      logger.debug(`Category updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update category:", error.message);
      throw error;
    }
  }

  /**
   * ✅ DEDICATED SETTER: Update isActive status
   * Called by state service or directly when status changes
   * @param {number} id
   * @param {boolean} isActive
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateIsActive(id, isActive, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    // ✅ Validate isActive is boolean
    if (typeof isActive !== "boolean") {
      throw new Error("isActive must be a boolean");
    }

    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
      throw new Error(`Category with ID ${id} not found`);
    }

    if (existing.isActive === isActive) {
      logger.debug(`Category #${id} already has isActive=${isActive}`);
      return existing;
    }

    // If deactivating, check for active meats
    if (!isActive) {
      const meatRepo = this._getRepo(qr, this.meatRepository.target);
      const meatCount = await meatRepo.count({
        where: { category: { id }, isActive: true },
      });
      if (meatCount > 0) {
        throw new Error(
          `Cannot deactivate category #${id} because it has ${meatCount} active meat(s). Reassign them first.`,
        );
      }
    }

    const oldData = { isActive: existing.isActive };
    existing.isActive = isActive;
    existing.updatedAt = new Date();

    const saved = await updateDb(repo, existing, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate("Category", id, oldData, saved, user);
    }

    logger.debug(
      `Category #${id} isActive updated: ${oldData.isActive} → ${isActive}`,
    );
    return saved;
  }

  /**
   * Soft delete (set isActive = false)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    return this.updateIsActive(id, false, user, qr);
  }

  /**
   * Restore (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    return this.updateIsActive(id, true, user, qr);
  }

  /**
   * MERGE CATEGORIES – reassign meats from source to target, then deactivate source
   * This is a complex operation that includes data mutation.
   * @param {number} sourceCategoryId
   * @param {number} targetCategoryId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async mergeCategories(
    sourceCategoryId,
    targetCategoryId,
    user = "system",
    qr = null,
  ) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const Meat = require("../entities/Meat");

    // ✅ Validate input
    const validated = validate(
      categoryMergeSchema,
      { sourceCategoryId, targetCategoryId },
      "Category merge",
    );

    const { sourceCategoryId: validSourceId, targetCategoryId: validTargetId } =
      validated;

    const categoryRepo = this._getRepo(qr, Category);
    const meatRepo = this._getRepo(qr, Meat);

    if (validSourceId === validTargetId) {
      throw new Error("Cannot merge a category into itself");
    }

    const sourceCategory = await categoryRepo.findOne({
      where: { id: validSourceId },
    });
    if (!sourceCategory) {
      throw new Error(`Source category with ID ${validSourceId} not found`);
    }

    const targetCategory = await categoryRepo.findOne({
      where: { id: validTargetId, isActive: true },
    });
    if (!targetCategory) {
      throw new Error(
        `Target category with ID ${validTargetId} not found or inactive`,
      );
    }

    // Get all meats from source category
    const meats = await meatRepo.find({
      where: { category: { id: validSourceId } },
    });

    // Reassign meats to target category
    for (const meat of meats) {
      meat.category = targetCategory;
      meat.updatedAt = new Date();
      await updateDb(meatRepo, meat, { queryRunner, skipSignal: false });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate(
          "Meat",
          meat.id,
          { categoryId: validSourceId },
          { categoryId: validTargetId },
          user,
        );
      }

      logger.info(
        `[Category] Reassigned meat #${meat.id} from category #${validSourceId} to #${validTargetId}`,
      );
    }

    // Deactivate source category
    await this.updateIsActive(validSourceId, false, user, qr);

    logger.info(
      `[Category] Merged category #${validSourceId} into #${validTargetId}. ${meats.length} meat(s) reassigned.`,
    );

    return {
      sourceCategory,
      targetCategory,
      meatsReassigned: meats.length,
    };
  }

  /**
   * Bulk deactivate categories
   * @param {number[]} categoryIds
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkDeactivateCategories(categoryIds, user = "system", qr = null) {
    // ✅ Validate array
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      throw new Error("categoryIds must be a non-empty array");
    }

    const results = { deactivated: [], errors: [] };

    for (const categoryId of categoryIds) {
      try {
        const result = await this.updateIsActive(categoryId, false, user, qr);
        results.deactivated.push(result);
      } catch (err) {
        results.errors.push({ categoryId, error: err.message });
      }
    }

    return results;
  }

  /**
   * Permanently delete a category (hard delete) – only if no meats linked
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const Meat = require("../entities/Meat");

    const categoryRepo = this._getRepo(qr, Category);
    const meatRepo = this._getRepo(qr, Meat);

    const category = await categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }

    const meatCount = await meatRepo.count({
      where: { category: { id } },
    });
    if (meatCount > 0) {
      throw new Error(
        `Cannot delete category #${id} because it is used by ${meatCount} meat(s). Reassign them first.`,
      );
    }

    await removeDb(categoryRepo, category, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("Category", id, category, user);
    }

    logger.debug(`Category #${id} permanently deleted`);
  }

  /**
   * Bulk create categories
   * @param {Array<Object>} categoriesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(categoriesArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of categoriesArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ category: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update categories
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
   * Import categories from CSV file
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
          name: record.name,
          description: record.description || null,
          isActive: record.isActive !== "false",
        };
        if (!data.name) {
          throw new Error("name is required");
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
  // 🔒 PRIVATE HELPERS
  // ============================================================

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
        `[Category] Failed to check audit enabled status: ${error.message}, defaulting to true`,
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
        "default_category_active",
        SettingType.INVENTORY,
        true,
      );
    } catch (error) {
      logger.warn(
        `[Category] Failed to get default active status: ${error.message}, defaulting to true`,
      );
      return true;
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
        "max_category_name_length",
        SettingType.INVENTORY,
        100,
      );
    } catch (error) {
      logger.warn(
        `[Category] Failed to get max name length: ${error.message}, defaulting to 100`,
      );
      return 100;
    }
  }
}

// Singleton instance
const categoryService = new CategoryService();
module.exports = categoryService;
