// src/stateServices/Category.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Category = require("../entities/Category");
const Meat = require("../entities/Meat");
const notificationService = require("../services/Notification");

/**
 * CategoryStateService handles state transitions and side effects for categories.
 * It does NOT contain CRUD operations – those belong to CategoryService.
 * All methods here manage activation/deactivation and related side effects.
 */
class CategoryStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.categoryRepo = dataSource.getRepository(Category);
    this.meatRepo = dataSource.getRepository(Meat);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Activate a category (set isActive = true)
   * @param {number} categoryId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async activate(categoryId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Category);

    const category = await repo.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found`);
    }

    if (category.isActive) {
      logger.warn(`[CategoryState] Category #${categoryId} is already active`);
      return category;
    }

    const oldStatus = category.isActive;
    category.isActive = true;
    category.updatedAt = new Date();

    const updated = await updateDb(repo, category, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Category",
      categoryId,
      { isActive: oldStatus },
      { isActive: true },
      user
    );

    // Side effect: send notification
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Category Activated",
          message: `Category "${category.name}" has been activated.`,
          type: "info",
          metadata: { categoryId: category.id },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CategoryState] Failed to send activation notification for category #${categoryId}:`, err);
    }

    logger.info(`[CategoryState] Category #${categoryId} activated`);
    return updated;
  }

  /**
   * Deactivate a category (set isActive = false) - with optional reassignment
   * @param {number} categoryId
   * @param {Object} options
   * @param {number} [options.reassignToCategoryId] - Optional category to reassign meats to
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async deactivate(
    categoryId,
    options = {},
    user = "system",
    queryRunner = null
  ) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const categoryRepo = this._getRepo(queryRunner, Category);
    const meatRepo = this._getRepo(queryRunner, Meat);

    const category = await categoryRepo.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found`);
    }

    if (!category.isActive) {
      logger.warn(`[CategoryState] Category #${categoryId} is already inactive`);
      return category;
    }

    // Check for meats in this category
    const meats = await meatRepo.find({
      where: { category: { id: categoryId }, isActive: true },
      relations: ["category"],
    });

    // Handle reassignment if there are meats
    if (meats.length > 0) {
      if (options.reassignToCategoryId) {
        const targetCategory = await categoryRepo.findOne({
          where: { id: options.reassignToCategoryId, isActive: true },
        });
        if (!targetCategory) {
          throw new Error(
            `Target category with ID ${options.reassignToCategoryId} not found or inactive`
          );
        }

        // Reassign all meats to target category
        for (const meat of meats) {
          const oldCategoryName = meat.category?.name;
          meat.category = targetCategory;
          meat.updatedAt = new Date();
          await updateDb(meatRepo, meat, { queryRunner, skipSignal: false });

          await auditLogger.logUpdate(
            "Meat",
            meat.id,
            { categoryId: categoryId },
            { categoryId: options.reassignToCategoryId },
            user
          );

          logger.info(
            `[CategoryState] Reassigned meat #${meat.id} from category #${categoryId} to #${options.reassignToCategoryId}`
          );
        }

        // Log the reassignment
        await logger.debug(
          `Reassigned ${meats.length} meat(s) from category "${category.name}" to "${targetCategory.name}"`
        );
      } else {
        // If no reassignment target, prevent deactivation
        throw new Error(
          `Cannot deactivate category #${categoryId} because it has ${meats.length} active meat(s). Provide a reassignToCategoryId or deactivate the meats first.`
        );
      }
    }

    // Deactivate the category
    const oldStatus = category.isActive;
    category.isActive = false;
    category.updatedAt = new Date();

    const updated = await updateDb(categoryRepo, category, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Category",
      categoryId,
      { isActive: oldStatus },
      { isActive: false },
      user
    );

    // Side effect: send notification
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Category Deactivated",
          message: `Category "${category.name}" has been deactivated.${meats.length > 0 ? ` ${meats.length} meat(s) were reassigned.` : ""}`,
          type: "warning",
          metadata: {
            categoryId: category.id,
            meatsReassigned: meats.length,
            reassignToCategoryId: options.reassignToCategoryId || null,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CategoryState] Failed to send deactivation notification for category #${categoryId}:`, err);
    }

    logger.info(`[CategoryState] Category #${categoryId} deactivated`);
    return updated;
  }

  /**
   * Merge a source category into a target category
   * @param {number} sourceCategoryId - Category to merge from (will be deactivated)
   * @param {number} targetCategoryId - Category to merge into (must be active)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async mergeCategories(
    sourceCategoryId,
    targetCategoryId,
    user = "system",
    queryRunner = null
  ) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const categoryRepo = this._getRepo(queryRunner, Category);
    const meatRepo = this._getRepo(queryRunner, Meat);

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
      throw new Error(`Target category with ID ${targetCategoryId} not found or inactive`);
    }

    // Get all meats from source category
    const meats = await meatRepo.find({
      where: { category: { id: sourceCategoryId } },
    });

    // Reassign meats to target category
    for (const meat of meats) {
      const oldCategoryName = meat.category?.name;
      meat.category = targetCategory;
      meat.updatedAt = new Date();
      await updateDb(meatRepo, meat, { queryRunner, skipSignal: false });

      await auditLogger.logUpdate(
        "Meat",
        meat.id,
        { categoryId: sourceCategoryId },
        { categoryId: targetCategoryId },
        user
      );
    }

    // Deactivate source category
    sourceCategory.isActive = false;
    sourceCategory.updatedAt = new Date();
    await updateDb(categoryRepo, sourceCategory, { queryRunner, skipSignal: false });

    // Audit logs
    await logger.debug(
      `Merged category "${sourceCategory.name}" into "${targetCategory.name}". ${meats.length} meat(s) reassigned.`,
      user
    );

    // Side effect: send notification
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Categories Merged",
          message: `Category "${sourceCategory.name}" has been merged into "${targetCategory.name}". ${meats.length} meat(s) were reassigned.`,
          type: "info",
          metadata: {
            sourceCategoryId,
            targetCategoryId,
            meatsReassigned: meats.length,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CategoryState] Failed to send merge notification:`, err);
    }

    logger.info(
      `[CategoryState] Merged category #${sourceCategoryId} into #${targetCategoryId}. ${meats.length} meat(s) reassigned.`
    );

    return {
      sourceCategory,
      targetCategory,
      meatsReassigned: meats.length,
    };
  }

  /**
   * Bulk deactivate categories with optional reassignment
   * @param {Array<number>} categoryIds
   * @param {Object} options
   * @param {number} [options.reassignToCategoryId]
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async bulkDeactivateCategories(
    categoryIds,
    options = {},
    user = "system",
    queryRunner = null
  ) {
    const results = { deactivated: [], errors: [] };

    for (const categoryId of categoryIds) {
      try {
        const result = await this.deactivate(categoryId, options, user, queryRunner);
        results.deactivated.push(result);
      } catch (err) {
        results.errors.push({ categoryId, error: err.message });
      }
    }

    return results;
  }
}

module.exports = { CategoryStateService };