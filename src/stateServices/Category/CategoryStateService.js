// src/stateServices/category/CategoryStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Category = require("../../entities/Category");
const CategoryStatusModule = require("./modules/CategoryStatusModule");
const CategoryNotificationModule = require("./modules/CategoryNotificationModule");
const CategoryAuditModule = require("./modules/CategoryAuditModule");

/**
 * CategoryStateService - Orchestrates side effects for category state changes.
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

    // ─── Initialize modules ──────────────────────────────────────
    this.statusModule = new CategoryStatusModule();
    this.notificationModule = new CategoryNotificationModule();
    this.auditModule = new CategoryAuditModule();
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

    // 1. Broadcast to UI
    this.statusModule.broadcastCreated(category);

    // 2. Audit log
    await this.auditModule.logCreated(categoryId, category, user);
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

    // 1. Broadcast to UI
    this.statusModule.broadcastActivated(category);

    // 2. Audit log
    await this.auditModule.logActivated(categoryId, category, user);

    // 3. Send notification (in-app)
    await this.notificationModule.notifyActivated(category, user, queryRunner);
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
    logger.info(`[CategoryState] ✅ Category #${categoryId} (${category.name}) deactivated by ${user}`);

    // 1. Broadcast to UI
    this.statusModule.broadcastDeactivated(category, options);

    // 2. Audit log
    await this.auditModule.logDeactivated(categoryId, category, options, user);

    // 3. Send notification (in-app)
    await this.notificationModule.notifyDeactivated(category, options, user, queryRunner);
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

    // Prepare data for modules
    const mergeData = {
      sourceCategoryId,
      sourceCategoryName: sourceCategory.name,
      targetCategoryId,
      targetCategoryName: targetCategory.name,
      meatsReassigned,
    };

    // 1. Broadcast to UI
    this.statusModule.broadcastMerged(mergeData);

    // 2. Audit log
    await this.auditModule.logMerged({ sourceCategoryId, targetCategoryId, meatsReassigned }, user);

    // 3. Send notification (in-app)
    await this.notificationModule.notifyMerged(mergeData, user, queryRunner);
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

    // 1. Broadcast to UI
    this.statusModule.broadcastUpdated(categoryId, category.name, changes, category.updatedAt);

    // 2. Audit log
    await this.auditModule.logUpdated(categoryId, changes, category, user);
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

    // 1. Broadcast to UI
    this.statusModule.broadcastDeleted(categoryId, category?.name);

    // 2. Audit log
    await this.auditModule.logDeleted(categoryId, category, user);
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

    // 1. Broadcast to UI
    this.statusModule.broadcastRestored(category);

    // 2. Audit log
    await this.auditModule.logRestored(categoryId, category, user);
  }
}

module.exports = { CategoryStateService };