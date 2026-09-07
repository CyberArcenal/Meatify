// src/stateServices/meat/modules/status/MeatDeactivatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const NotificationSender = require("../../../common/NotificationSender");

/**
 * MeatDeactivatedModule - Handles side effects when a meat product is deactivated.
 * Includes UI broadcast and in-app notification.
 */
class MeatDeactivatedModule {
  /**
   * Handle meat deactivation side effects
   * @param {Object} meat - The meat entity
   * @param {Object} options - Additional options
   * @param {number} options.activeBatchCount - Number of active batches cleared
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(meat, options = {}, user = "system", queryRunner = null) {
    const { activeBatchCount = 0 } = options;

    logger.info(`[MeatDeactivated] Meat #${meat.id} (${meat.name}) deactivated by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeactivated(meat, activeBatchCount);

    // 2. Send notification (in-app)
    await this._notifyDeactivated(meat, activeBatchCount, user, queryRunner);
  }

  /**
   * Broadcast meat deactivated to UI
   * @private
   */
  _broadcastDeactivated(meat, activeBatchCount) {
    UIBroadcaster.meat("deactivated", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      activeBatchCount,
      deactivatedAt: new Date().toISOString(),
    });
  }

  /**
   * Send deactivation notification
   * @private
   */
  async _notifyDeactivated(meat, activeBatchCount, user, queryRunner) {
    const message = `Meat "${meat.name}" (SKU: ${meat.sku}) has been deactivated.` +
      (activeBatchCount > 0 ? ` ${activeBatchCount} active batch(es) were cleared.` : "");

    await NotificationSender.sendInApp(
      "Meat Product Deactivated",
      message,
      "warning",
      {
        meatId: meat.id,
        meatName: meat.name,
        sku: meat.sku,
        activeBatchCount,
      },
      user,
      queryRunner
    );
  }
}

module.exports = MeatDeactivatedModule;