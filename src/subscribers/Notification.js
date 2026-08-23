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
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[NotificationSubscriber] afterInsert:", {
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      type: entity.type,
      isRead: entity.isRead,
    });
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
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[NotificationSubscriber] afterUpdate:", {
      id: entity?.id,
      oldReadStatus: databaseEntity?.isRead,
      newReadStatus: entity?.isRead,
    });

    // Detect when notification is marked as read
    if (databaseEntity && databaseEntity.isRead === false && entity.isRead === true) {
      logger.info(`[NotificationSubscriber] Notification #${entity.id} marked as read`);
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
  afterRemove(event) {
    logger.info("[NotificationSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = NotificationSubscriber;