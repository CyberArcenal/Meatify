// src/subscribers/SaleItemSubscriber.js
const SaleItem = require("../entities/SaleItem");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading SaleItemSubscriber");

class SaleItemSubscriber {
  listenTo() {
    return SaleItem;
  }

  /**
   * @param {import("../entities/SaleItem")} entity
   */
  beforeInsert(entity) {
    logger.debug("[SaleItemSubscriber] beforeInsert:", {
      id: entity?.id,
      saleId: entity?.saleId,
      meatId: entity?.meatId,
      batchId: entity?.batchId,
      weightKg: entity?.weightKg,
      unitPrice: entity?.unitPrice,
    });
  }

  /**
   * @param {import("../entities/SaleItem")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[SaleItemSubscriber] afterInsert:", {
      id: entity.id,
      saleId: entity.saleId,
      meatId: entity.meatId,
      batchId: entity.batchId,
      weightKg: entity.weightKg,
      lineTotal: entity.lineTotal,
    });
  }

  /**
   * @param {import("../entities/SaleItem")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[SaleItemSubscriber] beforeUpdate:", {
      id: entity?.id,
      weightKg: entity?.weightKg,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[SaleItemSubscriber] afterUpdate:", {
      id: entity?.id,
      oldWeight: databaseEntity?.weightKg,
      newWeight: entity?.weightKg,
      oldDiscount: databaseEntity?.discount,
      newDiscount: entity?.discount,
    });
  }

  /**
   * @param {import("../entities/SaleItem")} entity
   */
  beforeRemove(entity) {
    logger.debug("[SaleItemSubscriber] beforeRemove:", {
      id: entity?.id,
      saleId: entity?.saleId,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[SaleItemSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = SaleItemSubscriber;