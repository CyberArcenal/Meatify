// src/subscribers/NotificationLogSubscriber.js
//@ts-check
const NotificationLog = require("../entities/NotificationLog");
const { AppDataSource } = require("../main/db/data-source");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading NotificationLogSubscriber");

class NotificationLogSubscriber {
  listenTo() {
    return NotificationLog;
  }

  /**
   * @param {import("../entities/NotificationLog")} entity
   */
  beforeInsert(entity) {
    logger.debug("[NotificationLogSubscriber] beforeInsert:", {
      id: entity?.id,
      recipient: entity?.recipient_email,
      subject: entity?.subject,
      status: entity?.status,
    });
  }

  /**
   * @param {import("../entities/NotificationLog")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    if (!entity) return;

    logger.info("[NotificationLogSubscriber] afterInsert:", {
      id: entity.id,
      recipient: entity.recipient_email,
      status: entity.status,
    });

    // ✅ Only process if status is 'queued'
    if (entity.status === "queued") {
      try {
        const { NotificationLogStateService } = require("../stateServices/NotificationLog");
        const stateService = new NotificationLogStateService(AppDataSource);
        await stateService.onLogCreated(entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[NotificationLogSubscriber] Failed to process log #${entity.id}:`, err);
        // Don't throw – we don't want to break the transaction
      }
    }
  }

  /**
   * @param {import("../entities/NotificationLog")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[NotificationLogSubscriber] beforeUpdate:", {
      id: entity?.id,
      status: entity?.status,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    logger.info("[NotificationLogSubscriber] afterUpdate:", {
      id: entity.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity.status,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { NotificationLogStateService } = require("../stateServices/NotificationLog");
    const stateService = new NotificationLogStateService(AppDataSource);

    // ────────────────────────────────────────────────────────────────
    // ✅ 1. Detect status change
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.status !== entity.status) {
      logger.info(
        `[NotificationLogSubscriber] Log #${entity.id} status changed: ${databaseEntity.status} → ${entity.status}`
      );

      try {
        const changes = { status: { old: databaseEntity.status, new: entity.status } };
        await stateService.onLogUpdated(entity.id, entity, changes, "system", queryRunner);
      } catch (err) {
        logger.error(`[NotificationLogSubscriber] Failed to handle status change for log #${entity.id}:`, err);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 2. Detect other field changes
    // ────────────────────────────────────────────────────────────────
    const changedFields = {};
    const skipKeys = ['id', 'status', 'created_at', 'updated_at'];

    for (const key of Object.keys(entity)) {
      if (!skipKeys.includes(key)) {
        if (databaseEntity[key] !== entity[key]) {
          changedFields[key] = { old: databaseEntity[key], new: entity[key] };
        }
      }
    }

    if (Object.keys(changedFields).length > 0) {
      logger.info(
        `[NotificationLogSubscriber] Log #${entity.id} updated (fields: ${Object.keys(changedFields).join(', ')}) → routing to state service`
      );

      try {
        await stateService.onLogUpdated(entity.id, entity, changedFields, "system", queryRunner);
      } catch (err) {
        logger.error(`[NotificationLogSubscriber] Failed to handle onLogUpdated for log #${entity.id}:`, err);
      }
    }
  }

  /**
   * @param {import("../entities/NotificationLog")} entity
   */
  beforeRemove(entity) {
    logger.debug("[NotificationLogSubscriber] beforeRemove:", {
      id: entity?.id,
      recipient: entity?.recipient_email,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[NotificationLogSubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { NotificationLogStateService } = require("../stateServices/NotificationLog");
      const stateService = new NotificationLogStateService(AppDataSource);
      await stateService.onLogDeleted(entityId, databaseEntity, "system", queryRunner);
    } catch (err) {
      logger.error(`[NotificationLogSubscriber] Failed to handle onLogDeleted for log #${entityId}:`, err);
    }
  }
}

module.exports = NotificationLogSubscriber;