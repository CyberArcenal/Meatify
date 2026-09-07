// src/stateServices/sale/SaleStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Sale = require("../../entities/Sale");
const SaleItem = require("../../entities/SaleItem");
const Customer = require("../../entities/Customer");
const LoyaltyTransaction = require("../../entities/LoyaltyTransaction");
const SalePaidModule = require("./modules/status/SalePaidModule");
const SaleRefundedModule = require("./modules/status/SaleRefundedModule");
const SaleVoidedModule = require("./modules/status/SaleVoidedModule");
const SaleInventoryModule = require("./modules/SaleInventoryModule");
const SaleLoyaltyModule = require("./modules/SaleLoyaltyModule");
const SalePaymentModule = require("./modules/SalePaymentModule");
const SaleNotificationModule = require("./modules/SaleNotificationModule");
const SaleStatusModule = require("./modules/SaleStatusModule");
const SaleAuditModule = require("./modules/SaleAuditModule");

/**
 * SaleStateService - Orchestrates side effects for sale state transitions.
 * It does NOT update the sale status – that is done by the service or subscriber.
 * All methods here react to status changes (onPaid, onRefunded, onVoided)
 * and perform necessary business logic (stock deduction, loyalty, notifications, etc.).
 */
class SaleStateService {
  /**
   * @param {import("typeorm").DataSource"} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.saleRepo = dataSource.getRepository(Sale);
    this.saleItemRepo = dataSource.getRepository(SaleItem);
    this.customerRepo = dataSource.getRepository(Customer);
    this.loyaltyRepo = dataSource.getRepository(LoyaltyTransaction);

    // ─── Initialize modules ──────────────────────────────────────
    this.inventoryModule = new SaleInventoryModule(dataSource);
    this.loyaltyModule = new SaleLoyaltyModule(dataSource);
    this.paymentModule = new SalePaymentModule();
    this.notificationModule = new SaleNotificationModule();
    this.statusModule = new SaleStatusModule();
    this.auditModule = new SaleAuditModule();

    // ─── Status modules with dependencies ───────────────────────
    this.paidModule = new SalePaidModule(
      this.inventoryModule,
      this.loyaltyModule,
      this.paymentModule,
      this.notificationModule,
      this.auditModule
    );
    this.refundedModule = new SaleRefundedModule(
      this.inventoryModule,
      this.loyaltyModule,
      this.notificationModule,
      this.auditModule
    );
    this.voidedModule = new SaleVoidedModule(
      this.notificationModule,
      this.auditModule
    );
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔄 STATE TRANSITION SIDE EFFECTS (on...)
  // ============================================================

  /**
   * React to a sale becoming 'paid'.
   * This is called after the status has already been updated to 'paid'.
   * It handles FIFO batch deduction, loyalty points, notifications, receipt printing, cash drawer.
   * @param {number} saleId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} Updated sale entity
   */
  async onPaid(saleId, user = "system", queryRunner = null) {
    const saleRepo = this._getRepo(queryRunner, this.saleRepo.target);

    // Load the sale with its items and customer
    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["saleItems", "saleItems.meat", "saleItems.batch", "customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    if (sale.status !== "paid") {
      logger.warn(
        `[SaleState] onPaid called for sale #${saleId} with status '${sale.status}' – expected 'paid'. Proceeding anyway.`
      );
    }

    // 1. Validate paid (placeholder for future)
    const validation = this.statusModule.validatePaid(sale, {});
    if (!validation.valid) {
      logger.warn(`[SaleState] Paid validation: ${validation.reason}`);
    }

    // 2. Handle paid side effects (inventory, loyalty, payment, notifications)
    const updatedSale = await this.paidModule.handle(sale, user, queryRunner);

    // 3. Save the updated sale (with new total and items)
    const savedSale = await saleRepo.save(updatedSale);

    logger.info(`[SaleState] onPaid completed for sale #${saleId}`);
    return savedSale;
  }

  /**
   * React to a sale becoming 'refunded'.
   * Reverses stock deductions and loyalty points.
   * @param {number} saleId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} Updated sale entity
   */
  async onRefunded(saleId, reason = "", user = "system", queryRunner = null) {
    const saleRepo = this._getRepo(queryRunner, this.saleRepo.target);

    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["saleItems", "saleItems.batch", "saleItems.meat", "customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    // 1. Validate refunded (placeholder for future)
    const validation = this.statusModule.validateRefunded(sale, {});
    if (!validation.valid) {
      logger.warn(`[SaleState] Refund validation: ${validation.reason}`);
    }

    // 2. Handle refunded side effects (stock reversal, loyalty reversal)
    await this.refundedModule.handle(sale, reason, user, queryRunner);

    logger.info(`[SaleState] onRefunded completed for sale #${saleId}`);
    return sale;
  }

  /**
   * React to a sale becoming 'voided' (before payment).
   * No stock changes – just logs and notifications.
   * @param {number} saleId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} Updated sale entity
   */
  async onVoided(saleId, reason = "", user = "system", queryRunner = null) {
    const saleRepo = this._getRepo(queryRunner, this.saleRepo.target);

    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    if (sale.status !== "voided") {
      logger.warn(
        `[SaleState] onVoided called for sale #${saleId} with status '${sale.status}' – expected 'voided'. Proceeding anyway.`
      );
    }

    // 1. Validate voided (placeholder for future)
    const validation = this.statusModule.validateVoided(sale, {});
    if (!validation.valid) {
      logger.warn(`[SaleState] Void validation: ${validation.reason}`);
    }

    // 2. Handle voided side effects (audit + notification)
    await this.voidedModule.handle(sale, reason, user, queryRunner);

    logger.info(`[SaleState] onVoided completed for sale #${saleId}`);
    return sale;
  }
}

module.exports = { SaleStateService };