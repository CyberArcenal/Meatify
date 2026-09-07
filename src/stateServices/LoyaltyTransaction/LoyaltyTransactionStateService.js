// src/stateServices/loyaltyTransaction/LoyaltyTransactionStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const LoyaltyTransaction = require("../../entities/LoyaltyTransaction");
const Customer = require("../../entities/Customer");
const TransactionCreatedModule = require("./modules/status/TransactionCreatedModule");
const TransactionUpdatedModule = require("./modules/status/TransactionUpdatedModule");
const TransactionDeletedModule = require("./modules/status/TransactionDeletedModule");
const LoyaltyTransactionStatusModule = require("./modules/LoyaltyTransactionStatusModule");
const LoyaltyTransactionNotificationModule = require("./modules/LoyaltyTransactionNotificationModule");
const LoyaltyTransactionAuditModule = require("./modules/LoyaltyTransactionAuditModule");

/**
 * LoyaltyTransactionStateService - Orchestrates side effects for loyalty transaction events.
 * It does NOT contain CRUD operations – those belong to LoyaltyTransactionService.
 * All methods here are event handlers and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 */
class LoyaltyTransactionStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.loyaltyRepo = dataSource.getRepository(LoyaltyTransaction);
    this.customerRepo = dataSource.getRepository(Customer);

    // ─── Initialize modules ──────────────────────────────────────
    this.statusModule = new LoyaltyTransactionStatusModule();
    this.notificationModule = new LoyaltyTransactionNotificationModule();
    this.auditModule = new LoyaltyTransactionAuditModule();

    // ─── Initialize created module with dependencies ────────────
    this.createdModule = new TransactionCreatedModule(
      dataSource,
      this.statusModule.determineStatus.bind(this.statusModule),
      this.notificationModule.notifyStatusChange.bind(this.notificationModule),
      this.notificationModule.notifySignificantTransaction.bind(this.notificationModule)
    );

    this.updatedModule = new TransactionUpdatedModule();
    this.deletedModule = new TransactionDeletedModule();
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
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
  async onTransactionCreated(transactionId, transaction, user = "system", queryRunner = null) {
    // 1. Validate creation (placeholder for future)
    const validation = this.statusModule.validateCreate(transaction, {});
    if (!validation.valid) {
      logger.warn(`[LoyaltyState] Creation validation: ${validation.reason}`);
    }

    // 2. Handle creation side effects (balance update + UI broadcast)
    await this.createdModule.handle(transactionId, transaction, user, queryRunner);

    // 3. Audit log for transaction
    await this.auditModule.logCreated(transactionId, transaction, user);
  }

  /**
   * Side effect after a loyalty transaction is updated
   * @param {number} transactionId
   * @param {LoyaltyTransaction} transaction
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onTransactionUpdated(transactionId, transaction, changes, user = "system", queryRunner = null) {
    logger.info(`[LoyaltyState] ✅ Transaction #${transactionId} updated (fields: ${Object.keys(changes).join(", ")})`);

    // 1. Validate update (placeholder for future)
    const validation = this.statusModule.validateUpdate(transaction, changes, {});
    if (!validation.valid) {
      logger.warn(`[LoyaltyState] Update validation: ${validation.reason}`);
    }

    // 2. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(transactionId, transaction, changes, user);

    // 3. Audit log
    await this.auditModule.logUpdated(transactionId, changes, transaction, user);
  }

  /**
   * Optional: Side effect after a loyalty transaction is soft-deleted
   * @param {number} transactionId
   * @param {LoyaltyTransaction} transaction
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onTransactionDeleted(transactionId, transaction, user = "system", queryRunner = null) {
    logger.info(`[LoyaltyState] ✅ Transaction #${transactionId} soft-deleted by ${user}`);

    // 1. Validate deletion (placeholder for future)
    const validation = this.statusModule.validateDelete(transaction, {});
    if (!validation.valid) {
      logger.warn(`[LoyaltyState] Deletion validation: ${validation.reason}`);
    }

    // 2. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(transactionId, transaction, user);

    // 3. Audit log
    await this.auditModule.logDeleted(transactionId, transaction, user);
  }

  // ============================================================
  // 🔧 UTILITY METHODS (delegated to modules)
  // ============================================================

  /**
   * Determine customer status based on lifetime points
   * @param {number} lifetimePoints
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<string>}
   */
  async determineStatus(lifetimePoints, queryRunner = null) {
    return this.statusModule.determineStatus(lifetimePoints, queryRunner);
  }

  /**
   * Get transaction summary statistics
   * @param {Array} transactions
   * @returns {{ totalEarned: number; totalRedeemed: number; totalAdjusted: number }}
   */
  getTransactionSummary(transactions) {
    return this.statusModule.getTransactionSummary(transactions);
  }
}

module.exports = { LoyaltyTransactionStateService };