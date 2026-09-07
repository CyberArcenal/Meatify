// src/stateServices/customer/CustomerStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Customer = require("../../entities/Customer");
const CustomerCreatedModule = require("./modules/status/CustomerCreatedModule");
const CustomerStatusChangeModule = require("./modules/status/CustomerStatusChangeModule");
const CustomerPointsChangeModule = require("./modules/status/CustomerPointsChangeModule");
const CustomerDeletedModule = require("./modules/status/CustomerDeletedModule");
const CustomerRestoredModule = require("./modules/status/CustomerRestoredModule");
const CustomerAuditModule = require("./modules/CustomerAuditModule");
const CustomerPointsModule = require("./modules/CustomerPointsModule");

/**
 * CustomerStateService - Orchestrates side effects for customer state changes.
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

    // ─── Initialize modules ──────────────────────────────────────
    this.createdModule = new CustomerCreatedModule();
    this.statusChangeModule = new CustomerStatusChangeModule();
    this.pointsChangeModule = new CustomerPointsChangeModule();
    this.deletedModule = new CustomerDeletedModule();
    this.restoredModule = new CustomerRestoredModule();
    this.auditModule = new CustomerAuditModule();
    this.pointsModule = new CustomerPointsModule(dataSource);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔄 SIDE EFFECTS (called by subscriber)
  // ============================================================

  /**
   * Side effect after a customer is created
   * Called from CustomerSubscriber.afterInsert
   * @param {number} customerId
   * @param {Customer} customerEntity
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreate(customerId, customerEntity, user = "system", queryRunner = null) {
    // 1. Handle creation side effects (UI broadcast + welcome email)
    await this.createdModule.handle(customerEntity, user, queryRunner);

    // 2. Audit log
    await this.auditModule.logCreated(customerId, customerEntity, user);
  }

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
    // 1. Get full customer entity
    const customerRepo = this._getRepo(queryRunner, this.customerRepo.target);
    const customer = await customerRepo.findOne({ where: { id: customerId } });

    // 2. Handle status change side effects
    await this.statusChangeModule.handle(
      customerId, oldStatus, newStatus, customer, user, queryRunner
    );

    // 3. Audit log
    await this.auditModule.logStatusChange(customerId, oldStatus, newStatus, user);
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
    // 1. Get full customer entity (for notification)
    const customerRepo = this._getRepo(queryRunner, this.customerRepo.target);
    const customer = await customerRepo.findOne({ where: { id: customerId } });

    // 2. Handle points change side effects
    await this.pointsChangeModule.handle(
      customerId, oldBalance, newBalance, customer, user, queryRunner
    );

    // 3. Audit log
    await this.auditModule.logPointsChange(customerId, oldBalance, newBalance, user);
  }

  /**
   * Side effect after a customer is soft-deleted
   * @param {number} customerId
   * @param {Customer} customer
   * @param {string} user
   */
  async onDelete(customerId, customer, user = "system") {
    await this.deletedModule.handle(customerId, customer?.name, user);
    await this.auditModule.logDeleted(customerId, customer, user);
  }

  /**
   * Side effect after a customer is restored
   * @param {number} customerId
   * @param {Customer} customer
   * @param {string} user
   */
  async onRestore(customerId, customer, user = "system") {
    await this.restoredModule.handle(customer, user);
    await this.auditModule.logRestored(customerId, customer, user);
  }

  // ============================================================
  // 🔄 BUSINESS LOGIC (delegated to points module)
  // ============================================================

  /**
   * Earn loyalty points for a customer (called from SaleStateService)
   */
  async earnPoints(customerId, amountSpent, saleId, user = "system", queryRunner = null) {
    const result = await this.pointsModule.earnPoints(
      customerId, amountSpent, saleId, user, queryRunner
    );
    return result;
  }

  /**
   * Redeem loyalty points (called from SaleService when applying redemption)
   */
  async redeemPoints(customerId, pointsToRedeem, saleId, user = "system", queryRunner = null) {
    const result = await this.pointsModule.redeemPoints(
      customerId, pointsToRedeem, saleId, user, queryRunner
    );
    return result;
  }

  /**
   * Manually adjust loyalty points (admin adjustment)
   */
  async manualAdjustPoints(customerId, pointsChange, reason, user = "system", queryRunner = null) {
    const result = await this.pointsModule.manualAdjustPoints(
      customerId, pointsChange, reason, user, queryRunner
    );
    return result;
  }

  /**
   * Get customer loyalty history with summary
   */
  async getLoyaltyHistory(customerId, queryRunner = null) {
    return this.pointsModule.getLoyaltyHistory(customerId, queryRunner);
  }
}

module.exports = { CustomerStateService };