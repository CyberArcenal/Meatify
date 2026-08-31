// src/stateServices/LoyaltyTransaction.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const notificationService = require("../services/Notification");
const system = require("../utils/system");

/**
 * LoyaltyTransactionStateService handles SIDE EFFECTS and BALANCE UPDATES.
 * It does NOT contain CRUD operations – those belong to LoyaltyTransactionService.
 * All methods here are event handlers and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 * ✅ onTransactionCreated updates customer balance (to ensure no points are missed).
 */
class LoyaltyTransactionStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.customerRepo = dataSource.getRepository(Customer);
    this.loyaltyRepo = dataSource.getRepository(LoyaltyTransaction);
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
        "[LoyaltyState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
  }

  /**
   * Determine customer status based on lifetime points
   * @param {number} lifetimePoints
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _determineStatus(lifetimePoints, qr = null) {
    const vipThreshold = await system.loyaltyVipThreshold();
    const eliteThreshold = await system.loyaltyEliteThreshold();
    if (lifetimePoints >= eliteThreshold) return "elite";
    if (lifetimePoints >= vipThreshold) return "vip";
    return "regular";
  }

  /**
   * Send notification when customer status changes
   * @param {Customer} customer
   * @param {string} oldStatus
   * @param {string} newStatus
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async _notifyStatusChange(customer, oldStatus, newStatus, user, queryRunner) {
    const company = await system.companyName();
    const canSendEmail = await system.emailEnabled();
    const canSendSms = await system.smsEnabled();

    // In-app notification for admin
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Customer Loyalty Milestone",
          message: `${customer.name} has reached ${newStatus} status! (was ${oldStatus})`,
          type: "success",
          metadata: {
            customerId: customer.id,
            oldStatus,
            newStatus,
            points: customer.loyaltyPointsBalance,
          },
        },
        user,
        queryRunner,
      );
    } catch (err) {
      logger.error(
        `[LoyaltyState] Failed to send milestone notification:`,
        err,
      );
    }

    // Email to customer
    if (canSendEmail && customer.email) {
      const subject = `Congratulations! You've reached ${newStatus} status!`;
      const textBody = `Dear ${customer.name},\n\nCongratulations! You have reached ${newStatus} status at ${company}.\n\nWe appreciate your continued patronage and look forward to serving you with exclusive benefits.\n\nThank you for being a valued customer!\n\nBest regards,\n${company}`;
      try {
        logger.info(
          `[LoyaltyState] Would send status upgrade email to ${customer.email}`,
        );
        // await emailSender.send(customer.email, subject, htmlBody, textBody);
      } catch (err) {
        logger.error(
          `[LoyaltyState] Failed to send email to ${customer.email}:`,
          err,
        );
      }
    }

    // SMS to customer
    if (canSendSms && customer.phone) {
      try {
        const smsMessage = `Congratulations! You've reached ${newStatus} status at ${company}. Thank you for your loyalty!`;
        logger.info(
          `[LoyaltyState] Would send SMS to ${customer.phone}: ${smsMessage}`,
        );
        // await smsSender.send(customer.phone, smsMessage);
      } catch (err) {
        logger.error(
          `[LoyaltyState] Failed to send SMS to ${customer.phone}:`,
          err,
        );
      }
    }
  }

  // ============================================================
  // 🔄 SIDE EFFECTS + BALANCE UPDATE (called by subscriber)
  // ============================================================

  /**
   * Side effect after a loyalty transaction is created
   * Called from LoyaltyTransactionSubscriber.afterInsert
   *
   * ✅ Updates customer loyalty points balance based on pointsChange
   * ✅ Broadcasts UI events
   * ✅ Creates audit logs
   * ✅ Sends notification (if significant)
   *
   * @param {number} transactionId
   * @param {LoyaltyTransaction} transaction
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onTransactionCreated(
    transactionId,
    transaction,
    user = "system",
    queryRunner = null,
  ) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const customerRepo = this._getRepo(queryRunner, Customer);

    // ─── LOG: Transaction details ──────────────────────────────
    logger.info(
      `[LoyaltyState] ✅ Transaction #${transactionId} created (${transaction.transactionType}, ${transaction.pointsChange > 0 ? "+" : ""}${transaction.pointsChange})`,
    );
    logger.debug(`[LoyaltyState] Full transaction object:`, {
      id: transaction.id,
      customerId: transaction.customerId,
      customer: transaction.customer,
      pointsChange: transaction.pointsChange,
      transactionType: transaction.transactionType,
      notes: transaction.notes,
      timestamp: transaction.timestamp,
    });

    // ─── Detect customerId ──────────────────────────────────────
    const customerId = transaction.customerId || transaction.customer?.id;
    logger.debug(`[LoyaltyState] Detected customerId: ${customerId}`);

    if (!customerId) {
      logger.warn(
        `[LoyaltyState] Transaction #${transaction.id} has no customerId, skipping balance update`,
      );
      // Broadcast event pa rin (walang customer)
      this._sendToRenderers("loyalty:transactionCreated", {
        id: transaction.id,
        customerId: null,
        type: transaction.transactionType,
        pointsChange: transaction.pointsChange,
        notes: transaction.notes,
        timestamp: transaction.timestamp,
        newBalance: null,
      });
      return;
    }

    // ─── 1. Update Customer Balance ────────────────────────────
    let updatedCustomer = null;
    let statusChanged = false;
    let oldStatus = null;
    let newStatus = null;

    // ✅ Gamitin ang detected customerId, hindi transaction.customerId
    if (customerId && transaction.pointsChange !== 0) {
      logger.debug(`[LoyaltyState] Fetching customer #${customerId}...`);
      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        logger.warn(
          `[LoyaltyState] Customer #${customerId} not found, skipping balance update`,
        );
      } else {
        const oldBalance = customer.loyaltyPointsBalance;
        const oldLifetime = customer.lifetimePointsEarned || 0;
        oldStatus = customer.status;

        logger.debug(`[LoyaltyState] Customer before update:`, {
          id: customer.id,
          name: customer.name,
          balance: oldBalance,
          lifetime: oldLifetime,
          status: oldStatus,
        });

        // Update balance
        const newBalance = oldBalance + transaction.pointsChange;
        customer.loyaltyPointsBalance = newBalance;

        if (transaction.pointsChange > 0) {
          customer.lifetimePointsEarned =
            oldLifetime + transaction.pointsChange;
        }

        // Check for status change (only when points increase)
        if (transaction.pointsChange > 0) {
          const lifetime = customer.lifetimePointsEarned || 0;
          const determinedStatus = await this._determineStatus(
            lifetime,
            queryRunner,
          );
          if (determinedStatus !== oldStatus) {
            newStatus = determinedStatus;
            customer.status = newStatus;
            statusChanged = true;
            logger.debug(
              `[LoyaltyState] Status will change: ${oldStatus} → ${newStatus}`,
            );
          }
        }

        customer.updatedAt = new Date();

        // ─── Save customer ──────────────────────────────────────
        logger.debug(`[LoyaltyState] Saving customer #${customer.id}...`);
        try {
          updatedCustomer = await updateDb(customerRepo, customer, {
            queryRunner,
            skipSignal: true,
          });
          logger.debug(`[LoyaltyState] Customer saved successfully.`);
        } catch (saveError) {
          logger.error(
            `[LoyaltyState] Failed to save customer #${customer.id}:`,
            saveError,
          );
          throw saveError; // rethrow para mag-rollback ang transaction
        }

        // ─── Audit log for customer update ─────────────────────
        await auditLogger.logUpdate(
          "Customer",
          customer.id,
          {
            loyaltyPointsBalance: oldBalance,
            status: oldStatus,
          },
          {
            loyaltyPointsBalance: updatedCustomer.loyaltyPointsBalance,
            status: updatedCustomer.status,
          },
          user,
        );

        logger.info(
          `[LoyaltyState] Customer #${customer.id} balance updated: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance} (${transaction.pointsChange > 0 ? "+" : ""}${transaction.pointsChange})`,
        );
        logger.debug(`[LoyaltyState] Customer after update:`, {
          id: updatedCustomer.id,
          balance: updatedCustomer.loyaltyPointsBalance,
          lifetime: updatedCustomer.lifetimePointsEarned,
          status: updatedCustomer.status,
        });
      }
    } else {
      logger.warn(
        `[LoyaltyState] Skipping balance update: customerId=${customerId}, pointsChange=${transaction.pointsChange}`,
      );
    }

    // ─── 2. If status changed, trigger side effects ──────────
    if (statusChanged && updatedCustomer && oldStatus && newStatus) {
      logger.info(
        `[LoyaltyState] Customer #${updatedCustomer.id} status changed: ${oldStatus} → ${newStatus}. Notifying...`,
      );
      await this._notifyStatusChange(
        updatedCustomer,
        oldStatus,
        newStatus,
        user,
        queryRunner,
      );
    }

    // ─── 3. Broadcast to UI ────────────────────────────────────
    this._sendToRenderers("loyalty:transactionCreated", {
      id: transaction.id,
      customerId: customerId,
      type: transaction.transactionType,
      pointsChange: transaction.pointsChange,
      notes: transaction.notes,
      timestamp: transaction.timestamp,
      newBalance: updatedCustomer?.loyaltyPointsBalance || null,
    });

    // ─── 4. Audit log for transaction ─────────────────────────
    await auditLogger.logCreate(
      "LoyaltyTransaction",
      transactionId,
      transaction,
      user,
    );

    // ─── 5. Optional: Notification for significant transactions ──
    if (Math.abs(transaction.pointsChange) > 100) {
      try {
        const customer =
          updatedCustomer ||
          (await customerRepo.findOne({ where: { id: customerId } }));
        const action = transaction.pointsChange > 0 ? "earned" : "redeemed";
        await notificationService.create(
          {
            userId: 1,
            title: `Loyalty Points ${action === "earned" ? "Earned" : "Redeemed"}`,
            message: `${customer?.name || "Customer"} ${action} ${Math.abs(transaction.pointsChange)} points. Type: ${transaction.transactionType}`,
            type: transaction.pointsChange > 0 ? "success" : "info",
            metadata: {
              transactionId: transaction.id,
              customerId: customerId,
              pointsChange: transaction.pointsChange,
            },
          },
          user,
          queryRunner,
        );
      } catch (err) {
        logger.error(
          `[LoyaltyState] Failed to send transaction notification:`,
          err,
        );
      }
    }

    logger.debug(
      `[LoyaltyState] onTransactionCreated completed for #${transactionId}`,
    );
  }

  /**
   * Side effect after a loyalty transaction is updated
   * @param {number} transactionId
   * @param {LoyaltyTransaction} transaction
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onTransactionUpdated(
    transactionId,
    transaction,
    changes,
    user = "system",
    queryRunner = null,
  ) {
    logger.info(
      `[LoyaltyState] ✅ Transaction #${transactionId} updated (fields: ${Object.keys(changes).join(", ")})`,
    );

    this._sendToRenderers("loyalty:transactionUpdated", {
      id: transaction.id,
      changes,
      updatedAt: transaction.updatedAt,
    });

    await auditLogger.logUpdate(
      "LoyaltyTransaction",
      transactionId,
      changes,
      transaction,
      user,
    );
  }

  /**
   * Optional: Side effect after a loyalty transaction is soft-deleted
   * @param {number} transactionId
   * @param {LoyaltyTransaction} transaction
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onTransactionDeleted(
    transactionId,
    transaction,
    user = "system",
    queryRunner = null,
  ) {
    logger.info(
      `[LoyaltyState] ✅ Transaction #${transactionId} soft-deleted by ${user}`,
    );

    this._sendToRenderers("loyalty:transactionDeleted", {
      id: transactionId,
      customerId: transaction?.customerId,
      deletedAt: new Date().toISOString(),
    });

    await auditLogger.logCreate(
      "LoyaltyTransaction",
      transactionId,
      transaction,
      user,
    );
  }
}

module.exports = { LoyaltyTransactionStateService };
