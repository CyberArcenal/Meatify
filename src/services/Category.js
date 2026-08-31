// src/services/Category.js
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
   * @param {{ manager: { getRepository: (arg0: any) => any; }; } | null | undefined} qr
   * @param {string | Function | import("typeorm").EntitySchema<{ id: unknown; sku: unknown; name: unknown; image: unknown; barcode: unknown; description: unknown; pricePerKg: unknown; isActive: unknown; createdAt: unknown; updatedAt: unknown; }> | import("typeorm").EntitySchema<{ id: unknown; name: unknown; description: unknown; address: unknown; notes: unknown; isActive: unknown; createdAt: unknown; updatedAt: unknown; }> | import("typeorm").EntitySchema<import("typeorm").ObjectLiteral> | { type: import("typeorm").ObjectLiteral; name: string; } | { type: { id: unknown; sku: unknown; name: unknown; image: unknown; barcode: unknown; description: unknown; pricePerKg: unknown; isActive: unknown; createdAt: unknown; updatedAt: unknown; }; name: string; }} entityClass
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
   * @param {any} id
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

  // ============================================================
  // ✏️ WRITE OPERATIONS (Setters)
  // ============================================================

  /**
   * @param {{ name: string | any[]; isActive: undefined; description: any; }} data
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    try {
      if (!data.name) throw new Error("name is required");

      const maxLength = await this._getMaxNameLength(qr);
      if (data.name.length > maxLength) {
        throw new Error(`Category name cannot exceed ${maxLength} characters`);
      }

      const existing = await repo.findOne({ where: { name: data.name } });
      if (existing) {
        throw new Error(`Category with name "${data.name}" already exists`);
      }

      const defaultActive = await this._getDefaultActiveStatus(qr);
      const isActive =
        data.isActive !== undefined ? data.isActive : defaultActive;

      const category = repo.create({
        name: data.name,
        description: data.description || null,
        isActive: isActive,
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
   * ✅ UPDATE CATEGORY (generic fields only – not isActive)
   * Use updateIsActive for status changes.
   * @param {any} id
   * @param {{ isActive: undefined; name: string | any[]; }} data
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Category with ID ${id} not found`);
      }

      // ❌ Prevent direct isActive updates – use updateIsActive
      if (data.isActive !== undefined && data.isActive !== existing.isActive) {
        throw new Error("Use updateIsActive to update category status");
      }

      const oldData = { ...existing };

      if (data.name && data.name !== existing.name) {
        const maxLength = await this._getMaxNameLength(qr);
        if (data.name.length > maxLength) {
          throw new Error(
            `Category name cannot exceed ${maxLength} characters`,
          );
        }
        const duplicate = await repo.findOne({ where: { name: data.name } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Category with name "${data.name}" already exists`);
        }
      }

      Object.assign(existing, data);
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
   */
  async updateIsActive(id, isActive, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

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
   * ✅ Soft delete (set isActive = false)
   * @param {any} id
   */
  async delete(id, user = "system", qr = null) {
    return this.updateIsActive(id, false, user, qr);
  }

  /**
   * ✅ Restore (set isActive = true)
   * @param {any} id
   */
  async restore(id, user = "system", qr = null) {
    return this.updateIsActive(id, true, user, qr);
  }

  /**
   * ✅ MERGE CATEGORIES – reassign meats from source to target, then deactivate source
   * This is a complex operation that includes data mutation.
   * @param {any} sourceCategoryId
   * @param {any} targetCategoryId
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

    const categoryRepo = this._getRepo(qr, Category);
    const meatRepo = this._getRepo(qr, Meat);

    if (sourceCategoryId === targetCategoryId) {
      throw new Error("Cannot merge a category into itself");
    }

    const sourceCategory = await categoryRepo.findOne({
      where: { id: sourceCategoryId },
    });
    if (!sourceCategory) {
      throw new Error(`Source category with ID ${sourceCategoryId} not found`);
    }

    const targetCategory = await categoryRepo.findOne({
      where: { id: targetCategoryId, isActive: true },
    });
    if (!targetCategory) {
      throw new Error(
        `Target category with ID ${targetCategoryId} not found or inactive`,
      );
    }

    // Get all meats from source category
    const meats = await meatRepo.find({
      where: { category: { id: sourceCategoryId } },
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
          { categoryId: sourceCategoryId },
          { categoryId: targetCategoryId },
          user,
        );
      }

      logger.info(
        `[Category] Reassigned meat #${meat.id} from category #${sourceCategoryId} to #${targetCategoryId}`,
      );
    }

    // Deactivate source category
    await this.updateIsActive(sourceCategoryId, false, user, qr);

    logger.info(
      `[Category] Merged category #${sourceCategoryId} into #${targetCategoryId}. ${meats.length} meat(s) reassigned.`,
    );

    return {
      sourceCategory,
      targetCategory,
      meatsReassigned: meats.length,
    };
  }

  /**
   * ✅ Bulk deactivate categories
   * @param {any} categoryIds
   */
  async bulkDeactivateCategories(categoryIds, user = "system", qr = null) {
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
   * ✅ Permanently delete a category (hard delete) – only if no meats linked
   * @param {any} id
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

  // ============================================================
  // 📊 STATISTICS
  // ============================================================

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
      emptyCategories: emptyCategories.map((/** @type {{ id: any; name: any; }} */ c) => ({ id: c.id, name: c.name })),
      emptyCategoryCount: emptyCategories.length,
    };
  }

  // ============================================================
  // 🔒 PRIVATE HELPERS
  // ============================================================

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

  /**
   * @param {any[]} updatesArray
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
}

// Singleton instance
const categoryService = new CategoryService();
module.exports = categoryService;
