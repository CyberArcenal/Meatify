// src/stateServices/supplier/modules/SupplierAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * SupplierAuditModule - Handles audit logging for supplier events.
 * Delegates to the common AuditLogger.
 */
class SupplierAuditModule {
  /**
   * Log supplier creation
   * @param {number} supplierId - The supplier ID
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async logCreated(supplierId, supplier, user = "system") {
    await AuditLogger.logCreate("Supplier", supplierId, supplier, user);
  }

  /**
   * Log supplier activation
   * @param {number} supplierId - The supplier ID
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async logActivated(supplierId, supplier, user = "system") {
    await AuditLogger.logUpdate(
      "Supplier",
      supplierId,
      { action: "activated" },
      { isActive: true },
      user
    );
  }

  /**
   * Log supplier deactivation
   * @param {number} supplierId - The supplier ID
   * @param {Object} supplier - The supplier entity
   * @param {Object} options - Additional options
   * @param {number} options.meatsReassigned - Number of meats reassigned
   * @param {number} options.pendingPurchases - Number of pending purchases
   * @param {string} user - User performing the action
   */
  async logDeactivated(supplierId, supplier, options = {}, user = "system") {
    const { meatsReassigned = 0, pendingPurchases = 0 } = options;

    await AuditLogger.logUpdate(
      "Supplier",
      supplierId,
      { action: "deactivated", meatsReassigned, pendingPurchases },
      { isActive: false },
      user
    );
  }

  /**
   * Log supplier merge
   * @param {Object} data - Merge data
   * @param {number} data.sourceSupplierId - Source supplier ID
   * @param {number} data.targetSupplierId - Target supplier ID
   * @param {number} data.meatsReassigned - Number of meats reassigned
   * @param {number} data.purchasesReassigned - Number of purchases reassigned
   * @param {number} data.batchesReassigned - Number of batches reassigned
   * @param {string} user - User performing the action
   */
  async logMerged(data, user = "system") {
    const {
      sourceSupplierId,
      targetSupplierId,
      meatsReassigned = 0,
      purchasesReassigned = 0,
      batchesReassigned = 0,
    } = data;

    await AuditLogger.logUpdate(
      "Supplier",
      sourceSupplierId,
      {
        action: "merged",
        targetSupplierId,
        meatsReassigned,
        purchasesReassigned,
        batchesReassigned,
      },
      { isActive: false },
      user
    );
  }

  /**
   * Log supplier update (generic)
   * @param {number} supplierId - The supplier ID
   * @param {Object} changes - The changes made
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async logUpdated(supplierId, changes, supplier, user = "system") {
    await AuditLogger.logUpdate("Supplier", supplierId, changes, supplier, user);
  }

  /**
   * Log supplier deletion
   * @param {number} supplierId - The supplier ID
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async logDeleted(supplierId, supplier, user = "system") {
    await AuditLogger.logDelete("Supplier", supplierId, supplier, user);
  }

  /**
   * Log supplier restore
   * @param {number} supplierId - The supplier ID
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async logRestored(supplierId, supplier, user = "system") {
    await AuditLogger.logUpdate(
      "Supplier",
      supplierId,
      { action: "restored" },
      { isActive: true },
      user
    );
  }
}

module.exports = SupplierAuditModule;