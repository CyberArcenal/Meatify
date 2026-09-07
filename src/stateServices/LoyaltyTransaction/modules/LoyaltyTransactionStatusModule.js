// src/stateServices/loyaltyTransaction/modules/LoyaltyTransactionStatusModule.js
const { logger } = require("../../../utils/logger");
const system = require("../../../utils/system");

/**
 * LoyaltyTransactionStatusModule - Handles status determination and validation for loyalty transactions.
 */
class LoyaltyTransactionStatusModule {
  /**
   * Determine customer status based on lifetime points
   * @param {number} lifetimePoints - Customer's lifetime earned points
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<string>}
   */
  async determineStatus(lifetimePoints, queryRunner = null) {
    const vipThreshold = await system.loyaltyVipThreshold();
    const eliteThreshold = await system.loyaltyEliteThreshold();
    if (lifetimePoints >= eliteThreshold) return "elite";
    if (lifetimePoints >= vipThreshold) return "vip";
    return "regular";
  }

  /**
   * Validate if a transaction can be created
   * @param {Object} transactionData - The transaction data
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateCreate(transactionData, context = {}) {
    logger.debug(`[LoyaltyStatus] Validating transaction creation`);

    // 1. pointsChange cannot be zero
    if (transactionData.pointsChange === 0) {
      return { valid: false, reason: "Points change cannot be zero" };
    }

    // 2. transactionType must be valid
    const validTypes = ['earn', 'redeem', 'adjustment', 'refund'];
    if (!validTypes.includes(transactionData.transactionType)) {
      return { valid: false, reason: `Invalid transaction type: ${transactionData.transactionType}` };
    }

    return { valid: true };
  }

  /**
   * Validate if a transaction can be updated
   * @param {Object} transaction - The existing transaction entity
   * @param {Object} updates - The updates to apply
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateUpdate(transaction, updates, context = {}) {
    logger.debug(`[LoyaltyStatus] Validating transaction #${transaction.id} update`);

    // Cannot change immutable fields
    const forbiddenFields = ['pointsChange', 'transactionType', 'customerId', 'saleId'];
    const attemptedForbidden = forbiddenFields.filter(f => updates[f] !== undefined);
    if (attemptedForbidden.length > 0) {
      return {
        valid: false,
        reason: `Cannot change immutable fields: ${attemptedForbidden.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate if a transaction can be deleted
   * @param {Object} transaction - The existing transaction entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateDelete(transaction, context = {}) {
    logger.debug(`[LoyaltyStatus] Validating transaction #${transaction.id} deletion`);
    // Currently no restrictions on deletion
    return { valid: true };
  }

  /**
   * Get transaction summary statistics
   * @param {Array} transactions - Array of transaction objects
   * @returns {{ totalEarned: number; totalRedeemed: number; totalAdjusted: number }}
   */
  getTransactionSummary(transactions) {
    const summary = { totalEarned: 0, totalRedeemed: 0, totalAdjusted: 0 };

    for (const tx of transactions) {
      if (tx.transactionType === "earn") {
        summary.totalEarned += tx.pointsChange;
      } else if (tx.transactionType === "redeem") {
        summary.totalRedeemed += Math.abs(tx.pointsChange);
      } else if (tx.transactionType === "adjustment") {
        summary.totalAdjusted += tx.pointsChange;
      }
    }

    return summary;
  }
}

module.exports = LoyaltyTransactionStatusModule;