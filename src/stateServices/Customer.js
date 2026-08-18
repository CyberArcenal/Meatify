// src/stateServices/Customer.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const notificationService = require("../services/Notification");

// Settings getters (you can implement these as async functions)
const getLoyaltyPointRate = async () => 100; // points per peso spent
const loyaltyPointsEnabled = async () => true;
const emailEnabled = async () => true;
const smsEnabled = async () => true;
const companyName = async () => "Meatify Shop";

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

    const loyaltyEnabled = await loyaltyPointsEnabled();
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

    const rate = await getLoyaltyPointRate();
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
    await saveDb(loyaltyRepo, tx, { queryRunner });

    // Audit log
    await auditLogger.logUpdate(
      "Customer",
      customerId,
      { loyaltyPointsBalance: oldBalance },
      { loyaltyPointsBalance: updatedCustomer.loyaltyPointsBalance },
      user
    );

    logger.info(
      `[CustomerState] Earned ${pointsEarned} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    // --- Side effects ---
    try {
      // Notify if status changed
      if (newStatus !== oldStatus && (newStatus === "vip" || newStatus === "elite")) {
        await this._notifyStatusChange(customer, oldStatus, newStatus, user, queryRunner);
      }

      // Send notification for points earned (optional)
      if (pointsEarned > 0) {
        await notificationService.create(
          {
            userId: 1,
            title: "Loyalty Points Earned",
            message: `${customer.name} earned ${pointsEarned} points. Total balance: ${updatedCustomer.loyaltyPointsBalance}`,
            type: "success",
            metadata: {
              customerId: customer.id,
              pointsEarned,
              newBalance: updatedCustomer.loyaltyPointsBalance,
            },
          },
          user,
          queryRunner
        );
      }
    } catch (err) {
      logger.error(`[CustomerState] Side effects failed for customer #${customerId}:`, err);
    }

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

    const loyaltyEnabled = await loyaltyPointsEnabled();
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
    await saveDb(loyaltyRepo, tx, { queryRunner });

    // Audit log
    await auditLogger.logUpdate(
      "Customer",
      customerId,
      { loyaltyPointsBalance: oldBalance },
      { loyaltyPointsBalance: updatedCustomer.loyaltyPointsBalance },
      user
    );

    logger.info(
      `[CustomerState] Redeemed ${pointsToRedeem} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    // --- Side effects ---
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Loyalty Points Redeemed",
          message: `${customer.name} redeemed ${pointsToRedeem} points. New balance: ${updatedCustomer.loyaltyPointsBalance}`,
          type: "info",
          metadata: {
            customerId: customer.id,
            pointsRedeemed: pointsToRedeem,
            newBalance: updatedCustomer.loyaltyPointsBalance,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CustomerState] Side effects failed for customer #${customerId}:`, err);
    }

    return { customer: updatedCustomer, pointsRedeemed: pointsToRedeem };
  }

  /**
   * Manually adjust loyalty points (admin adjustment)
   * @param {number} customerId
   * @param {number} pointsChange - Positive (add) or negative (deduct)
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async manualAdjustPoints(
    customerId,
    pointsChange,
    reason,
    user = "system",
    queryRunner = null
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

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
    await saveDb(loyaltyRepo, tx, { queryRunner });

    // Audit log
    await auditLogger.logUpdate(
      "Customer",
      customerId,
      { loyaltyPointsBalance: oldBalance },
      { loyaltyPointsBalance: updatedCustomer.loyaltyPointsBalance },
      user
    );

    logger.info(
      `[CustomerState] Manual adjustment: ${pointsChange > 0 ? "+" : ""}${pointsChange} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    // --- Side effects ---
    try {
      if (statusChanged) {
        await this._notifyStatusChange(customer, oldStatus, customer.status, user, queryRunner);
      }

      await notificationService.create(
        {
          userId: 1,
          title: "Loyalty Points Adjusted",
          message: `${customer.name} - ${pointsChange > 0 ? "added" : "deducted"} ${Math.abs(pointsChange)} points. Reason: ${reason}`,
          type: "info",
          metadata: {
            customerId: customer.id,
            pointsChange,
            newBalance: updatedCustomer.loyaltyPointsBalance,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[CustomerState] Side effects failed for customer #${customerId}:`, err);
    }

    return { customer: updatedCustomer, pointsChanged: pointsChange };
  }

  /**
   * Determine customer status based on lifetime points
   * @private
   */
  _determineStatus(lifetimePoints) {
    // Thresholds can be made configurable via system settings
    if (lifetimePoints >= 5000) return "elite";
    if (lifetimePoints >= 1000) return "vip";
    return "regular";
  }

  /**
   * Send notification when customer status changes
   * @private
   */
  async _notifyStatusChange(customer, oldStatus, newStatus, user, queryRunner) {
    const company = await companyName();

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
    const canSendEmail = await emailEnabled();
    if (canSendEmail && customer.email) {
      const subject = `Congratulations! You've reached ${newStatus} status!`;
      const textBody = `Dear ${customer.name},\n\nCongratulations! You have reached ${newStatus} status at ${company}.\n\nWe appreciate your continued patronage and look forward to serving you with exclusive benefits.\n\nThank you for being a valued customer!\n\nBest regards,\n${company}`;
      const htmlBody = textBody.replace(/\n/g, "<br>");

      try {
        // Use your email sender
        logger.info(`[CustomerState] Would send status upgrade email to ${customer.email}`);
        // await emailSender.send(customer.email, subject, htmlBody, textBody);
      } catch (err) {
        logger.error(`[CustomerState] Failed to send email to ${customer.email}:`, err);
      }
    }

    // SMS to customer
    const canSendSms = await smsEnabled();
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