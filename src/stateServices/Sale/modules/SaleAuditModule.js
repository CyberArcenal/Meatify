// src/stateServices/sale/modules/SaleAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * SaleAuditModule - Handles audit logging for sale events.
 * Delegates to the common AuditLogger.
 */
class SaleAuditModule {
  /**
   * Log sale paid
   * @param {number} saleId - The sale ID
   * @param {Object} sale - The sale entity
   * @param {string} user - User performing the action
   */
  async logPaid(saleId, sale, user = "system") {
    await AuditLogger.logUpdate(
      "Sale",
      saleId,
      { previousState: "initiated" },
      { newState: "paid", total: sale.totalAmount },
      user
    );
  }

  /**
   * Log sale refunded
   * @param {number} saleId - The sale ID
   * @param {Object} sale - The sale entity
   * @param {string} reason - Refund reason
   * @param {string} user - User performing the action
   */
  async logRefunded(saleId, sale, reason = "", user = "system") {
    await AuditLogger.logUpdate(
      "Sale",
      saleId,
      { previousState: "paid" },
      { newState: "refunded", reason },
      user
    );
  }

  /**
   * Log sale voided
   * @param {number} saleId - The sale ID
   * @param {Object} sale - The sale entity
   * @param {string} reason - Void reason
   * @param {string} user - User performing the action
   */
  async logVoided(saleId, sale, reason = "", user = "system") {
    await AuditLogger.logUpdate(
      "Sale",
      saleId,
      { previousState: "initiated" },
      { newState: "voided", reason },
      user
    );
  }
}

module.exports = SaleAuditModule;