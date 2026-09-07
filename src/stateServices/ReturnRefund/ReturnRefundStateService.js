// src/stateServices/returnRefund/ReturnRefundStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const ReturnRefund = require("../../entities/ReturnRefund");
const ReturnRefundItem = require("../../entities/ReturnRefundItem");
const ReturnRefundCreatedModule = require("./modules/status/ReturnRefundCreatedModule");
const ReturnRefundProcessedModule = require("./modules/status/ReturnRefundProcessedModule");
const ReturnRefundCancelledModule = require("./modules/status/ReturnRefundCancelledModule");
const ReturnRefundUpdatedModule = require("./modules/status/ReturnRefundUpdatedModule");
const ReturnRefundDeletedModule = require("./modules/status/ReturnRefundDeletedModule");
const ReturnRefundRestoredModule = require("./modules/status/ReturnRefundRestoredModule");
const ReturnRefundNotificationModule = require("./modules/ReturnRefundNotificationModule");
const ReturnRefundStatusModule = require("./modules/ReturnRefundStatusModule");
const ReturnRefundAuditModule = require("./modules/ReturnRefundAuditModule");

/**
 * ReturnRefundStateService - Orchestrates side effects for return/refund state changes.
 * It does NOT contain CRUD or business logic – those belong to ReturnRefundService.
 * All methods here are event handlers (onCreated, onProcessed, onCancelled, etc.)
 * and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 * ❌ No business logic (no stock operations, no loyalty reversals)
 * ❌ No calls to BatchStateService
 */
class ReturnRefundStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.returnRepo = dataSource.getRepository(ReturnRefund);
    this.returnItemRepo = dataSource.getRepository(ReturnRefundItem);

    // ─── Initialize modules ──────────────────────────────────────
    this.createdModule = new ReturnRefundCreatedModule();
    this.processedModule = new ReturnRefundProcessedModule();
    this.cancelledModule = new ReturnRefundCancelledModule();
    this.updatedModule = new ReturnRefundUpdatedModule();
    this.deletedModule = new ReturnRefundDeletedModule();
    this.restoredModule = new ReturnRefundRestoredModule();
    this.notificationModule = new ReturnRefundNotificationModule();
    this.statusModule = new ReturnRefundStatusModule();
    this.auditModule = new ReturnRefundAuditModule();
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
   * Side effect after a return is created
   * Called from ReturnRefundSubscriber.afterInsert
   * @param {number} returnId
   * @param {ReturnRefund} returnRefund
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreated(returnId, returnRefund, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund.referenceNo}) created by ${user}`);

    // 1. Handle creation side effects (UI broadcast)
    await this.createdModule.handle(returnRefund, user);

    // 2. Audit log
    await this.auditModule.logCreated(returnId, returnRefund, user);
  }

  /**
   * Side effect after a return is processed (pending → processed)
   * Called from ReturnRefundSubscriber.afterUpdate
   *
   * ⚠️ This is SIDE EFFECTS ONLY – business logic (stock, loyalty) is in Service
   * @param {number} returnId
   * @param {ReturnRefund} returnRefund
   * @param {Object} options
   * @param {number} [options.itemsRestocked] - Number of items restocked (from service)
   * @param {number} [options.pointsReversed] - Loyalty points reversed (from service)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onProcessed(returnId, returnRefund, options = {}, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund.referenceNo}) processed by ${user}`);

    // 1. Validate process (placeholder for future)
    const validation = this.statusModule.validateProcess(returnRefund, {});
    if (!validation.valid) {
      logger.warn(`[ReturnRefundState] Process validation: ${validation.reason}`);
    }

    // 2. Handle processed side effects (UI broadcast)
    await this.processedModule.handle(returnRefund, options, user);

    // 3. Send notification to customer (email + SMS) and admin
    await this.notificationModule.notify(returnRefund, "processed", user, "", queryRunner);

    // 4. Audit log
    await this.auditModule.logProcessed(returnId, returnRefund, options, user);
  }

  /**
   * Side effect after a return is cancelled
   * Called from ReturnRefundSubscriber.afterUpdate
   *
   * ⚠️ This is SIDE EFFECTS ONLY – business logic (stock reversal, loyalty) is in Service
   * @param {number} returnId
   * @param {ReturnRefund} returnRefund
   * @param {string} reason
   * @param {Object} options
   * @param {boolean} [options.wasProcessed] - Whether the return was processed before cancellation
   * @param {number} [options.itemsRestockedReversed] - Number of items whose restock was reversed
   * @param {number} [options.pointsRestored] - Loyalty points restored
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCancelled(returnId, returnRefund, reason = "", options = {}, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund.referenceNo}) cancelled by ${user} (wasProcessed: ${options.wasProcessed || false})`);

    // 1. Validate cancel (placeholder for future)
    const validation = this.statusModule.validateCancel(returnRefund, {});
    if (!validation.valid) {
      logger.warn(`[ReturnRefundState] Cancel validation: ${validation.reason}`);
    }

    // 2. Handle cancelled side effects (UI broadcast)
    await this.cancelledModule.handle(returnRefund, reason, options, user);

    // 3. Send notification to customer (email + SMS)
    await this.notificationModule.notify(returnRefund, "cancelled", user, reason, queryRunner);

    // 4. If it was processed before cancellation, notify admin
    if (options.wasProcessed) {
      await this.notificationModule.notifyProcessedCancelled(returnRefund, user, queryRunner);
    }

    // 5. Audit log
    await this.auditModule.logCancelled(returnId, returnRefund, reason, options, user);
  }

  /**
   * Side effect after a return is updated (generic)
   * Called from ReturnRefundSubscriber.afterUpdate for other changes
   * @param {number} returnId
   * @param {ReturnRefund} returnRefund
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdated(returnId, returnRefund, changes, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund.referenceNo}) updated (fields: ${Object.keys(changes).join(", ")})`);

    // 1. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(returnRefund, changes, user);

    // 2. Audit log
    await this.auditModule.logUpdated(returnId, changes, returnRefund, user);
  }

  /**
   * Side effect after a return is soft-deleted
   * Called from ReturnRefundSubscriber.afterRemove
   * @param {number} returnId
   * @param {ReturnRefund} returnRefund
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeleted(returnId, returnRefund, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund?.referenceNo}) soft-deleted by ${user}`);

    // 1. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(returnId, returnRefund, user);

    // 2. Audit log
    await this.auditModule.logDeleted(returnId, returnRefund, user);
  }

  /**
   * Side effect after a return is restored
   * @param {number} returnId
   * @param {ReturnRefund} returnRefund
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRestored(returnId, returnRefund, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund.referenceNo}) restored by ${user}`);

    // 1. Validate restore (placeholder for future)
    const validation = this.statusModule.validateRestore(returnRefund, {});
    if (!validation.valid) {
      logger.warn(`[ReturnRefundState] Restore validation: ${validation.reason}`);
    }

    // 2. Handle restoration side effects (UI broadcast)
    await this.restoredModule.handle(returnRefund, user);

    // 3. Audit log
    await this.auditModule.logRestored(returnId, returnRefund, user);
  }
}

module.exports = { ReturnRefundStateService };