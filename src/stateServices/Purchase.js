// src/stateServices/Purchase.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Purchase = require("../entities/Purchase");
const PurchaseItem = require("../entities/PurchaseItem");
const notificationService = require("../services/Notification");

/**
 * PurchaseStateService handles SIDE EFFECTS only for purchase state changes.
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
        "[PurchaseState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
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

    // Broadcast to UI
    this._sendToRenderers("purchase:created", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      status: purchase.status,
      totalAmount: purchase.totalAmount,
      orderDate: purchase.orderDate,
      createdAt: purchase.createdAt,
    });

    // Audit log
    await auditLogger.logCreate("Purchase", purchaseId, purchase, user);
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

    // Broadcast to UI
    this._sendToRenderers("purchase:approved", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      totalAmount: purchase.totalAmount,
      approvedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { action: "approved" },
      { status: "approved" },
      user
    );

    // Send notification to supplier (in-app)
    await this._notifySupplier(purchase, "approved", user, queryRunner);
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
    const { batchCount = purchase.purchaseItems?.length || 0 } = options;

    logger.info(`[PurchaseState] ✅ Purchase #${purchaseId} (${purchase.referenceNo}) completed by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("purchase:completed", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      totalAmount: purchase.totalAmount,
      batchCount,
      completedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { action: "completed" },
      { status: "completed" },
      user
    );

    // Send notification to supplier (in-app)
    await this._notifySupplier(purchase, "completed", user, queryRunner);
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

    // Broadcast to UI
    this._sendToRenderers("purchase:cancelled", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      reason,
      cancelledAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { action: "cancelled", reason },
      { status: "cancelled" },
      user
    );

    // Send notification to supplier (in-app)
    await this._notifySupplier(purchase, "cancelled", user, queryRunner, reason);
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

    // Broadcast to UI
    this._sendToRenderers("purchase:updated", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      changes,
      updatedAt: purchase.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Purchase",
      purchaseId,
      changes,
      purchase,
      user
    );
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

    // Broadcast to UI
    this._sendToRenderers("purchase:deleted", {
      id: purchaseId,
      referenceNo: purchase?.referenceNo,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate("Purchase", purchaseId, purchase, user);
  }

  // ============================================================
  // 🔒 PRIVATE HELPERS
  // ============================================================

  /**
   * Notify supplier about purchase status change
   * @private
   */
  async _notifySupplier(purchase, action, user, queryRunner, reason = "") {
    if (!purchase.supplier) {
      logger.warn(`[PurchaseState] No supplier for purchase #${purchase.id}, skipping notification`);
      return;
    }

    const supplier = purchase.supplier;
    let title, message, type;

    switch (action) {
      case "approved":
        title = "Purchase Order Approved";
        message = `Purchase #${purchase.referenceNo} has been approved. Please prepare the order.`;
        type = "info";
        break;
      case "completed":
        title = "Purchase Order Completed";
        message = `Purchase #${purchase.referenceNo} has been completed. Stock has been added to inventory.`;
        type = "success";
        break;
      case "cancelled":
        title = "Purchase Order Cancelled";
        message = `Purchase #${purchase.referenceNo} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`;
        type = "warning";
        break;
      default:
        return;
    }

    try {
      await notificationService.create(
        {
          userId: 1,
          title,
          message: `${message}\nSupplier: ${supplier.name}`,
          type,
          metadata: {
            purchaseId: purchase.id,
            referenceNo: purchase.referenceNo,
            supplierId: supplier.id,
            action,
          },
        },
        user,
        queryRunner
      );
      logger.info(`[PurchaseState] Notification sent for purchase #${purchase.id}: ${action}`);
    } catch (err) {
      logger.error(`[PurchaseState] Failed to send notification:`, err);
    }
  }
}

module.exports = { PurchaseStateService };