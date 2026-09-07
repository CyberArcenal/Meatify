// src/stateServices/customer/modules/CustomerPointsModule.js
const { logger } = require("../../../utils/logger");
const system = require("../../../utils/system");
const { updateDb, saveDb } = require("../../../utils/dbUtils/dbActions");

/**
 * CustomerPointsModule - Handles loyalty points business logic.
 * This module performs data mutations (earn, redeem, adjust points).
 * Side effects (notifications, UI broadcasts) are handled by the subscriber.
 */
class CustomerPointsModule {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.customerRepo = dataSource.getRepository(require("../../../entities/Customer"));
    this.loyaltyRepo = dataSource.getRepository(require("../../../entities/LoyaltyTransaction"));
  }

  /**
   * Helper: get repository (transactional)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Earn loyalty points for a customer (from a sale)
   * @param {number} customerId
   * @param {number} amountSpent
   * @param {number} saleId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ customer: any, pointsEarned: number }>}
   */
  async earnPoints(customerId, amountSpent, saleId, user = "system", queryRunner = null) {
    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    if (!loyaltyEnabled) {
      logger.info(`[CustomerPoints] Loyalty disabled, skipping earn for customer #${customerId}`);
      return { customer: null, pointsEarned: 0 };
    }

    const customerRepo = this._getRepo(queryRunner, this.customerRepo.target);
    const loyaltyRepo = this._getRepo(queryRunner, this.loyaltyRepo.target);

    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error(`Customer #${customerId} not found`);
    }
    if (!customer.isActive) {
      logger.warn(`[CustomerPoints] Customer #${customerId} is inactive, skipping points`);
      return { customer, pointsEarned: 0 };
    }

    const rate = await system.getLoyaltyPointRate();
    const pointsEarned = Math.floor(amountSpent / rate);

    if (pointsEarned <= 0) {
      logger.info(`[CustomerPoints] No points earned for customer #${customerId} (amount: ${amountSpent})`);
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

    logger.info(
      `[CustomerPoints] Earned ${pointsEarned} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    return { customer: updatedCustomer, pointsEarned };
  }

  /**
   * Redeem loyalty points (from a sale)
   * @param {number} customerId
   * @param {number} pointsToRedeem
   * @param {number} saleId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ customer: any, pointsRedeemed: number }>}
   */
  async redeemPoints(customerId, pointsToRedeem, saleId, user = "system", queryRunner = null) {
    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    if (!loyaltyEnabled) {
      throw new Error("Loyalty points are disabled");
    }

    const customerRepo = this._getRepo(queryRunner, this.customerRepo.target);
    const loyaltyRepo = this._getRepo(queryRunner, this.loyaltyRepo.target);

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

    logger.info(
      `[CustomerPoints] Redeemed ${pointsToRedeem} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    return { customer: updatedCustomer, pointsRedeemed: pointsToRedeem };
  }

  /**
   * Manually adjust loyalty points (admin adjustment)
   * @param {number} customerId
   * @param {number} pointsChange
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ customer: any, pointsChanged: number }>}
   */
  async manualAdjustPoints(customerId, pointsChange, reason, user = "system", queryRunner = null) {
    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    if (!loyaltyEnabled) {
      throw new Error("Loyalty points are disabled");
    }

    const customerRepo = this._getRepo(queryRunner, this.customerRepo.target);
    const loyaltyRepo = this._getRepo(queryRunner, this.loyaltyRepo.target);

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
    if (pointsChange > 0) {
      const oldStatus = customer.status;
      const newStatus = this._determineStatus(customer.lifetimePointsEarned);
      if (newStatus !== oldStatus) {
        customer.status = newStatus;
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

    logger.info(
      `[CustomerPoints] Manual adjustment: ${pointsChange > 0 ? "+" : ""}${pointsChange} points for customer #${customerId}. Balance: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance}`
    );

    return { customer: updatedCustomer, pointsChanged: pointsChange };
  }

  /**
   * Determine customer status based on lifetime points
   * @private
   */
  _determineStatus(lifetimePoints) {
    if (lifetimePoints >= 5000) return "elite";
    if (lifetimePoints >= 1000) return "vip";
    return "regular";
  }

  /**
   * Get customer loyalty history with summary
   * @param {number} customerId
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async getLoyaltyHistory(customerId, queryRunner = null) {
    const loyaltyRepo = this._getRepo(queryRunner, this.loyaltyRepo.target);

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

    return { transactions, summary };
  }
}

module.exports = CustomerPointsModule;