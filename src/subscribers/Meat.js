// src/subscribers/MeatSubscriber.js
const Meat = require("../entities/Meat");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading MeatSubscriber");

class MeatSubscriber {
  listenTo() {
    return Meat;
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  beforeInsert(entity) {
    logger.debug("[MeatSubscriber] beforeInsert:", {
      id: entity?.id,
      name: entity?.name,
      sku: entity?.sku,
      pricePerKg: entity?.pricePerKg,
    });
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[MeatSubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      sku: entity.sku,
      pricePerKg: entity.pricePerKg,
      categoryId: entity.categoryId,
      supplierId: entity.supplierId,
    });
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[MeatSubscriber] beforeUpdate:", {
      id: entity?.id,
      name: entity?.name,
      pricePerKg: entity?.pricePerKg,
      isActive: entity?.isActive,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[MeatSubscriber] afterUpdate:", {
      id: entity?.id,
      oldName: databaseEntity?.name,
      newName: entity?.name,
      oldPrice: databaseEntity?.pricePerKg,
      newPrice: entity?.pricePerKg,
      oldStatus: databaseEntity?.isActive,
      newStatus: entity?.isActive,
    });

    // Detect price change
    if (databaseEntity && databaseEntity.pricePerKg !== entity.pricePerKg) {
      logger.info(`[MeatSubscriber] Meat #${entity.id} price changed: ${databaseEntity.pricePerKg} → ${entity.pricePerKg}`);
    }

    // Detect status change
    if (databaseEntity && databaseEntity.isActive !== entity.isActive) {
      logger.info(`[MeatSubscriber] Meat #${entity.id} status changed: ${databaseEntity.isActive ? 'active' : 'inactive'} → ${entity.isActive ? 'active' : 'inactive'}`);
    }
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  beforeRemove(entity) {
    logger.debug("[MeatSubscriber] beforeRemove:", {
      id: entity?.id,
      name: entity?.name,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[MeatSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = MeatSubscriber;