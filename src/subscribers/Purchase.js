// src/subscribers/PurchaseSubscriber.js
const Purchase = require("../entities/Purchase");
const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading PurchaseSubscriber");

class PurchaseSubscriber {
  listenTo() {
    return Purchase;
  }

  /**
   * @param {import("../entities/Purchase")} entity
   */
  beforeInsert(entity) {
    logger.debug("[PurchaseSubscriber] beforeInsert:", {
      id: entity?.id,
      referenceNo: entity?.referenceNo,
      supplierId: entity?.supplierId,
      status: entity?.status,
      totalAmount: entity?.totalAmount,
    });
  }

  /**
   * @param {import("../entities/Purchase")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[PurchaseSubscriber] afterInsert:", {
      id: entity.id,
      referenceNo: entity.referenceNo,
      supplierId: entity.supplierId,
      status: entity.status,
      totalAmount: entity.totalAmount,
    });

    const { PurchaseStateService } = require("../stateServices/Purchase");
    const stateService = new PurchaseStateService(AppDataSource);

    // ✅ Route to state service for creation side effects
    try {
      await stateService.onCreated(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(`[PurchaseSubscriber] Failed to handle onCreated for purchase #${entity.id}:`, err);
    }

    // ✅ If purchase is created with 'approved' or 'completed' status, trigger status side effects
    if (entity.status === "approved") {
      try {
        await stateService.onApproved(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[PurchaseSubscriber] Failed to handle onApproved for purchase #${entity.id}:`, err);
      }
    }

    if (entity.status === "completed") {
      try {
        const batchCount = entity.purchaseItems?.length || 0;
        await stateService.onCompleted(entity.id, entity, { batchCount }, "system", queryRunner);
      } catch (err) {
        logger.error(`[PurchaseSubscriber] Failed to handle onCompleted for purchase #${entity.id}:`, err);
      }
    }
  }

  /**
   * @param {import("../entities/Purchase")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[PurchaseSubscriber] beforeUpdate:", {
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

    logger.info("[PurchaseSubscriber] afterUpdate:", {
      id: entity.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity.status,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { PurchaseStateService } = require("../stateServices/Purchase");
    const stateService = new PurchaseStateService(AppDataSource);

    // ────────────────────────────────────────────────────────────────
    // ✅ 1. Handle Status Changes
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.status !== entity.status) {
      try {
        switch (entity.status) {
          case "approved":
            await stateService.onApproved(entity.id, entity, "system", queryRunner);
            break;
          case "completed":
            const batchCount = entity.purchaseItems?.length || 0;
            await stateService.onCompleted(entity.id, entity, { batchCount }, "system", queryRunner);
            break;
          case "cancelled":
            await stateService.onCancelled(entity.id, entity, "", "system", queryRunner);
            break;
          default:
            break;
        }
      } catch (err) {
        logger.error(`[PurchaseSubscriber] Failed to handle status change to ${entity.status} for purchase #${entity.id}:`, err);
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
        `[PurchaseSubscriber] Purchase #${entity.id} updated (fields: ${Object.keys(changedFields).join(', ')}) → routing to state service`
      );

      try {
        await stateService.onUpdated(entity.id, entity, changedFields, "system", queryRunner);
      } catch (err) {
        logger.error(`[PurchaseSubscriber] Failed to handle onUpdated for purchase #${entity.id}:`, err);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 3. Detect Restoration (deletedAt becomes null)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.deletedAt !== undefined && entity.deletedAt === null) {
      logger.info(`[PurchaseSubscriber] Purchase #${entity.id} restored → routing to state service`);

      try {
        await stateService.onRestored(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[PurchaseSubscriber] Failed to handle onRestored for purchase #${entity.id}:`, err);
      }
    }
  }

  /**
   * @param {import("../entities/Purchase")} entity
   */
  beforeRemove(entity) {
    logger.debug("[PurchaseSubscriber] beforeRemove:", {
      id: entity?.id,
      referenceNo: entity?.referenceNo,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[PurchaseSubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { PurchaseStateService } = require("../stateServices/Purchase");
      const stateService = new PurchaseStateService(AppDataSource);
      await stateService.onDeleted(entityId, databaseEntity, "system", queryRunner);
    } catch (err) {
      logger.error(`[PurchaseSubscriber] Failed to handle onDeleted for purchase #${entityId}:`, err);
    }
  }
}

module.exports = PurchaseSubscriber;