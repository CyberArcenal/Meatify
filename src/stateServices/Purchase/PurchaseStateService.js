// src/stateServices/purchase/PurchaseStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Purchase = require("../../entities/Purchase");
const PurchaseItem = require("../../entities/PurchaseItem");
const PurchaseCreatedModule = require("./modules/status/PurchaseCreatedModule");
const PurchaseApprovedModule = require("./modules/status/PurchaseApprovedModule");
const PurchaseCompletedModule = require("./modules/status/PurchaseCompletedModule");
const PurchaseCancelledModule = require("./modules/status/PurchaseCancelledModule");
const PurchaseUpdatedModule = require("./modules/status/PurchaseUpdatedModule");
const PurchaseDeletedModule = require("./modules/status/PurchaseDeletedModule");
const PurchaseNotificationModule = require("./modules/PurchaseNotificationModule");
const PurchaseStatusModule = require("./modules/PurchaseStatusModule");
const PurchaseAuditModule = require("./modules/PurchaseAuditModule");

/**
 * PurchaseStateService - Orchestrates side effects for purchase state changes.
 * It does NOT contain CRUD or business logic – those belong to PurchaseService.
 * All methods here are event handlers (onApproved, onCompleted, onCancelled, etc.)
 * and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 */
class PurchaseStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.purchaseRepo = dataSource.getRepository(Purchase);
    this.purchaseItemRepo = dataSource.getRepository(PurchaseItem);

    // ─── Initialize modules ──────────────────────────────────────
    this.createdModule = new PurchaseCreatedModule();
    this.approvedModule = new PurchaseApprovedModule();
    this.completedModule = new PurchaseCompletedModule();
    this.cancelledModule = new PurchaseCancelledModule();
    this.updatedModule = new PurchaseUpdatedModule();
    this.deletedModule = new PurchaseDeletedModule();
    this.notificationModule = new PurchaseNotificationModule();
    this.statusModule = new PurchaseStatusModule();
    this.auditModule = new PurchaseAuditModule();
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔄 SIDE EFFECTS (called by subscriber)
  // ============================================================

  /**
   * Side effect after a purchase is created
   * Called from PurchaseSubscriber.afterInsert
   * @param {number} purchaseId
   * @param {Purchase} purchase
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreated(purchaseId, purchase, user = "system", queryRunner = null) {
    logger.info(`[PurchaseState] ✅ Purchase #${purchaseId} (${purchase.referenceNo}) created by ${user}`);

    // 1. Handle creation side effects (UI broadcast)
    await this.createdModule.handle(purchase, user);

    // 2. Audit log
    await this.auditModule.logCreated(purchaseId, purchase, user);
  }

  /**
   * Side effect after a purchase is approved (pending → approved)
   * Called from PurchaseSubscriber.afterUpdate
   * @param {number} purchaseId
   * @param {Purchase} purchase
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onApproved(purchaseId, purchase, user = "system", queryRunner = null) {
    logger.info(`[PurchaseState] ✅ Purchase #${purchaseId} (${purchase.referenceNo}) approved by ${user}`);

    // 1. Validate approval (placeholder for future)
    const validation = this.statusModule.validateApprove(purchase, {});
    if (!validation.valid) {
      logger.warn(`[PurchaseState] Approval validation: ${validation.reason}`);
    }

    // 2. Handle approval side effects (UI broadcast)
    await this.approvedModule.handle(purchase, user);

    // 3. Send notification (email + in-app)
    await this.notificationModule.notify(purchase, "approved", user, "", queryRunner);

    // 4. Audit log
    await this.auditModule.logApproved(purchaseId, purchase, user);
  }

  /**
   * Side effect after a purchase is completed (approved/confirmed → completed)
   * Called from PurchaseSubscriber.afterUpdate
   * @param {number} purchaseId
   * @param {Purchase} purchase
   * @param {Object} options
   * @param {number} [options.batchCount] - Number of batches created
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCompleted(purchaseId, purchase, options = {}, user = "system", queryRunner = null) {
    logger.info(`[PurchaseState] ✅ Purchase #${purchaseId} (${purchase.referenceNo}) completed by ${user}`);

    // 1. Validate completion (placeholder for future)
    const validation = this.statusModule.validateComplete(purchase, {});
    if (!validation.valid) {
      logger.warn(`[PurchaseState] Completion validation: ${validation.reason}`);
    }

    // 2. Handle completion side effects (UI broadcast)
    await this.completedModule.handle(purchase, options, user);

    // 3. Send notification (email + in-app)
    await this.notificationModule.notify(purchase, "completed", user, "", queryRunner);

    // 4. Audit log
    await this.auditModule.logCompleted(purchaseId, purchase, user);
  }

  /**
   * Side effect after a purchase is cancelled (pending/approved/confirmed → cancelled)
   * Called from PurchaseSubscriber.afterUpdate
   * @param {number} purchaseId
   * @param {Purchase} purchase
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCancelled(purchaseId, purchase, reason = "", user = "system", queryRunner = null) {
    logger.info(`[PurchaseState] ✅ Purchase #${purchaseId} (${purchase.referenceNo}) cancelled by ${user}`);

    // 1. Validate cancellation (placeholder for future)
    const validation = this.statusModule.validateCancel(purchase, {});
    if (!validation.valid) {
      logger.warn(`[PurchaseState] Cancellation validation: ${validation.reason}`);
    }

    // 2. Handle cancellation side effects (UI broadcast)
    await this.cancelledModule.handle(purchase, reason, user);

    // 3. Send notification (email + in-app)
    await this.notificationModule.notify(purchase, "cancelled", user, reason, queryRunner);

    // 4. Audit log
    await this.auditModule.logCancelled(purchaseId, purchase, reason, user);
  }

  /**
   * Side effect after a purchase is updated (generic)
   * Called from PurchaseSubscriber.afterUpdate for other changes
   * @param {number} purchaseId
   * @param {Purchase} purchase
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdated(purchaseId, purchase, changes, user = "system", queryRunner = null) {
    logger.info(`[PurchaseState] ✅ Purchase #${purchaseId} (${purchase.referenceNo}) updated (fields: ${Object.keys(changes).join(", ")})`);

    // 1. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(purchase, changes, user);

    // 2. Audit log
    await this.auditModule.logUpdated(purchaseId, changes, purchase, user);
  }

  /**
   * Side effect after a purchase is soft-deleted
   * Called from PurchaseSubscriber.afterRemove
   * @param {number} purchaseId
   * @param {Purchase} purchase
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeleted(purchaseId, purchase, user = "system", queryRunner = null) {
    logger.info(`[PurchaseState] ✅ Purchase #${purchaseId} (${purchase?.referenceNo}) soft-deleted by ${user}`);

    // 1. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(purchaseId, purchase, user);

    // 2. Audit log
    await this.auditModule.logDeleted(purchaseId, purchase, user);
  }
}

module.exports = { PurchaseStateService };