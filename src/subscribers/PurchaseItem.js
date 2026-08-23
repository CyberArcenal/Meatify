// src/subscribers/PurchaseItemSubscriber.js
const PurchaseItem = require("../entities/PurchaseItem");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading PurchaseItemSubscriber");

class PurchaseItemSubscriber {
  listenTo() {
    return PurchaseItem;
  }

  /**
   * @param {import("../entities/PurchaseItem")} entity
   */
  beforeInsert(entity) {
    logger.debug("[PurchaseItemSubscriber] beforeInsert:", {
      id: entity?.id,
      purchaseId: entity?.purchaseId,
      meatId: entity?.meatId,
      quantity: entity?.quantity,
      unitPrice: entity?.unitPrice,
      expiryDate: entity?.expiryDate,
    });
  }

  /**
   * @param {import("../entities/PurchaseItem")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[PurchaseItemSubscriber] afterInsert:", {
      id: entity.id,
      purchaseId: entity.purchaseId,
      meatId: entity.meatId,
      quantity: entity.quantity,
      subtotal: entity.subtotal,
      expiryDate: entity.expiryDate,
    });

    // Check if expiry date is soon
    if (entity.expiryDate) {
      const expiryDate = new Date(entity.expiryDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
        logger.warn(`[PurchaseItemSubscriber] Item #${entity.id} expires in ${daysUntilExpiry} days`);
      }
    }
  }

  /**
   * @param {import("../entities/PurchaseItem")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[PurchaseItemSubscriber] beforeUpdate:", {
      id: entity?.id,
      quantity: entity?.quantity,
      unitPrice: entity?.unitPrice,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[PurchaseItemSubscriber] afterUpdate:", {
      id: entity?.id,
      oldQuantity: databaseEntity?.quantity,
      newQuantity: entity?.quantity,
      oldPrice: databaseEntity?.unitPrice,
      newPrice: entity?.unitPrice,
    });
  }

  /**
   * @param {import("../entities/PurchaseItem")} entity
   */
  beforeRemove(entity) {
    logger.debug("[PurchaseItemSubscriber] beforeRemove:", {
      id: entity?.id,
      purchaseId: entity?.purchaseId,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[PurchaseItemSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = PurchaseItemSubscriber;