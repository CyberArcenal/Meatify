// src/subscribers/SupplierSubscriber.js
const Supplier = require("../entities/Supplier");
const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading SupplierSubscriber");

class SupplierSubscriber {
  listenTo() {
    return Supplier;
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  beforeInsert(entity) {
    logger.debug("[SupplierSubscriber] beforeInsert:", {
      id: entity?.id,
      name: entity?.name,
      email: entity?.email,
      phone: entity?.phone,
      isActive: entity?.isActive,
    });
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[SupplierSubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      isActive: entity.isActive,
    });

    // ✅ Route to state service for side effects (UI broadcast, audit log)
    try {
      const { SupplierStateService } = require("../stateServices/Supplier");
      const stateService = new SupplierStateService(AppDataSource);
      await stateService.onCreated(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(`[SupplierSubscriber] Failed to handle onCreated for supplier #${entity.id}:`, err);
    }
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[SupplierSubscriber] beforeUpdate:", {
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

    logger.info("[SupplierSubscriber] afterUpdate:", {
      id: entity.id,
      oldName: databaseEntity?.name,
      newName: entity.name,
      oldStatus: databaseEntity?.isActive,
      newStatus: entity.isActive,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const { SupplierStateService } = require("../stateServices/Supplier");
    const stateService = new SupplierStateService(AppDataSource);

    // ────────────────────────────────────────────────────────────────
    // ✅ 1. Handle Status Change (Activation/Deactivation)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.isActive !== entity.isActive) {
      logger.info(
        `[SupplierSubscriber] Supplier #${entity.id} status changed: ${databaseEntity.isActive ? 'active' : 'inactive'} → ${entity.isActive ? 'active' : 'inactive'}`
      );

      try {
        if (entity.isActive === true) {
          // Activated: false → true
          await stateService.onActivated(entity.id, entity, "system", queryRunner);
        } else {
          // Deactivated: true → false
          // Check if meats were reassigned (this info would come from the service)
          // For now, we pass empty options – the service will handle it
          await stateService.onDeactivated(
            entity.id,
            entity,
            { meatsReassigned: 0, reassignToSupplierId: null, pendingPurchases: 0 },
            "system",
            queryRunner
          );
        }
      } catch (err) {
        logger.error(`[SupplierSubscriber] Failed to handle status change for supplier #${entity.id}:`, err);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 2. Detect Other Field Changes (name, contactInfo, email, phone, address, notes)
    // ────────────────────────────────────────────────────────────────
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
      logger.info(
        `[SupplierSubscriber] Supplier #${entity.id} updated (fields: ${Object.keys(changedFields).join(', ')}) → routing to state service`
      );

      try {
        await stateService.onUpdated(entity.id, entity, changedFields, "system", queryRunner);
      } catch (err) {
        logger.error(`[SupplierSubscriber] Failed to handle onUpdated for supplier #${entity.id}:`, err);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 3. Detect Restoration (deletedAt becomes null)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity.deletedAt !== undefined && entity.deletedAt === null) {
      logger.info(`[SupplierSubscriber] Supplier #${entity.id} restored → routing to state service`);

      try {
        await stateService.onRestored(entity.id, entity, "system", queryRunner);
      } catch (err) {
        logger.error(`[SupplierSubscriber] Failed to handle onRestored for supplier #${entity.id}:`, err);
      }
    }
  }

  /**
   * @param {import("../entities/Supplier")} entity
   */
  beforeRemove(entity) {
    logger.debug("[SupplierSubscriber] beforeRemove:", {
      id: entity?.id,
      name: entity?.name,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;
    logger.info("[SupplierSubscriber] afterRemove:", {
      id: entityId,
    });

    // ✅ Route to state service for side effects
    try {
      const { SupplierStateService } = require("../stateServices/Supplier");
      const stateService = new SupplierStateService(AppDataSource);
      await stateService.onDeleted(entityId, databaseEntity, "system", queryRunner);
    } catch (err) {
      logger.error(`[SupplierSubscriber] Failed to handle onDeleted for supplier #${entityId}:`, err);
    }
  }
}

module.exports = SupplierSubscriber;