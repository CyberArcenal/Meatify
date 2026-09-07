// src/stateServices/sale/modules/status/SaleRefundedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SaleRefundedModule - Handles side effects when a sale is refunded.
 * This orchestrates stock reversal and loyalty reversal.
 */
class SaleRefundedModule {
  /**
   * @param {Object} inventoryModule - SaleInventoryModule instance
   * @param {Object} loyaltyModule - SaleLoyaltyModule instance
   * @param {Object} notificationModule - SaleNotificationModule instance
   * @param {Object} auditModule - SaleAuditModule instance
   */
  constructor(inventoryModule, loyaltyModule, notificationModule, auditModule) {
    this.inventoryModule = inventoryModule;
    this.loyaltyModule = loyaltyModule;
    this.notificationModule = notificationModule;
    this.auditModule = auditModule;
  }

  /**
   * Handle sale refunded side effects
   * @param {Object} sale - The sale entity
   * @param {string} reason - Refund reason
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The sale entity
   */
  async handle(sale, reason = "", user = "system", queryRunner = null) {
    logger.info(`[SaleRefunded] Processing refund for sale #${sale.id}`);

    // ─── STEP 1: Reverse stock ──────────────────────────────────
    await this.inventoryModule.reverseStock(sale, user, queryRunner);

    // ─── STEP 2: Reverse loyalty points ────────────────────────
    if (sale.pointsEarn > 0 && sale.customer) {
      await this.loyaltyModule.reverseLoyalty(sale, reason, user, queryRunner);
    }

    // ─── STEP 3: Audit log ──────────────────────────────────────
    await this.auditModule.logRefunded(sale.id, sale, reason, user);

    logger.info(`[SaleRefunded] Completed for sale #${sale.id}`);
    return sale;
  }
}

module.exports = SaleRefundedModule;