// src/subscribers/ReturnRefundSubscriber.js
const ReturnRefund = require("../entities/ReturnRefund");
const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading ReturnRefundSubscriber");

class ReturnRefundSubscriber {
  listenTo() {
    return ReturnRefund;
  }

  /**
   * @param {import("../entities/ReturnRefund")} entity
   */
  beforeInsert(entity) {
    logger.debug("[ReturnRefundSubscriber] beforeInsert:", {
      id: entity?.id,
      referenceNo: entity?.referenceNo,
      saleId: entity?.saleId,
      customerId: entity?.customerId,
      status: entity?.status,
      totalAmount: entity?.totalAmount,
    });
  }

  /**
   * @param {import("../entities/ReturnRefund")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[ReturnRefundSubscriber] afterInsert:", {
      id: entity.id,
      referenceNo: entity.referenceNo,
      saleId: entity.saleId,
      customerId: entity.customerId,
      status: entity.status,
      totalAmount: entity.totalAmount,
    });

    const { ReturnRefundStateService } = require("../stateServices/ReturnRefund");
    const stateService = new ReturnRefundStateService(AppDataSource);

    // ✅ Route to state service for creation side effects
    try {
      await stateService.onCreated(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(`[ReturnRefundSubscriber] Failed to handle onCreated for return #${entity.id}:`, err);
    }

    // ✅ If return is created with 'processed' status, trigger processed side effects
    // Note: The actual business logic (stock, loyalty) was already executed by the service
    if (entity.status === "processed") {
      try {
        // The service already did the work, we just need side effects
        // The service should return metadata (itemsRestocked, pointsReversed)
        // For now, we pass 0 as placeholder – the service will provide actual values
        await stateService.onProcessed(
          entity.id,
          entity,
          { itemsRestocked: 0, pointsReversed: 0 },
          "system",
          queryRunner
        );
      } catch (err) {
        logger.error(`[ReturnRefundSubscriber] Failed to handle onProcessed for return #${entity.id}:`, err);
      }
    }
  }

  /**
   * @param {import("../entities/ReturnRefund")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[ReturnRefundSubscriber] beforeUpdate:", {
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

    logger.info("[ReturnRefundSubscriber] afterUpdate:", {
      id: entity.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity.status,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { ReturnRefundStateService } = require("../stateServices/ReturnRefund");
    const stateService = new ReturnRefundStateService(AppDataSource);

    // ────────────────────────────────────────────────────────────────
    // ✅ 1. Handle Status Changes (Side Effects Only)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.status !== entity.status) {
      try {
        switch (entity.status) {
          case "processed":
            // The service already did the work, we just need side effects
            await stateService.onProcessed(
              entity.id,
              entity,
              { itemsRestocked: 0, pointsReversed: 0 },
              "system",
              queryRunner
            );
            break;
          case "cancelled":
            const wasProcessed = databaseEntity.status === "processed";
            await stateService.onCancelled(
              entity.id,
              entity,
              "",
              { wasProcessed, itemsRestockedReversed: 0, pointsRestored: 0 },
              "system",
              queryRunner
            );
            break;
          default:
            break;
        }
      } catch (err) {
        logger.error(`[ReturnRefundSubscriber] Failed to handle status change to ${entity.status} for return #${entity.id}:`, err);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 2. Detect Other Field Changes
    // ────────────────────────────────────────────────────────────────
    const changedFields = {};
    const skipKeys = ['id', 'status', 'updatedAt', 'createdAt', 'deletedAt'];

    for (const key of Object.keys(entity)) {
      if (!skipKeys.includes(key)) {
        if (databaseEntity[key] !== entity[key]) {
          changedFields[key] = { old: databaseEntity[key], new: entity[key] };
        }
      }
    }

    if (Object.keys(changedFields).length > 0) {
      logger.info(
        `[ReturnRefundSubscriber] Return #${entity.id} updated (fields: ${Object.keys(changedFields).join(', ')}) → routing to state service`
      );

      try {
        await stateService.onUpdated(entity.id, entity, changedFields, "system", queryRunner);
      } catch (err) {
        logger.error(`[ReturnRefundSubscriber] Failed to handle onUpdated for return #${entity.id}:`, err);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 3. Detect Restoration (deletedAt becomes null)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.deletedAt !== undefined && entity.deletedAt === null) {
      logger.info(`[ReturnRefundSubscriber] Return #${entity.id} restored → routing to state service`);

      try {
        await stateService.onRestored(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[ReturnRefundSubscriber] Failed to handle onRestored for return #${entity.id}:`, err);
      }
    }
  }

  /**
   * @param {import("../entities/ReturnRefund")} entity
   */
  beforeRemove(entity) {
    logger.debug("[ReturnRefundSubscriber] beforeRemove:", {
      id: entity?.id,
      referenceNo: entity?.referenceNo,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[ReturnRefundSubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { ReturnRefundStateService } = require("../stateServices/ReturnRefund");
      const stateService = new ReturnRefundStateService(AppDataSource);
      await stateService.onDeleted(entityId, databaseEntity, "system", queryRunner);
    } catch (err) {
      logger.error(`[ReturnRefundSubscriber] Failed to handle onDeleted for return #${entityId}:`, err);
    }
  }
}

module.exports = ReturnRefundSubscriber;