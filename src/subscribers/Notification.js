// src/subscribers/NotificationSubscriber.js
const Notification = require("../entities/Notification");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading NotificationSubscriber");

class NotificationSubscriber {
  listenTo() {
    return Notification;
  }

  /**
   * @param {import("../entities/Notification")} entity
   */
  beforeInsert(entity) {
    logger.debug("[NotificationSubscriber] beforeInsert:", {
      id: entity?.id,
      userId: entity?.userId,
      title: entity?.title,
      type: entity?.type,
    });
  }

  /**
   * @param {import("../entities/Notification")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[NotificationSubscriber] afterInsert:", {
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      type: entity.type,
      isRead: entity.isRead,
    });

    // ✅ Route to state service for side effects (UI broadcast, audit log)
    try {
      const { NotificationStateService } = require("../stateServices/Notification");
      const { AppDataSource } = require("../main/db/data-source");
      const stateService = new NotificationStateService(AppDataSource);
      await stateService.onCreate(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(`[NotificationSubscriber] Failed to handle onCreate for #${entity.id}:`, err);
      throw err; // Rethrow to ensure transaction rollback
    }
  }

  /**
   * @param {import("../entities/Notification")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[NotificationSubscriber] beforeUpdate:", {
      id: entity?.id,
      isRead: entity?.isRead,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    logger.debug("[NotificationSubscriber] afterUpdate:", {
      id: entity.id,
      oldIsRead: databaseEntity?.isRead,
      newIsRead: entity.isRead,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { NotificationStateService } = require("../stateServices/Notification");
    const { AppDataSource } = require("../main/db/data-source");
    const stateService = new NotificationStateService(AppDataSource);

    // ✅ Detect when notification is marked as read
    if (databaseEntity.isRead === false && entity.isRead === true) {
      logger.info(`[NotificationSubscriber] Notification #${entity.id} marked as read → routing to state service`);
      try {
        await stateService.onMarkAsRead(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[NotificationSubscriber] Failed to handle markAsRead for #${entity.id}:`, err);
        throw err; // Rethrow to ensure transaction rollback
      }
      return;
    }

    // ✅ Detect when notification is marked as unread
    if (databaseEntity.isRead === true && entity.isRead === false) {
      logger.info(`[NotificationSubscriber] Notification #${entity.id} marked as unread → routing to state service`);
      try {
        await stateService.onMarkAsUnread(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[NotificationSubscriber] Failed to handle markAsUnread for #${entity.id}:`, err);
        throw err; // Rethrow to ensure transaction rollback
      }
      return;
    }

    // ✅ Detect other field changes (title, message, type, metadata)
    const changedFields = {};
    for (const key of Object.keys(entity)) {
      if (key !== 'isRead' && key !== 'updatedAt' && key !== 'deletedAt') {
        if (databaseEntity[key] !== entity[key]) {
          changedFields[key] = { old: databaseEntity[key], new: entity[key] };
        }
      }
    }

    if (Object.keys(changedFields).length > 0) {
      logger.info(`[NotificationSubscriber] Notification #${entity.id} updated (fields: ${Object.keys(changedFields).join(', ')}) → routing to state service`);
      try {
        await stateService.onUpdate(entity.id, entity, changedFields, "system", queryRunner);
      } catch (err) {
        logger.error(`[NotificationSubscriber] Failed to handle onUpdate for #${entity.id}:`, err);
        throw err; // Rethrow to ensure transaction rollback
      }
    }
  }

  /**
   * @param {import("../entities/Notification")} entity
   */
  beforeRemove(entity) {
    logger.debug("[NotificationSubscriber] beforeRemove:", {
      id: entity?.id,
      title: entity?.title,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[NotificationSubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { NotificationStateService } = require("../stateServices/Notification");
      const { AppDataSource } = require("../main/db/data-source");
      const stateService = new NotificationStateService(AppDataSource);
      await stateService.onDelete(entityId, databaseEntity, "system", queryRunner);
    } catch (err) {
      logger.error(`[NotificationSubscriber] Failed to handle onDelete for #${entityId}:`, err);
      throw err; // Rethrow to ensure transaction rollback
    }
  }
}

module.exports = NotificationSubscriber;