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
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[CategorySubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      isActive: entity.isActive,
    });

    // ✅ Route to state service for side effects (UI broadcast, audit log)
    try {
      const { CategoryStateService } = require("../stateServices/Category");
      const { AppDataSource } = require("../main/db/data-source");
      const stateService = new CategoryStateService(AppDataSource);
      await stateService.onCreate(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(`[CategorySubscriber] Failed to handle onCreate for #${entity.id}:`, err);
    }
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
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    logger.info("[CategorySubscriber] afterUpdate:", {
      id: entity.id,
      oldName: databaseEntity?.name,
      newName: entity.name,
      oldStatus: databaseEntity?.isActive,
      newStatus: entity.isActive,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { CategoryStateService } = require("../stateServices/Category");
    const { AppDataSource } = require("../main/db/data-source");
    const stateService = new CategoryStateService(AppDataSource);

    // ✅ Detect when category is activated (isActive: false → true)
    if (databaseEntity.isActive === false && entity.isActive === true) {
      logger.info(`[CategorySubscriber] Category #${entity.id} activated → routing to state service`);
      try {
        await stateService.onActivated(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[CategorySubscriber] Failed to handle onActivated for #${entity.id}:`, err);
      }
      return;
    }

    // ✅ Detect when category is deactivated (isActive: true → false)
    if (databaseEntity.isActive === true && entity.isActive === false) {
      logger.info(`[CategorySubscriber] Category #${entity.id} deactivated → routing to state service`);
      try {
        // Check if there were meats reassigned (this info would come from the service)
        // For now, we pass empty options – the service will handle it
        await stateService.onDeactivated(entity.id, entity, {}, "system", queryRunner);
      } catch (err) {
        logger.error(`[CategorySubscriber] Failed to handle onDeactivated for #${entity.id}:`, err);
      }
      return;
    }

    // ✅ Detect when category is restored (deletedAt becomes null)
    // Note: This handles soft-delete restoration if you use deletedAt column
    if (databaseEntity.deletedAt !== undefined && entity.deletedAt === null) {
      logger.info(`[CategorySubscriber] Category #${entity.id} restored → routing to state service`);
      try {
        await stateService.onRestore(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[CategorySubscriber] Failed to handle onRestore for #${entity.id}:`, err);
      }
      return;
    }

    // ✅ Detect other field changes (name, description)
    const changedFields = {};
    const skipKeys = ['id', 'isActive', 'updatedAt', 'createdAt', 'deletedAt'];
    for (const key of Object.keys(entity)) {
      if (!skipKeys.includes(key)) {
        if (databaseEntity[key] !== entity[key]) {
          changedFields[key] = { old: databaseEntity[key], new: entity[key] };
        }
      }
    }

    if (Object.keys(changedFields).length > 0) {
      logger.info(`[CategorySubscriber] Category #${entity.id} updated (fields: ${Object.keys(changedFields).join(', ')}) → routing to state service`);
      try {
        await stateService.onUpdate(entity.id, entity, changedFields, "system", queryRunner);
      } catch (err) {
        logger.error(`[CategorySubscriber] Failed to handle onUpdate for #${entity.id}:`, err);
      }
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
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[CategorySubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { CategoryStateService } = require("../stateServices/Category");
      const { AppDataSource } = require("../main/db/data-source");
      const stateService = new CategoryStateService(AppDataSource);
      await stateService.onDelete(entityId, databaseEntity, "system", queryRunner);
    } catch (err) {
      logger.error(`[CategorySubscriber] Failed to handle onDelete for #${entityId}:`, err);
    }
  }
}

module.exports = CategorySubscriber;