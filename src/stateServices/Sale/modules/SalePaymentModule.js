// src/stateServices/sale/modules/SalePaymentModule.js
const { logger } = require("../../../utils/logger");
const system = require("../../../utils/system");
const PrinterService = require("../../../services/Printer");
const CashDrawerService = require("../../../services/CashDrawer");

/**
 * SalePaymentModule - Handles hardware operations for sale events.
 * This includes receipt printing and cash drawer opening.
 */
class SalePaymentModule {
  /**
   * Print receipt for a sale (if enabled)
   * @param {number} saleId - The sale ID
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async printReceipt(saleId, user = "system", queryRunner = null) {
    const printEnabled = await system.enableReceiptPrinting();
    if (!printEnabled) {
      logger.debug(`[SalePayment] Receipt printing disabled for sale #${saleId}`);
      return;
    }

    try {
      const printerService = new PrinterService();
      await printerService.printReceipt(saleId);
      logger.info(`[SalePayment] Receipt printed for sale #${saleId}`);
    } catch (err) {
      logger.error(`[SalePayment] Failed to print receipt for sale #${saleId}:`, err);
    }
  }

  /**
   * Open cash drawer for a cash sale (if enabled)
   * @param {Object} sale - The sale entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async openCashDrawer(sale, user = "system", queryRunner = null) {
    const drawerEnabled = await system.enableCashDrawer();
    if (!drawerEnabled || sale.paymentMethod !== "cash") {
      logger.debug(`[SalePayment] Cash drawer not opened for sale #${sale.id} (drawer disabled or non-cash)`);
      return;
    }

    try {
      const cashDrawerService = new CashDrawerService();
      await cashDrawerService.openDrawer("sale");
      logger.info(`[SalePayment] Cash drawer opened for sale #${sale.id}`);
    } catch (err) {
      logger.error(`[SalePayment] Failed to open cash drawer for sale #${sale.id}:`, err);
    }
  }
}

module.exports = SalePaymentModule;