// src/stateServices/meat/modules/MeatAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * MeatAuditModule - Handles audit logging for meat events.
 * Delegates to the common AuditLogger.
 */
class MeatAuditModule {
  /**
   * Log meat creation
   * @param {number} meatId - The meat ID
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async logCreated(meatId, meat, user = "system") {
    await AuditLogger.logCreate("Meat", meatId, meat, user);
  }

  /**
   * Log meat activation
   * @param {number} meatId - The meat ID
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async logActivated(meatId, meat, user = "system") {
    await AuditLogger.logUpdate(
      "Meat",
      meatId,
      { action: "activated" },
      { isActive: true },
      user
    );
  }

  /**
   * Log meat deactivation
   * @param {number} meatId - The meat ID
   * @param {Object} meat - The meat entity
   * @param {Object} options - Additional options
   * @param {number} options.activeBatchCount - Number of active batches cleared
   * @param {string} user - User performing the action
   */
  async logDeactivated(meatId, meat, options = {}, user = "system") {
    const { activeBatchCount = 0 } = options;

    await AuditLogger.logUpdate(
      "Meat",
      meatId,
      { action: "deactivated", activeBatchCount },
      { isActive: false },
      user
    );
  }

  /**
   * Log meat price change
   * @param {number} meatId - The meat ID
   * @param {number} oldPrice - Previous price
   * @param {number} newPrice - New price
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async logPriceChange(meatId, oldPrice, newPrice, meat, user = "system") {
    await AuditLogger.logUpdate(
      "Meat",
      meatId,
      { pricePerKg: oldPrice },
      { pricePerKg: newPrice },
      user
    );
  }

  /**
   * Log meat update (generic)
   * @param {number} meatId - The meat ID
   * @param {Object} changes - The changes made
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async logUpdated(meatId, changes, meat, user = "system") {
    await AuditLogger.logUpdate("Meat", meatId, changes, meat, user);
  }

  /**
   * Log meat deletion
   * @param {number} meatId - The meat ID
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async logDeleted(meatId, meat, user = "system") {
    await AuditLogger.logDelete("Meat", meatId, meat, user);
  }

  /**
   * Log meat restore
   * @param {number} meatId - The meat ID
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async logRestored(meatId, meat, user = "system") {
    await AuditLogger.logUpdate(
      "Meat",
      meatId,
      { action: "restored" },
      { isActive: true },
      user
    );
  }
}

module.exports = MeatAuditModule;