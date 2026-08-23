// src/subscribers/SupplierSubscriber.js
const Supplier = require("../entities/Supplier");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading SupplierSubscriber");

class SupplierSubscriber {
  listenTo() {
    return Supplier;
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  beforeInsert(entity) {
    logger.debug("[SupplierSubscriber] beforeInsert:", {
      id: entity?.id,
      name: entity?.name,
      email: entity?.email,
      phone: entity?.phone,
      isActive: entity?.isActive,
    });
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[SupplierSubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      isActive: entity.isActive,
    });
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[SupplierSubscriber] beforeUpdate:", {
      id: entity?.id,
      name: entity?.name,
      isActive: entity?.isActive,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[SupplierSubscriber] afterUpdate:", {
      id: entity?.id,
      oldName: databaseEntity?.name,
      newName: entity?.name,
      oldStatus: databaseEntity?.isActive,
      newStatus: entity?.isActive,
    });

    // Detect status change
    if (databaseEntity && databaseEntity.isActive !== entity.isActive) {
      logger.info(`[SupplierSubscriber] Supplier #${entity.id} status changed: ${databaseEntity.isActive ? 'active' : 'inactive'} → ${entity.isActive ? 'active' : 'inactive'}`);
    }
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  beforeRemove(entity) {
    logger.debug("[SupplierSubscriber] beforeRemove:", {
      id: entity?.id,
      name: entity?.name,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[SupplierSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = SupplierSubscriber;