// src/stateServices/customer/modules/CustomerAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * CustomerAuditModule - Handles audit logging for customer events.
 * Delegates to the common AuditLogger.
 */
class CustomerAuditModule {
  /**
   * Log customer creation
   * @param {number} customerId - The customer ID
   * @param {Object} customer - The customer entity
   * @param {string} user - User performing the action
   */
  async logCreated(customerId, customer, user = "system") {
    await AuditLogger.logCreate("Customer", customerId, customer, user);
  }

  /**
   * Log customer status change
   * @param {number} customerId - The customer ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} user - User performing the action
   */
  async logStatusChange(customerId, oldStatus, newStatus, user = "system") {
    await AuditLogger.logUpdate(
      "Customer",
      customerId,
      { status: oldStatus },
      { status: newStatus },
      user
    );
  }

  /**
   * Log customer points change
   * @param {number} customerId - The customer ID
   * @param {number} oldBalance - Previous balance
   * @param {number} newBalance - New balance
   * @param {string} user - User performing the action
   */
  async logPointsChange(customerId, oldBalance, newBalance, user = "system") {
    await AuditLogger.logUpdate(
      "Customer",
      customerId,
      { loyaltyPointsBalance: oldBalance },
      { loyaltyPointsBalance: newBalance },
      user
    );
  }

  /**
   * Log customer deletion
   * @param {number} customerId - The customer ID
   * @param {Object} customer - The customer entity
   * @param {string} user - User performing the action
   */
  async logDeleted(customerId, customer, user = "system") {
    await AuditLogger.logDelete("Customer", customerId, customer, user);
  }

  /**
   * Log customer restore
   * @param {number} customerId - The customer ID
   * @param {Object} customer - The customer entity
   * @param {string} user - User performing the action
   */
  async logRestored(customerId, customer, user = "system") {
    await AuditLogger.logUpdate(
      "Customer",
      customerId,
      { action: "restored" },
      { isActive: true },
      user
    );
  }

  /**
   * Log loyalty transaction creation
   * @param {number} transactionId - The transaction ID
   * @param {Object} transaction - The transaction entity
   * @param {string} user - User performing the action
   */
  async logLoyaltyTransaction(transactionId, transaction, user = "system") {
    await AuditLogger.logCreate("LoyaltyTransaction", transactionId, transaction, user);
  }
}

module.exports = CustomerAuditModule;