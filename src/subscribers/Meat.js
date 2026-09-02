// src/subscribers/MeatSubscriber.js
const Meat = require("../entities/Meat");
const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading MeatSubscriber");

class MeatSubscriber {
  listenTo() {
    return Meat;
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  beforeInsert(entity) {
    logger.debug("[MeatSubscriber] beforeInsert:", {
      id: entity?.id,
      name: entity?.name,
      sku: entity?.sku,
      pricePerKg: entity?.pricePerKg,
    });
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[MeatSubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      sku: entity.sku,
      pricePerKg: entity.pricePerKg,
      categoryId: entity.categoryId,
      supplierId: entity.supplierId,
    });

    // ✅ Route to state service for side effects (UI broadcast, audit log)
    try {
      const { MeatStateService } = require("../stateServices/Meat");
      const stateService = new MeatStateService(AppDataSource);
      await stateService.onCreated(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(`[MeatSubscriber] Failed to handle onCreated for meat #${entity.id}:`, err);
      throw err; // Rethrow to ensure transaction rollback
    }
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[MeatSubscriber] beforeUpdate:", {
      id: entity?.id,
      name: entity?.name,
      pricePerKg: entity?.pricePerKg,
      isActive: entity?.isActive,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    logger.info("[MeatSubscriber] afterUpdate:", {
      id: entity.id,
      oldName: databaseEntity?.name,
      newName: entity.name,
      oldPrice: databaseEntity?.pricePerKg,
      newPrice: entity.pricePerKg,
      oldStatus: databaseEntity?.isActive,
      newStatus: entity.isActive,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { MeatStateService } = require("../stateServices/Meat");
    const stateService = new MeatStateService(AppDataSource);

    // ────────────────────────────────────────────────────────────────
    // ✅ 1. Handle Status Change (Activation/Deactivation)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.isActive !== entity.isActive) {
      logger.info(
        `[MeatSubscriber] Meat #${entity.id} status changed: ${databaseEntity.isActive ? 'active' : 'inactive'} → ${entity.isActive ? 'active' : 'inactive'}`
      );

      try {
        if (entity.isActive === true) {
          // Activated: false → true
          await stateService.onActivated(entity.id, entity, "system", queryRunner);
        } else {
          // Deactivated: true → false
          // Check if there are active batches (optional – can pass count)
          let activeBatchCount = 0;
          try {
            const Batch = require("../entities/Batch");
            const batchRepo = manager.getRepository(Batch);
            activeBatchCount = await batchRepo.count({
              where: { meat: { id: entity.id }, status: "active" },
            });
          } catch (err) {
            logger.warn(`[MeatSubscriber] Failed to get active batch count for meat #${entity.id}:`, err);
            throw err; // Rethrow to ensure transaction rollback
          }

          await stateService.onDeactivated(
            entity.id,
            entity,
            { activeBatchCount },
            "system",
            queryRunner
          );
        }
      } catch (err) {
        logger.error(`[MeatSubscriber] Failed to handle status change for meat #${entity.id}:`, err);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 2. Handle Price Change
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.pricePerKg !== entity.pricePerKg) {
      logger.info(
        `[MeatSubscriber] Meat #${entity.id} price changed: ${databaseEntity.pricePerKg} → ${entity.pricePerKg}`
      );

      try {
        await stateService.onPriceChange(
          entity.id,
          databaseEntity.pricePerKg,
          entity.pricePerKg,
          entity,
          "system",
          queryRunner
        );
      } catch (err) {
        logger.error(`[MeatSubscriber] Failed to handle price change for meat #${entity.id}:`, err);
        throw err; // Rethrow to ensure transaction rollback
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 3. Handle Other Field Changes (name, description, barcode, etc.)
    // ────────────────────────────────────────────────────────────────
    const changedFields = {};
    const skipKeys = ['id', 'isActive', 'pricePerKg', 'updatedAt', 'createdAt', 'deletedAt'];

    for (const key of Object.keys(entity)) {
      if (!skipKeys.includes(key)) {
        if (databaseEntity[key] !== entity[key]) {
          changedFields[key] = { old: databaseEntity[key], new: entity[key] };
        }
      }
    }

    if (Object.keys(changedFields).length > 0) {
      logger.info(
        `[MeatSubscriber] Meat #${entity.id} updated (fields: ${Object.keys(changedFields).join(', ')}) → routing to state service`
      );

      try {
        await stateService.onUpdated(entity.id, entity, changedFields, "system", queryRunner);
      } catch (err) {
        logger.error(`[MeatSubscriber] Failed to handle onUpdated for meat #${entity.id}:`, err);
        throw err; // Rethrow to ensure transaction rollback
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 4. Detect Restoration (deletedAt becomes null)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.deletedAt !== undefined && entity.deletedAt === null) {
      logger.info(`[MeatSubscriber] Meat #${entity.id} restored → routing to state service`);

      try {
        await stateService.onRestored(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[MeatSubscriber] Failed to handle onRestored for meat #${entity.id}:`, err);
        throw err; // Rethrow to ensure transaction rollback
      }
    }
  }

  /**
   * @param {import("../entities/Meat")} entity
   */
  beforeRemove(entity) {
    logger.debug("[MeatSubscriber] beforeRemove:", {
      id: entity?.id,
      name: entity?.name,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[MeatSubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { MeatStateService } = require("../stateServices/Meat");
      const stateService = new MeatStateService(AppDataSource);
      await stateService.onDeleted(entityId, databaseEntity, "system", queryRunner);
    } catch (err) {
      logger.error(`[MeatSubscriber] Failed to handle onDeleted for meat #${entityId}:`, err);
      throw err; // Rethrow to ensure transaction rollback
    }
  }
}

module.exports = MeatSubscriber;