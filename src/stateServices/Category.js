// src/stateServices/CategoryStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Category = require("../entities/Category");
const system = require("../utils/system");

/**
 * CategoryStateService handles side effects for category state changes.
 * It does NOT perform CRUD updates – those belong to CategoryService.
 * All methods here are event handlers (onActivated, onDeactivated, onMerged, etc.)
 * and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 */
class CategoryStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.categoryRepo = dataSource.getRepository(Category);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Send event to all renderer windows (UI)
   * @param {string} channel
   * @param {any} data
   */
  _sendToRenderers(channel, data) {
    try {
      const { BrowserWindow } = require("electron");
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, data);
        }
      });
    } catch (error) {
      logger.warn(
        "[CategoryState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
  }

  // ============================================================
  // 🔄 STATE TRANSITION SIDE EFFECTS (on...)
  // ============================================================

  /**
   * Side effect after a category is created
   * Called from CategorySubscriber.afterInsert
   * @param {number} categoryId
   * @param {Category} category
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreate(categoryId, category, user = "system", queryRunner = null) {
    logger.info(`[CategoryState] ✅ Category #${categoryId} (${category.name}) created by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("category:created", {
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt,
    });

    // Audit log (already logged in service, but we can add extra context)
    await auditLogger.logCreate("Category", categoryId, category, user);
  }

  /**
   * Side effect after a category is activated
   * Called from CategorySubscriber.afterUpdate
   * @param {number} categoryId
   * @param {Category} category
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onActivated(categoryId, category, user = "system", queryRunner = null) {
    logger.info(`[CategoryState] ✅ Category #${categoryId} (${category.name}) activated by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("category:activated", {
      id: category.id,
      name: category.name,
      activatedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Category",
      categoryId,
      { action: "activated" },
      { isActive: true },
      user
    );

    // Send notification (in-app)
    try {
      const notificationService = require("../services/Notification");
      await notificationService.create(
        {
          userId: 1,
          title: "Category Activated",
          message: `Category "${category.name}" has been activated.`,
          type: "info",
          metadata: {
            categoryId: category.id,
            categoryName: category.name,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CategoryState] Failed to send activation notification:`, err);
    }
  }

  /**
   * Side effect after a category is deactivated
   * Called from CategorySubscriber.afterUpdate
   * @param {number} categoryId
   * @param {Category} category
   * @param {Object} options
   * @param {number} [options.reassignedCount] - Number of meats reassigned
   * @param {number} [options.reassignedToCategoryId] - Target category ID
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeactivated(categoryId, category, options = {}, user = "system", queryRunner = null) {
    const { reassignedCount = 0, reassignedToCategoryId = null } = options;

    logger.info(`[CategoryState] ✅ Category #${categoryId} (${category.name}) deactivated by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("category:deactivated", {
      id: category.id,
      name: category.name,
      reassignedCount,
      reassignedToCategoryId,
      deactivatedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Category",
      categoryId,
      { action: "deactivated", reassignedCount },
      { isActive: false },
      user
    );

    // Send notification (in-app)
    try {
      const notificationService = require("../services/Notification");
      const message = `Category "${category.name}" has been deactivated.` +
        (reassignedCount > 0 ? ` ${reassignedCount} meat(s) were reassigned.` : "");

      await notificationService.create(
        {
          userId: 1,
          title: "Category Deactivated",
          message,
          type: "warning",
          metadata: {
            categoryId: category.id,
            categoryName: category.name,
            reassignedCount,
            reassignedToCategoryId,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CategoryState] Failed to send deactivation notification:`, err);
    }
  }

  /**
   * Side effect after categories are merged
   * Called from CategorySubscriber.afterUpdate or directly from CategoryService
   * @param {Object} data
   * @param {number} data.sourceCategoryId
   * @param {Category} data.sourceCategory
   * @param {number} data.targetCategoryId
   * @param {Category} data.targetCategory
   * @param {number} data.meatsReassigned
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMerged(data, user = "system", queryRunner = null) {
    const { sourceCategoryId, sourceCategory, targetCategoryId, targetCategory, meatsReassigned } = data;

    logger.info(
      `[CategoryState] ✅ Categories merged: #${sourceCategoryId} (${sourceCategory.name}) → #${targetCategoryId} (${targetCategory.name}) by ${user}`
    );

    // Broadcast to UI
    this._sendToRenderers("category:merged", {
      sourceCategoryId,
      sourceCategoryName: sourceCategory.name,
      targetCategoryId,
      targetCategoryName: targetCategory.name,
      meatsReassigned,
      mergedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Category",
      sourceCategoryId,
      { action: "merged", targetCategoryId, meatsReassigned },
      { isActive: false },
      user
    );

    // Send notification (in-app)
    try {
      const notificationService = require("../services/Notification");
      await notificationService.create(
        {
          userId: 1,
          title: "Categories Merged",
          message: `Category "${sourceCategory.name}" has been merged into "${targetCategory.name}". ${meatsReassigned} meat(s) were reassigned.`,
          type: "info",
          metadata: {
            sourceCategoryId,
            sourceCategoryName: sourceCategory.name,
            targetCategoryId,
            targetCategoryName: targetCategory.name,
            meatsReassigned,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CategoryState] Failed to send merge notification:`, err);
    }
  }

  /**
   * Side effect after a category is updated (generic)
   * Called from CategorySubscriber.afterUpdate for other changes
   * @param {number} categoryId
   * @param {Category} category
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdate(categoryId, category, changes, user = "system", queryRunner = null) {
    logger.info(`[CategoryState] ✅ Category #${categoryId} (${category.name}) updated (fields: ${Object.keys(changes).join(", ")})`);

    // Broadcast to UI
    this._sendToRenderers("category:updated", {
      id: category.id,
      name: category.name,
      changes,
      updatedAt: category.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Category",
      categoryId,
      changes,
      category,
      user
    );
  }

  /**
   * Side effect after a category is soft-deleted
   * Called from CategorySubscriber.afterRemove
   * @param {number} categoryId
   * @param {Category} category
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDelete(categoryId, category, user = "system", queryRunner = null) {
    logger.info(`[CategoryState] ✅ Category #${categoryId} (${category?.name}) soft-deleted by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("category:deleted", {
      id: categoryId,
      name: category?.name,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate("Category", categoryId, category, user);
  }

  /**
   * Side effect after a category is restored
   * @param {number} categoryId
   * @param {Category} category
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRestore(categoryId, category, user = "system", queryRunner = null) {
    logger.info(`[CategoryState] ✅ Category #${categoryId} (${category.name}) restored by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("category:restored", {
      id: category.id,
      name: category.name,
      restoredAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Category",
      categoryId,
      { action: "restored" },
      { isActive: true },
      user
    );
  }
}

module.exports = { CategoryStateService };