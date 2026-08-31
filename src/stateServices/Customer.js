// src/stateServices/Customer.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const notificationService = require("../services/Notification");
const system = require("../utils/system");

/**
 * CustomerStateService handles state transitions and side effects for customers.
 * It does NOT contain CRUD operations – those belong to CustomerService.
 * All methods here manage loyalty points, status changes, and related side effects.
 */
class CustomerStateService {
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
        "[CustomerState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
  }

  // ============================================================
  // 🔄 SIDE EFFECTS (called by subscriber)
  // ============================================================

  /**
   * Side effect for status change
   * Called from CustomerSubscriber.afterUpdate
   * @param {number} customerId
   * @param {string} oldStatus
   * @param {string} newStatus
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onStatusChange(customerId, oldStatus, newStatus, user = "system", queryRunner = null) {
    logger.info(`[CustomerState] Customer #${customerId} status changed: ${oldStatus} → ${newStatus}`);

    // Broadcast to UI
    this._sendToRenderers("customer:statusChanged", {
      id: customerId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Customer",
      customerId,
      { status: oldStatus },
      { status: newStatus },
      user
    );

    // Send notification if promoted to VIP or Elite
    if ((newStatus === "vip" || newStatus === "elite") && newStatus !== oldStatus) {
      const customerRepo = this._getRepo(queryRunner, Customer);
      const customer = await customerRepo.findOne({ where: { id: customerId } });
      if (customer) {
        await this._notifyStatusChange(customer, oldStatus, newStatus, user, queryRunner);
      }
    }
  }

  /**
   * Side effect for points balance change
   * Called from CustomerSubscriber.afterUpdate
   * @param {number} customerId
   * @param {number} oldBalance
   * @param {number} newBalance
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onPointsChange(customerId, oldBalance, newBalance, user = "system", queryRunner = null) {
    const diff = newBalance - oldBalance;
    logger.info(`[CustomerState] Customer #${customerId} points changed: ${oldBalance} → ${newBalance} (diff: ${diff})`);

    // Broadcast to UI
    this._sendToRenderers("customer:pointsChanged", {
      id: customerId,
      oldBalance,
      newBalance,
      diff,
      timestamp: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Customer",
      customerId,
      { loyaltyPointsBalance: oldBalance },
      { loyaltyPointsBalance: newBalance },
      user
    );

    // Optional: send notification for significant points change (e.g., > 100)
    if (Math.abs(diff) > 100) {
      try {
        const customerRepo = this._getRepo(queryRunner, Customer);
        const customer = await customerRepo.findOne({ where: { id: customerId } });
        if (customer) {
          await notificationService.create(
            {
              userId: 1,
              title: "Loyalty Points Updated",
              message: `${customer.name} - Points ${diff > 0 ? "increased" : "decreased"} by ${Math.abs(diff)}. New balance: ${newBalance}`,
              type: "info",
              metadata: {
                customerId: customer.id,
                oldBalance,
                newBalance,
                diff,
              },
            },
            user,
            queryRunner
          );
        }
      } catch (err) {
        logger.error(`[CustomerState] Failed to send points change notification:`, err);
      }
    }
  }

  // ============================================================
  // 🔄 BUSINESS LOGIC (data mutation) – side effects removed
  // ============================================================

  /**
   * Earn loyalty points for a customer (called from SaleStateService)
   * @param {number} customerId
   * @param {number} amountSpent - Total amount spent (net of redemptions)
   * @param {number} saleId - Reference sale ID
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ customer: any, pointsEarned: number }>}
   */
  async earnPoints(
    customerId,
    amountSpent,
    saleId,
    user = "system",
    queryRunner = null
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    if (!loyaltyEnabled) {
      logger.info(`[CustomerState] Loyalty points disabled, skipping earn for customer #${customerId}`);
      return { customer: null, pointsEarned: 0 };
    }

    const customerRepo = this._getRepo(queryRunner, Customer);
    const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);

    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error(`Customer #${customerId} not found`);
    }

    if (!customer.isActive) {
      logger.warn(`[CustomerState] Customer #${customerId} is inactive, skipping points`);
      return { customer, pointsEarned: 0 };
    }

    const rate = await system.getLoyaltyPointRate();
    const pointsEarned = Math.floor(amountSpent / rate);

    if (pointsEarned <= 0) {
      logger.info(`[CustomerState] No points earned for customer #${customerId} (amount: ${amountSpent})`);
      return { customer, pointsEarned: 0 };
    }

    const oldBalance = customer.loyaltyPointsBalance;
    const oldLifetime = customer.lifetimePointsEarned || 0;

    customer.loyaltyPointsBalance += pointsEarned;
    customer.lifetimePointsEarned = oldLifetime + pointsEarned;
    customer.updatedAt = new Date();

    // Check if customer should be promoted to VIP or Elite
    const oldStatus = customer.status;
    const newStatus = this._determineStatus(customer.lifetimePointsEarned);
    if (newStatus !== oldStatus) {
      customer.status = newStatus;
    }

    const updatedCustomer = await updateDb(customerRepo, customer, { queryRunner });

    // Create loyalty transaction
    const tx = loyaltyRepo.create({
      pointsChange: pointsEarned,
      transactionType: "earn",
      notes: `Sale #${saleId}`,
      customer: updatedCustomer,
      sale: { id: saleId },
      timestamp: new Date(),
    });
    const savedTx = await saveDb(loyaltyRepo, tx, { queryRunner });

    // Audit log for loyalty transaction creation (not for customer update)
    await auditLogger.logCreate("LoyaltyTransaction", savedTx.id, savedTx, user);

    logger.info(
      `[CustomerState] Earned ${pointsEarned} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    // NOTE: Side effects (notifications, audit logs for customer) are now handled by the subscriber.
    return { customer: updatedCustomer, pointsEarned };
  }

  /**
   * Redeem loyalty points (called from SaleService when applying redemption)
   * @param {number} customerId
   * @param {number} pointsToRedeem
   * @param {number} saleId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ customer: any, pointsRedeemed: number }>}
   */
  async redeemPoints(
    customerId,
    pointsToRedeem,
    saleId,
    user = "system",
    queryRunner = null
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    if (!loyaltyEnabled) {
      throw new Error("Loyalty points are disabled");
    }

    const customerRepo = this._getRepo(queryRunner, Customer);
    const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);

    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error(`Customer #${customerId} not found`);
    }

    if (!customer.isActive) {
      throw new Error(`Customer #${customerId} is inactive`);
    }

    if (pointsToRedeem <= 0) {
      throw new Error("Points to redeem must be greater than 0");
    }

    if (customer.loyaltyPointsBalance < pointsToRedeem) {
      throw new Error(
        `Insufficient loyalty points. Available: ${customer.loyaltyPointsBalance}, Requested: ${pointsToRedeem}`
      );
    }

    const oldBalance = customer.loyaltyPointsBalance;
    customer.loyaltyPointsBalance -= pointsToRedeem;
    customer.updatedAt = new Date();

    const updatedCustomer = await updateDb(customerRepo, customer, { queryRunner });

    // Create loyalty transaction
    const tx = loyaltyRepo.create({
      pointsChange: -pointsToRedeem,
      transactionType: "redeem",
      notes: `Redeemed on Sale #${saleId}`,
      customer: updatedCustomer,
      sale: { id: saleId },
      timestamp: new Date(),
    });
    const savedTx = await saveDb(loyaltyRepo, tx, { queryRunner });

    // Audit log for loyalty transaction creation
    await auditLogger.logCreate("LoyaltyTransaction", savedTx.id, savedTx, user);

    logger.info(
      `[CustomerState] Redeemed ${pointsToRedeem} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    // NOTE: Side effects are now handled by the subscriber.
    return { customer: updatedCustomer, pointsRedeemed: pointsToRedeem };
  }

  /**
   * Manually adjust loyalty points (admin adjustment)
   * @param {number} customerId
   * @param {number} pointsChange - Positive (add) or negative (deduct)
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ customer: any, pointsChanged: number }>}
   */
  async manualAdjustPoints(
    customerId,
    pointsChange,
    reason,
    user = "system",
    queryRunner = null
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    if (!loyaltyEnabled) {
      throw new Error("Loyalty points are disabled");
    }

    const customerRepo = this._getRepo(queryRunner, Customer);
    const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);

    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error(`Customer #${customerId} not found`);
    }

    if (pointsChange === 0) {
      throw new Error("Points change cannot be zero");
    }

    if (pointsChange < 0 && customer.loyaltyPointsBalance + pointsChange < 0) {
      throw new Error(
        `Insufficient loyalty points. Available: ${customer.loyaltyPointsBalance}, Requested deduction: ${-pointsChange}`
      );
    }

    const oldBalance = customer.loyaltyPointsBalance;
    customer.loyaltyPointsBalance += pointsChange;
    if (pointsChange > 0) {
      customer.lifetimePointsEarned = (customer.lifetimePointsEarned || 0) + pointsChange;
    }
    customer.updatedAt = new Date();

    // Check status change if adding points
    let statusChanged = false;
    let oldStatus = customer.status;
    if (pointsChange > 0) {
      const newStatus = this._determineStatus(customer.lifetimePointsEarned);
      if (newStatus !== oldStatus) {
        customer.status = newStatus;
        statusChanged = true;
      }
    }

    const updatedCustomer = await updateDb(customerRepo, customer, { queryRunner });

    // Create loyalty transaction
    const tx = loyaltyRepo.create({
      pointsChange: pointsChange,
      transactionType: "adjustment",
      notes: `Manual adjustment: ${reason}`,
      customer: updatedCustomer,
      sale: null,
      timestamp: new Date(),
    });
    const savedTx = await saveDb(loyaltyRepo, tx, { queryRunner });

    // Audit log for loyalty transaction creation
    await auditLogger.logCreate("LoyaltyTransaction", savedTx.id, savedTx, user);

    logger.info(
      `[CustomerState] Manual adjustment: ${pointsChange > 0 ? "+" : ""}${pointsChange} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    // NOTE: Side effects (status change, notifications) are now handled by the subscriber.
    return { customer: updatedCustomer, pointsChanged: pointsChange };
  }

  /**
   * Determine customer status based on lifetime points
   * @private
   */
  _determineStatus(lifetimePoints) {
    // Can be made configurable via system settings
    if (lifetimePoints >= 5000) return "elite";
    if (lifetimePoints >= 1000) return "vip";
    return "regular";
  }

  /**
   * Send notification when customer status changes
   * @private
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
        queryRunner
      );
    } catch (err) {
      logger.error(`[CustomerState] Failed to send milestone notification:`, err);
    }

    // Email to customer
    if (canSendEmail && customer.email) {
      const subject = `Congratulations! You've reached ${newStatus} status!`;
      const textBody = `Dear ${customer.name},\n\nCongratulations! You have reached ${newStatus} status at ${company}.\n\nWe appreciate your continued patronage and look forward to serving you with exclusive benefits.\n\nThank you for being a valued customer!\n\nBest regards,\n${company}`;
      const htmlBody = textBody.replace(/\n/g, "<br>");

      try {
        logger.info(`[CustomerState] Would send status upgrade email to ${customer.email}`);
        // await emailSender.send(customer.email, subject, htmlBody, textBody);
      } catch (err) {
        logger.error(`[CustomerState] Failed to send email to ${customer.email}:`, err);
      }
    }

    // SMS to customer
    if (canSendSms && customer.phone) {
      try {
        const smsMessage = `Congratulations! You've reached ${newStatus} status at ${company}. Thank you for your loyalty!`;
        logger.info(`[CustomerState] Would send SMS to ${customer.phone}: ${smsMessage}`);
        // await smsSender.send(customer.phone, smsMessage);
      } catch (err) {
        logger.error(`[CustomerState] Failed to send SMS to ${customer.phone}:`, err);
      }
    }
  }

  /**
   * Get customer loyalty history with summary
   * @param {number} customerId
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async getLoyaltyHistory(customerId, queryRunner = null) {
    const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);

    const transactions = await loyaltyRepo
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.sale", "sale")
      .where("tx.customerId = :customerId", { customerId })
      .orderBy("tx.timestamp", "DESC")
      .getMany();

    const summary = {
      totalEarned: 0,
      totalRedeemed: 0,
      totalAdjusted: 0,
    };

    for (const tx of transactions) {
      if (tx.transactionType === "earn") {
        summary.totalEarned += tx.pointsChange;
      } else if (tx.transactionType === "redeem") {
        summary.totalRedeemed += Math.abs(tx.pointsChange);
      } else if (tx.transactionType === "adjustment") {
        summary.totalAdjusted += tx.pointsChange;
      }
    }

    return {
      transactions,
      summary,
    };
  }
}

module.exports = { CustomerStateService };