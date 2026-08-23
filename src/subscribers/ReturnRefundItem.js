// src/subscribers/ReturnRefundItemSubscriber.js
const ReturnRefundItem = require("../entities/ReturnRefundItem");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading ReturnRefundItemSubscriber");

class ReturnRefundItemSubscriber {
  listenTo() {
    return ReturnRefundItem;
  }

  /**
   * @param {import("../entities/ReturnRefundItem")} entity
   */
  beforeInsert(entity) {
    logger.debug("[ReturnRefundItemSubscriber] beforeInsert:", {
      id: entity?.id,
      returnRefundId: entity?.returnRefundId,
      meatId: entity?.meatId,
      batchId: entity?.batchId,
      weightKg: entity?.weightKg,
    });
  }

  /**
   * @param {import("../entities/ReturnRefundItem")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[ReturnRefundItemSubscriber] afterInsert:", {
      id: entity.id,
      returnRefundId: entity.returnRefundId,
      meatId: entity.meatId,
      batchId: entity.batchId,
      weightKg: entity.weightKg,
      subtotal: entity.subtotal,
    });
  }

  /**
   * @param {import("../entities/ReturnRefundItem")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[ReturnRefundItemSubscriber] beforeUpdate:", {
      id: entity?.id,
      weightKg: entity?.weightKg,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[ReturnRefundItemSubscriber] afterUpdate:", {
      id: entity?.id,
      oldWeight: databaseEntity?.weightKg,
      newWeight: entity?.weightKg,
      oldReason: databaseEntity?.reason,
      newReason: entity?.reason,
    });
  }

  /**
   * @param {import("../entities/ReturnRefundItem")} entity
   */
  beforeRemove(entity) {
    logger.debug("[ReturnRefundItemSubscriber] beforeRemove:", {
      id: entity?.id,
      returnRefundId: entity?.returnRefundId,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[ReturnRefundItemSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = ReturnRefundItemSubscriber;