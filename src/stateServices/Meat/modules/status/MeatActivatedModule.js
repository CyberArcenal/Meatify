// src/stateServices/meat/modules/status/MeatActivatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const NotificationSender = require("../../../common/NotificationSender");

/**
 * MeatActivatedModule - Handles side effects when a meat product is activated.
 * Includes UI broadcast and in-app notification.
 */
class MeatActivatedModule {
  /**
   * Handle meat activation side effects
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(meat, user = "system", queryRunner = null) {
    logger.info(`[MeatActivated] Meat #${meat.id} (${meat.name}) activated by ${user}`);

    // 1. Broadcast to UI
    this._broadcastActivated(meat);

    // 2. Send notification (in-app)
    await this._notifyActivated(meat, user, queryRunner);
  }

  /**
   * Broadcast meat activated to UI
   * @private
   */
  _broadcastActivated(meat) {
    UIBroadcaster.meat("activated", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      pricePerKg: meat.pricePerKg,
      activatedAt: new Date().toISOString(),
    });
  }

  /**
   * Send activation notification
   * @private
   */
  async _notifyActivated(meat, user, queryRunner) {
    await NotificationSender.sendInApp(
      "Meat Product Activated",
      `Meat "${meat.name}" (SKU: ${meat.sku}) has been activated.`,
      "info",
      {
        meatId: meat.id,
        meatName: meat.name,
        sku: meat.sku,
      },
      user,
      queryRunner
    );
  }
}

module.exports = MeatActivatedModule;