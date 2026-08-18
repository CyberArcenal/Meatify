// src/subscribers/NotificationLogSubscriber.js
const NotificationLog = require("../entities/NotificationLog");
const { AppDataSource } = require("../main/db/data-source");
const { NotificationLogStateService } = require("../stateServices/NotificationLogStateService");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading NotificationLogSubscriber");

class NotificationLogSubscriber {
  constructor() {
    this.stateService = null;
  }

  async getStateService(dataSource) {
    if (!this.stateService) {
      this.stateService = new NotificationLogStateService(dataSource);
    }
    return this.stateService;
  }

  listenTo() {
    return NotificationLog;
  }

  /**
   * After insert – trigger sending
   * @param {import("../entities/NotificationLog")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    if (!entity) return;

    console.log("[NotificationLogSubscriber] afterInsert:", {
      id: entity.id,
      recipient: entity.recipient_email,
      status: entity.status,
    });

    // Only process if status is 'queued'
    if (entity.status === "queued") {
      try {
        const service = await this.getStateService(manager.connection);
        await service.onLogCreated(entity, "system", queryRunner);
      } catch (err) {
        logger.error("[NotificationLogSubscriber] Failed to process log:", err);
        // Don't throw – we don't want to break the transaction
      }
    }
  }

  /**
   * After update – handle retry/resend
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    console.log("[NotificationLogSubscriber] afterUpdate:", {
      id: entity.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity.status,
    });

    // If status changed from queued to something else, trigger sending
    if (databaseEntity && databaseEntity.status === "queued" && entity.status !== "queued") {
      // Already being processed or skipped
      return;
    }

    // If status changed to 'resend' or retry is triggered
    if (entity.status === "resend" && databaseEntity?.status !== "resend") {
      try {
        const service = await this.getStateService(manager.connection);
        // This will send again
        await service.onLogCreated(entity, "system", queryRunner);
      } catch (err) {
        logger.error("[NotificationLogSubscriber] Failed to resend log:", err);
      }
    }
  }

  /**
   * @param {import("../entities/NotificationLog")} entity
   */
  beforeInsert(entity) {
    console.log("[NotificationLogSubscriber] beforeInsert:", {
      recipient: entity?.recipient_email,
      subject: entity?.subject,
      status: entity?.status,
    });
  }

  /**
   * @param {import("../entities/NotificationLog")} entity
   */
  beforeUpdate(entity) {
    console.log("[NotificationLogSubscriber] beforeUpdate:", {
      id: entity?.id,
      status: entity?.status,
    });
  }

  /**
   * @param {import("../entities/NotificationLog")} entity
   */
  beforeRemove(entity) {
    console.log("[NotificationLogSubscriber] beforeRemove:", {
      id: entity?.id,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    console.log("[NotificationLogSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = NotificationLogSubscriber;