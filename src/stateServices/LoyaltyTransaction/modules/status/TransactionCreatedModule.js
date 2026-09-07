// src/stateServices/loyaltyTransaction/modules/status/TransactionCreatedModule.js
const { logger } = require("../../../../utils/logger");
const { updateDb } = require("../../../../utils/dbUtils/dbActions");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const Customer = require("../../../../entities/Customer");

/**
 * TransactionCreatedModule - Handles side effects when a loyalty transaction is created.
 * Includes customer balance update, UI broadcast, and status change notification.
 */
class TransactionCreatedModule {
  /**
   * @param {import("typeorm").DataSource} dataSource
   * @param {Function} determineStatusFn - Function to determine customer status
   * @param {Function} notifyStatusChangeFn - Function to notify status change
   * @param {Function} notifySignificantFn - Function to notify significant transactions
   */
  constructor(dataSource, determineStatusFn, notifyStatusChangeFn, notifySignificantFn) {
    this.dataSource = dataSource;
    this.customerRepo = dataSource.getRepository(Customer);
    this.determineStatusFn = determineStatusFn;
    this.notifyStatusChangeFn = notifyStatusChangeFn;
    this.notifySignificantFn = notifySignificantFn;
  }

  /**
   * Handle transaction creation side effects
   * @param {number} transactionId - The transaction ID
   * @param {Object} transaction - The transaction entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(transactionId, transaction, user = "system", queryRunner = null) {
    logger.info(
      `[TransactionCreated] Transaction #${transactionId} created (${transaction.transactionType}, ${transaction.pointsChange > 0 ? "+" : ""}${transaction.pointsChange})`
    );

    // ─── Detect customerId ──────────────────────────────────────
    const customerId = transaction.customerId || transaction.customer?.id;
    logger.debug(`[TransactionCreated] Detected customerId: ${customerId}`);

    if (!customerId) {
      logger.warn(`[TransactionCreated] Transaction #${transaction.id} has no customerId`);
      this._broadcastCreated(transaction.id, null, transaction, null);
      return;
    }

    // ─── 1. Update Customer Balance ────────────────────────────
    let updatedCustomer = null;
    let statusChanged = false;
    let oldStatus = null;
    let newStatus = null;

    const customerRepo = this.customerRepo;
    const customer = await customerRepo.findOne({ where: { id: customerId } });

    if (!customer) {
      logger.warn(`[TransactionCreated] Customer #${customerId} not found`);
      this._broadcastCreated(transaction.id, customerId, transaction, null);
      return;
    }

    const oldBalance = customer.loyaltyPointsBalance;
    const oldLifetime = customer.lifetimePointsEarned || 0;
    oldStatus = customer.status;

    // Update balance
    const newBalance = oldBalance + transaction.pointsChange;
    customer.loyaltyPointsBalance = newBalance;

    if (transaction.pointsChange > 0) {
      customer.lifetimePointsEarned = oldLifetime + transaction.pointsChange;
    }

    // Check for status change (only when points increase)
    if (transaction.pointsChange > 0) {
      const lifetime = customer.lifetimePointsEarned || 0;
      const determinedStatus = await this.determineStatusFn(lifetime, queryRunner);
      if (determinedStatus !== oldStatus) {
        newStatus = determinedStatus;
        customer.status = newStatus;
        statusChanged = true;
        logger.debug(`[TransactionCreated] Status will change: ${oldStatus} → ${newStatus}`);
      }
    }

    customer.updatedAt = new Date();

    // Save customer
    updatedCustomer = await updateDb(customerRepo, customer, {
      queryRunner,
      skipSignal: true,
    });

    logger.info(
      `[TransactionCreated] Customer #${customer.id} balance updated: ${oldBalance} → ${updatedCustomer.loyaltyPointsBalance} (${transaction.pointsChange > 0 ? "+" : ""}${transaction.pointsChange})`
    );

    // ─── 2. If status changed, trigger side effects ──────────
    if (statusChanged && updatedCustomer && oldStatus && newStatus) {
      logger.info(
        `[TransactionCreated] Customer #${updatedCustomer.id} status changed: ${oldStatus} → ${newStatus}. Notifying...`
      );
      await this.notifyStatusChangeFn(
        updatedCustomer,
        oldStatus,
        newStatus,
        user,
        queryRunner
      );
    }

    // ─── 3. Broadcast to UI ────────────────────────────────────
    this._broadcastCreated(
      transaction.id,
      customerId,
      transaction,
      updatedCustomer?.loyaltyPointsBalance || null
    );

    // ─── 4. Significant transaction notification ──────────────
    if (Math.abs(transaction.pointsChange) > 100) {
      await this.notifySignificantFn(
        updatedCustomer || customer,
        transaction,
        user,
        queryRunner
      );
    }
  }

  /**
   * Broadcast transaction created to UI
   * @private
   */
  _broadcastCreated(transactionId, customerId, transaction, newBalance) {
    UIBroadcaster.loyalty("transactionCreated", {
      id: transactionId,
      customerId: customerId,
      type: transaction.transactionType,
      pointsChange: transaction.pointsChange,
      notes: transaction.notes,
      timestamp: transaction.timestamp,
      newBalance: newBalance,
    });
  }
}

module.exports = TransactionCreatedModule;