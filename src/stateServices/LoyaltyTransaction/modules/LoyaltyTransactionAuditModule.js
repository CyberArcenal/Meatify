// src/stateServices/loyaltyTransaction/modules/LoyaltyTransactionAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * LoyaltyTransactionAuditModule - Handles audit logging for loyalty transaction events.
 */
class LoyaltyTransactionAuditModule {
  /**
   * Log transaction creation
   * @param {number} transactionId - The transaction ID
   * @param {Object} transaction - The transaction entity
   * @param {string} user - User performing the action
   */
  async logCreated(transactionId, transaction, user = "system") {
    await AuditLogger.logCreate("LoyaltyTransaction", transactionId, transaction, user);
  }

  /**
   * Log transaction update
   * @param {number} transactionId - The transaction ID
   * @param {Object} changes - The changes made
   * @param {Object} transaction - The updated transaction entity
   * @param {string} user - User performing the action
   */
  async logUpdated(transactionId, changes, transaction, user = "system") {
    await AuditLogger.logUpdate("LoyaltyTransaction", transactionId, changes, transaction, user);
  }

  /**
   * Log transaction deletion
   * @param {number} transactionId - The transaction ID
   * @param {Object} transaction - The transaction entity
   * @param {string} user - User performing the action
   */
  async logDeleted(transactionId, transaction, user = "system") {
    await AuditLogger.logDelete("LoyaltyTransaction", transactionId, transaction, user);
  }

  /**
   * Log customer update (triggered by transaction)
   * @param {number} customerId - The customer ID
   * @param {Object} oldData - Old customer data
   * @param {Object} newData - New customer data
   * @param {string} user - User performing the action
   */
  async logCustomerUpdated(customerId, oldData, newData, user = "system") {
    await AuditLogger.logUpdate("Customer", customerId, oldData, newData, user);
  }
}

module.exports = LoyaltyTransactionAuditModule;