// src/stateServices/sale/modules/status/SaleVoidedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SaleVoidedModule - Handles side effects when a sale is voided.
 * This is simple - just audit log and notification.
 */
class SaleVoidedModule {
  /**
   * @param {Object} notificationModule - SaleNotificationModule instance
   * @param {Object} auditModule - SaleAuditModule instance
   */
  constructor(notificationModule, auditModule) {
    this.notificationModule = notificationModule;
    this.auditModule = auditModule;
  }

  /**
   * Handle sale voided side effects
   * @param {Object} sale - The sale entity
   * @param {string} reason - Void reason
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The sale entity
   */
  async handle(sale, reason = "", user = "system", queryRunner = null) {
    logger.info(`[SaleVoided] Processing void for sale #${sale.id}`);

    // ─── STEP 1: Audit log ──────────────────────────────────────
    await this.auditModule.logVoided(sale.id, sale, reason, user);

    // ─── STEP 2: Notification ──────────────────────────────────
    await this.notificationModule.notifyVoided(sale, reason, user, queryRunner);

    logger.info(`[SaleVoided] Completed for sale #${sale.id}`);
    return sale;
  }
}

module.exports = SaleVoidedModule;