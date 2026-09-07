// src/stateServices/batch/BatchStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Batch = require("../../entities/Batch");
const InventoryMovement = require("../../entities/InventoryMovement");
const Notification = require("../../entities/Notification");
const BatchStatusModule = require("./modules/BatchStatusModule");
const BatchNotificationModule = require("./modules/BatchNotificationModule");
const BatchAuditModule = require("./modules/BatchAuditModule");

/**
 * BatchStateService - Orchestrates side effects for batch state changes.
 * It does NOT perform CRUD updates – those belong to BatchService.
 * All methods here are event handlers (onDepleted, onExpired, etc.)
 * and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 */
class BatchStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.batchRepo = dataSource.getRepository(Batch);
    this.movementRepo = dataSource.getRepository(InventoryMovement);
    this.notificationRepo = dataSource.getRepository(Notification);

    // ─── Initialize modules ──────────────────────────────────────
    this.statusModule = new BatchStatusModule();
    this.notificationModule = new BatchNotificationModule();
    this.auditModule = new BatchAuditModule();
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
   * Side effect after a batch is created
   * Called from BatchSubscriber.afterInsert
   * @param {number} batchId
   * @param {Batch} batch
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreate(batchId, batch, user = "system", queryRunner = null) {
    logger.info(`[BatchState] ✅ Batch #${batchId} (${batch.batchCode}) created by ${user}`);

    // 1. Broadcast to UI
    this.statusModule.broadcastCreated(batch);

    // 2. Audit log
    await this.auditModule.logCreated(batchId, batch, user);

    // 3. Check if expiring soon (this also triggers notifications if needed)
    await this.onExpiringSoon(batchId, batch, user, queryRunner);
  }

  /**
   * Side effect after a batch status changes to 'depleted'
   * Called from BatchSubscriber.afterUpdate
   * @param {number} batchId
   * @param {Batch} batch
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDepleted(batchId, batch, user = "system", queryRunner = null) {
    logger.info(`[BatchState] ✅ Batch #${batchId} (${batch.batchCode}) depleted by ${user}`);

    // 1. Broadcast to UI
    this.statusModule.broadcastDepleted(batch);

    // 2. Audit log
    await this.auditModule.logUpdated(
      batchId,
      { action: "depleted" },
      { status: "depleted" },
      user
    );

    // 3. Send notification (in-app)
    await this.notificationModule.notifyDepleted(batch, user, queryRunner);
  }

  /**
   * Side effect after a batch status changes to 'expired'
   * Called from BatchSubscriber.afterUpdate
   * @param {number} batchId
   * @param {Batch} batch
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onExpired(batchId, batch, user = "system", queryRunner = null) {
    logger.info(`[BatchState] ✅ Batch #${batchId} (${batch.batchCode}) expired by ${user}`);

    // 1. Broadcast to UI
    this.statusModule.broadcastExpired(batch);

    // 2. Audit log
    await this.auditModule.logUpdated(
      batchId,
      { action: "expired" },
      { status: "expired" },
      user
    );

    // 3. Send notification (in-app)
    await this.notificationModule.notifyExpired(batch, user, queryRunner);
  }

  /**
   * Side effect after a batch is updated (generic)
   * Called from BatchSubscriber.afterUpdate for other changes
   * @param {number} batchId
   * @param {Batch} batch
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdate(batchId, batch, changes, user = "system", queryRunner = null) {
    logger.info(`[BatchState] ✅ Batch #${batchId} (${batch.batchCode}) updated (fields: ${Object.keys(changes).join(", ")})`);

    // 1. Broadcast to UI
    this.statusModule.broadcastUpdated(batchId, batch.batchCode, changes, batch.updatedAt);

    // 2. Audit log
    await this.auditModule.logUpdated(batchId, changes, batch, user);
  }

  /**
   * Side effect after a batch is soft-deleted
   * Called from BatchSubscriber.afterRemove
   * @param {number} batchId
   * @param {Batch} batch
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDelete(batchId, batch, user = "system", queryRunner = null) {
    logger.info(`[BatchState] ✅ Batch #${batchId} (${batch?.batchCode}) soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this.statusModule.broadcastDeleted(batchId, batch?.batchCode);

    // 2. Audit log
    await this.auditModule.logDeleted(batchId, batch, user);
  }

  /**
   * Side effect after a batch is restored
   * @param {number} batchId
   * @param {Batch} batch
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRestore(batchId, batch, user = "system", queryRunner = null) {
    logger.info(`[BatchState] ✅ Batch #${batchId} (${batch.batchCode}) restored by ${user}`);

    // 1. Broadcast to UI
    this.statusModule.broadcastRestored(batch);

    // 2. Audit log
    await this.auditModule.logRestored(batchId, batch, user);
  }

  /**
   * Side effect: check if batch is expiring soon (called from cron or afterInsert)
   * @param {number} batchId
   * @param {Batch} batch
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onExpiringSoon(batchId, batch, user = "system", queryRunner = null) {
    const daysUntilExpiry = Math.ceil(
      (new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    // Only notify if within 7 days and not expired yet
    if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
      logger.info(`[BatchState] ⚠️ Batch #${batchId} (${batch.batchCode}) expires in ${daysUntilExpiry} days`);

      // 1. Broadcast to UI
      this.statusModule.broadcastExpiringSoon(batch, daysUntilExpiry);

      // 2. Send notification (in-app)
      await this.notificationModule.notifyExpiringSoon(batch, daysUntilExpiry, user, queryRunner);
    }
  }
}

module.exports = { BatchStateService };