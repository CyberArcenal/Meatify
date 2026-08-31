// src/stateServices/BatchStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Notification = require("../entities/Notification");
const InventoryMovement = require("../entities/InventoryMovement");
const system = require("../utils/system");
const Batch = require("../entities/Batch");

/**
 * BatchStateService handles side effects for batch state changes.
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
        "[BatchState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
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

    // Broadcast to UI
    this._sendToRenderers("batch:created", {
      id: batch.id,
      batchCode: batch.batchCode,
      meatId: batch.meatId,
      meatName: batch.meat?.name,
      initialQuantity: batch.initialQuantity,
      remainingQuantity: batch.remainingQuantity,
      expiryDate: batch.expiryDate,
      status: batch.status,
    });

    // Audit log
    await auditLogger.logCreate("Batch", batchId, batch, user);
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

    // Broadcast to UI
    this._sendToRenderers("batch:depleted", {
      id: batch.id,
      batchCode: batch.batchCode,
      meatId: batch.meatId,
      meatName: batch.meat?.name,
      remainingQuantity: batch.remainingQuantity,
      expiredAt: new Date().toISOString(),
    });

    // Audit log (status change already logged in service, but we can add extra context)
    await auditLogger.logUpdate(
      "Batch",
      batchId,
      { action: "depleted" },
      { status: "depleted" },
      user
    );

    // Send notification (in-app)
    try {
      const notificationService = require("../services/Notification");
      await notificationService.create(
        {
          userId: 1,
          title: "Batch Depleted",
          message: `Batch ${batch.batchCode} (${batch.meat?.name || "Unknown"}) has been fully depleted.`,
          type: "warning",
          metadata: {
            batchId: batch.id,
            batchCode: batch.batchCode,
            meatId: batch.meatId,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[BatchState] Failed to send depletion notification:`, err);
    }
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

    // Broadcast to UI
    this._sendToRenderers("batch:expired", {
      id: batch.id,
      batchCode: batch.batchCode,
      meatId: batch.meatId,
      meatName: batch.meat?.name,
      remainingQuantity: batch.remainingQuantity,
      expiryDate: batch.expiryDate,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Batch",
      batchId,
      { action: "expired" },
      { status: "expired" },
      user
    );

    // Send notification (in-app)
    try {
      const notificationService = require("../services/Notification");
      await notificationService.create(
        {
          userId: 1,
          title: "Batch Expired",
          message: `Batch ${batch.batchCode} (${batch.meat?.name || "Unknown"}) has expired. Please dispose of the product.`,
          type: "error",
          metadata: {
            batchId: batch.id,
            batchCode: batch.batchCode,
            meatId: batch.meatId,
            expiryDate: batch.expiryDate,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[BatchState] Failed to send expiration notification:`, err);
    }
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

    // Broadcast to UI
    this._sendToRenderers("batch:updated", {
      id: batch.id,
      batchCode: batch.batchCode,
      changes,
      updatedAt: batch.updatedAt,
    });

    // Audit log (already logged in service, but we can add extra context)
    await auditLogger.logUpdate(
      "Batch",
      batchId,
      changes,
      batch,
      user
    );
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

    // Broadcast to UI
    this._sendToRenderers("batch:deleted", {
      id: batchId,
      batchCode: batch?.batchCode,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate("Batch", batchId, batch, user);
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

    // Broadcast to UI
    this._sendToRenderers("batch:restored", {
      id: batch.id,
      batchCode: batch.batchCode,
      restoredAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Batch",
      batchId,
      { action: "restored" },
      { status: "active" },
      user
    );
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

    if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
      logger.info(`[BatchState] ⚠️ Batch #${batchId} (${batch.batchCode}) expires in ${daysUntilExpiry} days`);

      // Broadcast to UI
      this._sendToRenderers("batch:expiringSoon", {
        id: batch.id,
        batchCode: batch.batchCode,
        meatName: batch.meat?.name,
        daysUntilExpiry,
        expiryDate: batch.expiryDate,
      });

      // Send notification
      try {
        const notificationService = require("../services/Notification");
        await notificationService.create(
          {
            userId: 1,
            title: "Batch Expiring Soon",
            message: `Batch ${batch.batchCode} (${batch.meat?.name || "Unknown"}) will expire in ${daysUntilExpiry} days.`,
            type: "warning",
            metadata: {
              batchId: batch.id,
              batchCode: batch.batchCode,
              daysUntilExpiry,
              expiryDate: batch.expiryDate,
            },
          },
          user,
          queryRunner
        );
      } catch (err) {
        logger.error(`[BatchState] Failed to send expiring soon notification:`, err);
      }
    }
  }
}

module.exports = { BatchStateService };