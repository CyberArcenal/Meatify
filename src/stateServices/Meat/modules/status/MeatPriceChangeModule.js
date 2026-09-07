// src/stateServices/meat/modules/status/MeatPriceChangeModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const NotificationSender = require("../../../common/NotificationSender");

/**
 * MeatPriceChangeModule - Handles side effects when a meat's price changes.
 * Includes UI broadcast and in-app notification.
 */
class MeatPriceChangeModule {
  /**
   * Handle meat price change side effects
   * @param {number} meatId - The meat ID
   * @param {number} oldPrice - Previous price
   * @param {number} newPrice - New price
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(meatId, oldPrice, newPrice, meat, user = "system", queryRunner = null) {
    logger.info(`[MeatPriceChange] Meat #${meatId} (${meat.name}) price changed: ${oldPrice} → ${newPrice} by ${user}`);

    // 1. Broadcast to UI
    this._broadcastPriceChange(meatId, oldPrice, newPrice, meat);

    // 2. Send notification (in-app)
    await this._notifyPriceChange(meat, oldPrice, newPrice, user, queryRunner);
  }

  /**
   * Broadcast price change to UI
   * @private
   */
  _broadcastPriceChange(meatId, oldPrice, newPrice, meat) {
    UIBroadcaster.meat("priceChanged", {
      id: meatId,
      name: meat.name,
      sku: meat.sku,
      oldPrice,
      newPrice,
      changedAt: new Date().toISOString(),
    });
  }

  /**
   * Send price change notification
   * @private
   */
  async _notifyPriceChange(meat, oldPrice, newPrice, user, queryRunner) {
    await NotificationSender.sendInApp(
      "Meat Price Updated",
      `Price for "${meat.name}" (SKU: ${meat.sku}) changed from ₱${oldPrice} to ₱${newPrice} per kg.`,
      "info",
      {
        meatId: meat.id,
        meatName: meat.name,
        oldPrice,
        newPrice,
      },
      user,
      queryRunner
    );
  }
}

module.exports = MeatPriceChangeModule;