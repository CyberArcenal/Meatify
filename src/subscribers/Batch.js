// src/subscribers/BatchSubscriber.js
const Batch = require("../entities/Batch");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading BatchSubscriber");

class BatchSubscriber {
  listenTo() {
    return Batch;
  }

  /**
   * @param {import("../entities/Batch")} entity
   */
  beforeInsert(entity) {
    logger.debug("[BatchSubscriber] beforeInsert:", {
      id: entity?.id,
      batchCode: entity?.batchCode,
      meatId: entity?.meatId,
      quantity: entity?.initialQuantity,
      expiryDate: entity?.expiryDate,
    });
  }

  /**
   * @param {import("../entities/Batch")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[BatchSubscriber] afterInsert:", {
      id: entity.id,
      batchCode: entity.batchCode,
      meatId: entity.meatId,
      remainingQty: entity.remainingQuantity,
      status: entity.status,
    });

    // ✅ Route to state service for side effects (UI broadcast, audit log)
    try {
      const { BatchStateService } = require("../stateServices/Batch");
      const { AppDataSource } = require("../main/db/data-source");
      const stateService = new BatchStateService(AppDataSource);
      await stateService.onCreate(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(
        `[BatchSubscriber] Failed to handle onCreate for #${entity.id}:`,
        err,
      );
    }

    // ✅ Check if batch is expiring soon (side effect)
    try {
      const { BatchStateService } = require("../stateServices/Batch");
      const { AppDataSource } = require("../main/db/data-source");
      const stateService = new BatchStateService(AppDataSource);
      await stateService.onExpiringSoon(
        entity.id,
        entity,
        "system",
        queryRunner,
      );
    } catch (err) {
      logger.error(
        `[BatchSubscriber] Failed to check expiring soon for #${entity.id}:`,
        err,
      );
    }
  }

  /**
   * @param {import("../entities/Batch")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[BatchSubscriber] beforeUpdate:", {
      id: entity?.id,
      status: entity?.status,
      remainingQty: entity?.remainingQuantity,
    });
  }


  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    logger.info("[BatchSubscriber] afterUpdate:", {
      id: entity.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity.status,
      oldRemaining: databaseEntity?.remainingQuantity,
      newRemaining: entity.remainingQuantity,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { BatchStateService } = require("../stateServices/Batch");
    const { AppDataSource } = require("../main/db/data-source");
    const stateService = new BatchStateService(AppDataSource);

    // ✅ Detect when status changed to 'depleted'
    if (databaseEntity.status !== "depleted" && entity.status === "depleted") {
      logger.info(
        `[BatchSubscriber] Batch #${entity.id} depleted → routing to state service`,
      );
      try {
        await stateService.onDepleted(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(
          `[BatchSubscriber] Failed to handle onDepleted for #${entity.id}:`,
          err,
        );
      }
      return;
    }

    // ✅ Detect when status changed to 'expired'
    if (databaseEntity.status !== "expired" && entity.status === "expired") {
      logger.info(
        `[BatchSubscriber] Batch #${entity.id} expired → routing to state service`,
      );
      try {
        await stateService.onExpired(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(
          `[BatchSubscriber] Failed to handle onExpired for #${entity.id}:`,
          err,
        );
      }
      return;
    }

    // ✅ Detect status changes to other statuses (on_hold, active)
    if (databaseEntity.status !== entity.status) {
      logger.info(
        `[BatchSubscriber] Batch #${entity.id} status changed: ${databaseEntity.status} → ${entity.status} → routing to state service`,
      );
      try {
        const changes = {
          status: { old: databaseEntity.status, new: entity.status },
        };
        await stateService.onUpdate(
          entity.id,
          entity,
          changes,
          "system",
          queryRunner,
        );
      } catch (err) {
        logger.error(
          `[BatchSubscriber] Failed to handle status change for #${entity.id}:`,
          err,
        );
      }
      return;
    }

    // ✅ Detect remainingQuantity changes (significant)
    if (databaseEntity.remainingQuantity !== entity.remainingQuantity) {
      const diff = entity.remainingQuantity - databaseEntity.remainingQuantity;
      // Only log significant changes (more than 0.1 kg)
      if (Math.abs(diff) > 0.1) {
        logger.info(
          `[BatchSubscriber] Batch #${entity.id} remaining quantity changed by ${diff}kg → routing to state service`,
        );
        try {
          const changes = {
            remainingQuantity: {
              old: databaseEntity.remainingQuantity,
              new: entity.remainingQuantity,
            },
          };
          await stateService.onUpdate(
            entity.id,
            entity,
            changes,
            "system",
            queryRunner,
          );
        } catch (err) {
          logger.error(
            `[BatchSubscriber] Failed to handle quantity change for #${entity.id}:`,
            err,
          );
        }
      }
    }

    // ✅ Detect other field changes (note, unitCost, expiryDate, etc.)
    const changedFields = {};
    // Skip these keys entirely (they are relations or timestamps we don't want to log)
    const skipKeys = [
      "id",
      "status",
      "remainingQuantity",
      "updatedAt",
      "createdAt",
      "receivedDate",
      "meat",
      "supplier",
    ];

    for (const key of Object.keys(entity)) {
      if (skipKeys.includes(key)) continue;

      const oldVal = databaseEntity[key];
      const newVal = entity[key];

      // Special handling for Date objects
      if (oldVal instanceof Date && newVal instanceof Date) {
        if (oldVal.getTime() !== newVal.getTime()) {
          changedFields[key] = { old: oldVal, new: newVal };
        }
      } else if (oldVal !== newVal) {
        changedFields[key] = { old: oldVal, new: newVal };
      }
    }

    if (Object.keys(changedFields).length > 0) {
      logger.info(
        `[BatchSubscriber] Batch #${entity.id} updated (fields: ${Object.keys(changedFields).join(", ")}) → routing to state service`,
      );
      try {
        await stateService.onUpdate(
          entity.id,
          entity,
          changedFields,
          "system",
          queryRunner,
        );
      } catch (err) {
        logger.error(
          `[BatchSubscriber] Failed to handle onUpdate for #${entity.id}:`,
          err,
        );
      }
    }
  }

  /**
   * @param {import("../entities/Batch")} entity
   */
  beforeRemove(entity) {
    logger.debug("[BatchSubscriber] beforeRemove:", {
      id: entity?.id,
      batchCode: entity?.batchCode,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[BatchSubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { BatchStateService } = require("../stateServices/Batch");
      const { AppDataSource } = require("../main/db/data-source");
      const stateService = new BatchStateService(AppDataSource);
      await stateService.onDelete(
        entityId,
        databaseEntity,
        "system",
        queryRunner,
      );
    } catch (err) {
      logger.error(
        `[BatchSubscriber] Failed to handle onDelete for #${entityId}:`,
        err,
      );
    }
  }
}

module.exports = BatchSubscriber;
