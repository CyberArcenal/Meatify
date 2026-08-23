// src/subscribers/AuditLogSubscriber.js
const AuditLog = require("../entities/AuditLog");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading AuditLogSubscriber");

class AuditLogSubscriber {
  listenTo() {
    return AuditLog;
  }

  /**
   * @param {import("../entities/AuditLog")} entity
   */
  beforeInsert(entity) {
    logger.debug("[AuditLogSubscriber] beforeInsert:", {
      id: entity?.id,
      action: entity?.action,
      entity: entity?.entity,
      user: entity?.user,
    });
  }

  /**
   * @param {import("../entities/AuditLog")} entity
   */
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[AuditLogSubscriber] afterInsert:", {
      id: entity.id,
      action: entity.action,
      entity: entity.entity,
      user: entity.user,
    });
  }

  /**
   * @param {import("../entities/AuditLog")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[AuditLogSubscriber] beforeUpdate:", {
      id: entity?.id,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[AuditLogSubscriber] afterUpdate:", {
      id: entity?.id,
      oldData: databaseEntity,
      newData: entity,
    });
  }

  /**
   * @param {import("../entities/AuditLog")} entity
   */
  beforeRemove(entity) {
    logger.debug("[AuditLogSubscriber] beforeRemove:", {
      id: entity?.id,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[AuditLogSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = AuditLogSubscriber;