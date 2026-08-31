// src/stateServices/ReturnRefund.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const ReturnRefund = require("../entities/ReturnRefund");
const ReturnRefundItem = require("../entities/ReturnRefundItem");
const notificationService = require("../services/Notification");
const system = require("../utils/system");

/**
 * ReturnRefundStateService handles SIDE EFFECTS only for return/refund state changes.
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
        "[ReturnRefundState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
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

    // Broadcast to UI
    this._sendToRenderers("returnRefund:created", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      saleId: returnRefund.saleId,
      customerId: returnRefund.customerId,
      customerName: returnRefund.customer?.name,
      status: returnRefund.status,
      totalAmount: returnRefund.totalAmount,
      refundMethod: returnRefund.refundMethod,
      reason: returnRefund.reason,
      createdAt: returnRefund.createdAt,
    });

    // Audit log
    await auditLogger.logCreate("ReturnRefund", returnId, returnRefund, user);
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
    const { itemsRestocked = 0, pointsReversed = 0 } = options;

    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund.referenceNo}) processed by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("returnRefund:processed", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      customerId: returnRefund.customerId,
      customerName: returnRefund.customer?.name,
      totalAmount: returnRefund.totalAmount,
      refundMethod: returnRefund.refundMethod,
      itemsRestocked,
      pointsReversed,
      processedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      { action: "processed", itemsRestocked, pointsReversed },
      { status: "processed" },
      user
    );

    // Send notification to customer (in-app + email/SMS)
    await this._notifyCustomer(returnRefund, "processed", user, queryRunner);

    // In-app notification for admin
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Return Processed",
          message: `Return #${returnRefund.referenceNo} has been processed for ${returnRefund.customer?.name || "customer"}. Amount: ₱${returnRefund.totalAmount.toFixed(2)}`,
          type: "info",
          metadata: {
            returnId: returnRefund.id,
            referenceNo: returnRefund.referenceNo,
            amount: returnRefund.totalAmount,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[ReturnRefundState] Failed to send admin notification:`, err);
    }
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
    const { wasProcessed = false, itemsRestockedReversed = 0, pointsRestored = 0 } = options;

    logger.info(`[ReturnRefundState] ✅ Return #${returnId} (${returnRefund.referenceNo}) cancelled by ${user} (wasProcessed: ${wasProcessed})`);

    // Broadcast to UI
    this._sendToRenderers("returnRefund:cancelled", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      customerId: returnRefund.customerId,
      customerName: returnRefund.customer?.name,
      reason,
      wasProcessed,
      itemsRestockedReversed,
      pointsRestored,
      cancelledAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      { action: "cancelled", reason, wasProcessed },
      { status: "cancelled" },
      user
    );

    // Send notification to customer
    await this._notifyCustomer(returnRefund, "cancelled", user, queryRunner, reason);

    // If it was processed before cancellation, notify admin
    if (wasProcessed) {
      try {
        await notificationService.create(
          {
            userId: 1,
            title: "Return Cancelled (Processed)",
            message: `Return #${returnRefund.referenceNo} was processed and then cancelled. Stock and loyalty have been reversed.`,
            type: "warning",
            metadata: {
              returnId: returnRefund.id,
              referenceNo: returnRefund.referenceNo,
            },
          },
          user,
          queryRunner
        );
      } catch (err) {
        logger.error(`[ReturnRefundState] Failed to send admin notification:`, err);
      }
    }
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

    // Broadcast to UI
    this._sendToRenderers("returnRefund:updated", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      changes,
      updatedAt: returnRefund.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      changes,
      returnRefund,
      user
    );
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

    // Broadcast to UI
    this._sendToRenderers("returnRefund:deleted", {
      id: returnId,
      referenceNo: returnRefund?.referenceNo,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate("ReturnRefund", returnId, returnRefund, user);
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

    // Broadcast to UI
    this._sendToRenderers("returnRefund:restored", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      restoredAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      { action: "restored" },
      { status: returnRefund.status },
      user
    );
  }

  // ============================================================
  // 🔒 PRIVATE HELPERS (Side Effects Only)
  // ============================================================

  /**
   * Send email/SMS notification to customer about return status
   * @private
   */
  async _notifyCustomer(returnRefund, action, user, queryRunner, reason = "") {
    const canSendEmail = await system.emailEnabled();
    const canSendSms = await system.smsEnabled();
    const company = await system.companyName();

    const customer = returnRefund.customer;
    if (!customer) {
      logger.warn(`[ReturnRefundState] No customer for return #${returnRefund.id}, skipping notification`);
      return;
    }

    const subject = action === "processed"
      ? `Return Processed – ${returnRefund.referenceNo}`
      : `Return Cancelled – ${returnRefund.referenceNo}`;

    const itemsList = returnRefund.items
      .map(item => `${item.meat?.name || "Unknown"} – ${item.weightKg}kg @ ₱${item.unitPrice}`)
      .join("\n");

    const textBody = action === "processed"
      ? `Dear ${customer.name},\n\nWe have processed your return (ref. #${returnRefund.referenceNo}).\n\nReturned items:\n${itemsList}\n\nTotal refund amount: ₱${returnRefund.totalAmount.toFixed(2)}\nRefund method: ${returnRefund.refundMethod}\n\nThe amount will be credited according to your selected refund method.\n\nThank you for shopping with us,\n${company}`
      : `Dear ${customer.name},\n\nYour return request (ref. #${returnRefund.referenceNo}) has been cancelled.${reason ? ` Reason: ${reason}` : ""}\n\nIf you have any questions, please contact our support.\n\nRegards,\n${company}`;

    const htmlBody = textBody.replace(/\n/g, "<br>");

    // Send email
    if (canSendEmail && customer.email) {
      try {
        logger.info(`[ReturnRefundState] Would send email to ${customer.email}: ${subject}`);
        // await emailSender.send(customer.email, subject, htmlBody, textBody);
      } catch (err) {
        logger.error(`[ReturnRefundState] Failed to send email to ${customer.email}:`, err);
      }
    }

    // Send SMS
    if (canSendSms && customer.phone) {
      try {
        const smsMessage = action === "processed"
          ? `Return #${returnRefund.referenceNo} processed. Refund: ₱${returnRefund.totalAmount.toFixed(2)}. Check email for details.`
          : `Return #${returnRefund.referenceNo} cancelled.${reason ? ` Reason: ${reason}` : ""}`;
        logger.info(`[ReturnRefundState] Would send SMS to ${customer.phone}: ${smsMessage}`);
        // await smsSender.send(customer.phone, smsMessage);
      } catch (err) {
        logger.error(`[ReturnRefundState] Failed to send SMS to ${customer.phone}:`, err);
      }
    }
  }
}

module.exports = { ReturnRefundStateService };