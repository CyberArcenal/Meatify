// src/stateServices/sale/modules/status/SalePaidModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SalePaidModule - Handles side effects when a sale is marked as paid.
 * This orchestrates inventory deduction, loyalty, and payment side effects.
 */
class SalePaidModule {
  /**
   * @param {Object} inventoryModule - SaleInventoryModule instance
   * @param {Object} loyaltyModule - SaleLoyaltyModule instance
   * @param {Object} paymentModule - SalePaymentModule instance
   * @param {Object} notificationModule - SaleNotificationModule instance
   * @param {Object} auditModule - SaleAuditModule instance
   */
  constructor(inventoryModule, loyaltyModule, paymentModule, notificationModule, auditModule) {
    this.inventoryModule = inventoryModule;
    this.loyaltyModule = loyaltyModule;
    this.paymentModule = paymentModule;
    this.notificationModule = notificationModule;
    this.auditModule = auditModule;
  }

  /**
   * Handle sale paid side effects
   * @param {Object} sale - The sale entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} Updated sale entity
   */
  async handle(sale, user = "system", queryRunner = null) {
    logger.info(`[SalePaid] Processing sale #${sale.id}`);

    // ─── STEP 1: Inventory Deduction ─────────────────────────────
    const { newSaleItems, recalculatedDiscount } = await this.inventoryModule.deductStock(
      sale,
      user,
      queryRunner
    );

    // ─── STEP 2: Update sale with new items and totals ────────────
    sale.saleItems = newSaleItems;
    sale.totalDiscount = recalculatedDiscount;

    let newTotal = 0;
    for (const item of newSaleItems) {
      newTotal += item.lineTotal;
    }
    if (sale.loyaltyRedeemed > 0) {
      newTotal -= sale.loyaltyRedeemed;
    }
    sale.totalAmount = Math.round(newTotal * 100) / 100;

    // ─── STEP 3: Loyalty Points ──────────────────────────────────
    const { pointsEarned, updatedCustomer } = await this.loyaltyModule.handleLoyalty(
      sale,
      user,
      queryRunner
    );
    sale.pointsEarn = pointsEarned;

    // ─── STEP 4: Update customer reference ──────────────────────
    if (updatedCustomer) {
      sale.customer = updatedCustomer;
    }

    // ─── STEP 5: Audit log ──────────────────────────────────────
    await this.auditModule.logPaid(sale.id, sale, user);

    // ─── STEP 6: Non-critical side effects ──────────────────────
    await this._handleNonCriticalEffects(sale, pointsEarned, user, queryRunner);

    logger.info(`[SalePaid] Completed for sale #${sale.id}`);
    return sale;
  }

  /**
   * Handle non-critical side effects (notifications, printer, cash drawer)
   * @private
   */
  async _handleNonCriticalEffects(sale, pointsEarned, user, queryRunner) {
    try {
      // Large sale notification
      if (sale.totalAmount > 10000) {
        await this.notificationModule.notifyLargeSale(sale, user, queryRunner);
      }

      // Loyalty milestone
      if (sale.customer && pointsEarned > 0) {
        await this.notificationModule.checkLoyaltyMilestone(sale.customer, user, queryRunner);
      }

      // Receipt printing
      await this.paymentModule.printReceipt(sale.id, user, queryRunner);

      // Cash drawer
      await this.paymentModule.openCashDrawer(sale, user, queryRunner);
    } catch (err) {
      logger.error(`[SalePaid] Non-critical side effects failed for sale #${sale.id}:`, err);
    }
  }
}

module.exports = SalePaidModule;