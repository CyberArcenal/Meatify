// src/subscribers/CategorySubscriber.js
const Category = require("../entities/Category");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading CategorySubscriber");

class CategorySubscriber {
  listenTo() {
    return Category;
  }

  /**
   * @param {import("../entities/Category")} entity
   */
  beforeInsert(entity) {
    logger.debug("[CategorySubscriber] beforeInsert:", {
      id: entity?.id,
      name: entity?.name,
      isActive: entity?.isActive,
    });
  }

  /**
   * @param {import("../entities/Category")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[CategorySubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      isActive: entity.isActive,
    });
  }

  /**
   * @param {import("../entities/Category")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[CategorySubscriber] beforeUpdate:", {
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
    logger.info("[CategorySubscriber] afterUpdate:", {
      id: entity?.id,
      oldName: databaseEntity?.name,
      newName: entity?.name,
      oldStatus: databaseEntity?.isActive,
      newStatus: entity?.isActive,
    });

    // If category was deactivated
    if (databaseEntity && databaseEntity.isActive === true && entity.isActive === false) {
      logger.warn(`[CategorySubscriber] Category #${entity.id} deactivated`);
    }

    // If category was activated
    if (databaseEntity && databaseEntity.isActive === false && entity.isActive === true) {
      logger.info(`[CategorySubscriber] Category #${entity.id} activated`);
    }
  }

  /**
   * @param {import("../entities/Category")} entity
   */
  beforeRemove(entity) {
    logger.debug("[CategorySubscriber] beforeRemove:", {
      id: entity?.id,
      name: entity?.name,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[CategorySubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = CategorySubscriber;