// src/stateServices/supplier/modules/SupplierNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");

/**
 * SupplierNotificationModule - Handles in-app notifications for supplier events.
 * All notifications go to the admin user.
 */
class SupplierNotificationModule {
  /**
   * Send notification for supplier activation
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyActivated(supplier, user = "system", queryRunner = null) {
    await NotificationSender.sendInApp(
      "Supplier Activated",
      `Supplier "${supplier.name}" has been activated.`,
      "info",
      {
        supplierId: supplier.id,
        supplierName: supplier.name,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for supplier deactivation
   * @param {Object} supplier - The supplier entity
   * @param {Object} options - Additional options
   * @param {number} options.meatsReassigned - Number of meats reassigned
   * @param {number} options.pendingPurchases - Number of pending purchases
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyDeactivated(supplier, options = {}, user = "system", queryRunner = null) {
    const { meatsReassigned = 0, pendingPurchases = 0 } = options;

    let message = `Supplier "${supplier.name}" has been deactivated.`;
    if (meatsReassigned > 0) {
      message += ` ${meatsReassigned} meat(s) were reassigned.`;
    }
    if (pendingPurchases > 0) {
      message += ` Note: ${pendingPurchases} pending purchase(s) exist.`;
    }

    await NotificationSender.sendInApp(
      "Supplier Deactivated",
      message,
      "warning",
      {
        supplierId: supplier.id,
        supplierName: supplier.name,
        meatsReassigned,
        pendingPurchases,
        reassignToSupplierId: options.reassignToSupplierId || null,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for supplier merge
   * @param {Object} data - Merge data
   * @param {string} data.sourceSupplierName - Source supplier name
   * @param {string} data.targetSupplierName - Target supplier name
   * @param {number} data.meatsReassigned - Number of meats reassigned
   * @param {number} data.purchasesReassigned - Number of purchases reassigned
   * @param {number} data.batchesReassigned - Number of batches reassigned
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyMerged(data, user = "system", queryRunner = null) {
    const {
      sourceSupplierName,
      targetSupplierName,
      meatsReassigned = 0,
      purchasesReassigned = 0,
      batchesReassigned = 0,
    } = data;

    const message =
      `Supplier "${sourceSupplierName}" has been merged into "${targetSupplierName}". ` +
      `${meatsReassigned} meat(s), ${purchasesReassigned} purchase(s), and ${batchesReassigned} batch(es) were reassigned.`;

    await NotificationSender.sendInApp(
      "Suppliers Merged",
      message,
      "info",
      {
        sourceSupplierName,
        targetSupplierName,
        meatsReassigned,
        purchasesReassigned,
        batchesReassigned,
      },
      user,
      queryRunner
    );
  }
}

module.exports = SupplierNotificationModule;