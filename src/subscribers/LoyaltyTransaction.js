// src/subscribers/LoyaltyTransactionSubscriber.js
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading LoyaltyTransactionSubscriber");

class LoyaltyTransactionSubscriber {
  listenTo() {
    return LoyaltyTransaction;
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  beforeInsert(entity) {
    logger.debug("[LoyaltyTransactionSubscriber] beforeInsert:", {
      id: entity?.id,
      customerId: entity?.customerId,
      pointsChange: entity?.pointsChange,
      transactionType: entity?.transactionType,
    });
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[LoyaltyTransactionSubscriber] afterInsert:", {
      id: entity.id,
      customerId: entity.customerId,
      pointsChange: entity.pointsChange,
      transactionType: entity.transactionType,
      notes: entity.notes,
    });

    // Log significant point changes
    const absPoints = Math.abs(entity.pointsChange);
    if (absPoints > 500) {
      logger.info(`[LoyaltyTransactionSubscriber] Large points transaction: ${entity.pointsChange} points for customer #${entity.customerId}`);
    }
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[LoyaltyTransactionSubscriber] beforeUpdate:", {
      id: entity?.id,
      notes: entity?.notes,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[LoyaltyTransactionSubscriber] afterUpdate:", {
      id: entity?.id,
      oldNotes: databaseEntity?.notes,
      newNotes: entity?.notes,
    });
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  beforeRemove(entity) {
    logger.debug("[LoyaltyTransactionSubscriber] beforeRemove:", {
      id: entity?.id,
      customerId: entity?.customerId,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[LoyaltyTransactionSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = LoyaltyTransactionSubscriber;