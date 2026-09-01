// src/subscribers/InventoryMovementSubscriber.js
//@ts-check
const InventoryMovement = require("../entities/InventoryMovement");
const Meat = require("../entities/Meat");
const Batch = require("../entities/Batch");
const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading InventoryMovementSubscriber");

class InventoryMovementSubscriber {
  listenTo() {
    return InventoryMovement;
  }

  /**
   * @param {import("../entities/InventoryMovement")} entity
   */
  beforeInsert(entity) {
    logger.debug("[InventoryMovementSubscriber] beforeInsert:", {
      id: entity?.id,
      movementType: entity?.movementType,
      qtyChange: entity?.qtyChange,
      meatId: entity?.meatId,
      batchId: entity?.batchId,
      saleId: entity?.saleId,
      notes: entity?.notes?.substring(0, 50),
    });
  }

  /**
   * @param {import("../entities/InventoryMovement")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    // Load relations for better logging context
    let meatName = null;
    let batchCode = null;

    try {
      if (entity.meatId) {
        // ✅ Use imported Meat entity, not string
        const meat = await manager.getRepository(Meat).findOne({
          where: { id: entity.meatId },
          select: ["name"], // only fetch what we need
        });
        meatName = meat?.name || null;
      }
      if (entity.batchId) {
        // ✅ Use imported Batch entity, not string
        const batch = await manager.getRepository(Batch).findOne({
          where: { id: entity.batchId },
          select: ["batchCode"], // only fetch what we need
        });
        batchCode = batch?.batchCode || null;
      }
    } catch (err) {
      // Non-critical – log warning but don't break transaction
      logger.warn(
        `[InventoryMovementSubscriber] Failed to load relations for movement #${entity.id}:`,
        err.message,
      );
    }

    logger.info("[InventoryMovementSubscriber] afterInsert:", {
      id: entity.id,
      movementType: entity.movementType,
      qtyChange: entity.qtyChange,
      meatId: entity.meatId,
      meatName:
        entity.meat?.name || (await this._getMeatName(entity.meatId, manager)),
      batchId: entity.batchId,
      batchCode:
        entity.batch?.batchCode ||
        (await this._getBatchCode(entity.batchId, manager)),
      saleId: entity.saleId,
      notes: entity.notes?.substring(0, 50),
      timestamp: entity.timestamp,
    });

    // ✅ Route to state service for side effects (UI broadcast, audit log, batch update broadcast)
    if (entity.batchId) {
      try {
        const {
          InventoryMovementStateService,
        } = require("../stateServices/InventoryMovement");
        const stateService = new InventoryMovementStateService(AppDataSource);
        await stateService.onMovementCreated(entity, "system", queryRunner);
      } catch (err) {
        logger.error(
          `[InventoryMovementSubscriber] Failed to handle movement #${entity.id}:`,
          err,
        );
      }
    }
  }

  /**
   * @param {import("../entities/InventoryMovement")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[InventoryMovementSubscriber] beforeUpdate:", {
      id: entity?.id,
      movementType: entity?.movementType,
      qtyChange: entity?.qtyChange,
      notes: entity?.notes?.substring(0, 50),
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    // Load relations for better logging context
    let meatName = null;
    let batchCode = null;

    try {
      if (entity.meatId) {
        const meat = await manager.getRepository(Meat).findOne({
          where: { id: entity.meatId },
          select: ["name"],
        });
        meatName = meat?.name || null;
      }
      if (entity.batchId) {
        const batch = await manager.getRepository(Batch).findOne({
          where: { id: entity.batchId },
          select: ["batchCode"],
        });
        batchCode = batch?.batchCode || null;
      }
    } catch (err) {
      logger.warn(
        `[InventoryMovementSubscriber] Failed to load relations for movement #${entity.id} on update:`,
        err.message,
      );
    }

    logger.info("[InventoryMovementSubscriber] afterUpdate:", {
      id: entity.id,
      movementType: entity.movementType,
      qtyChange: entity.qtyChange,
      meatId: entity.meatId,
      meatName:
        entity.meat?.name || (await this._getMeatName(entity.meatId, manager)),
      batchId: entity.batchId,
      batchCode:
        entity.batch?.batchCode ||
        (await this._getBatchCode(entity.batchId, manager)),
      saleId: entity.saleId,
      oldMovementType: databaseEntity?.movementType,
      newMovementType: entity.movementType,
      oldNotes: databaseEntity?.notes?.substring(0, 50),
      newNotes: entity.notes?.substring(0, 50),
      oldQtyChange: databaseEntity?.qtyChange,
      newQtyChange: entity.qtyChange,
      updatedAt: entity.updatedAt,
    });

    // Skip if no changes
    if (!databaseEntity) return;

    const {
      InventoryMovementStateService,
    } = require("../stateServices/InventoryMovement");
    const stateService = new InventoryMovementStateService(AppDataSource);

    // Detect other field changes (notes, movementType, timestamp)
    const changedFields = {};
    const skipKeys = [
      "id",
      "updatedAt",
      "createdAt",
      "meatId",
      "batchId",
      "saleId",
      "qtyChange",
    ];

    for (const key of Object.keys(entity)) {
      if (!skipKeys.includes(key)) {
        if (databaseEntity[key] !== entity[key]) {
          changedFields[key] = { old: databaseEntity[key], new: entity[key] };
        }
      }
    }

    if (Object.keys(changedFields).length > 0) {
      logger.info(
        `[InventoryMovementSubscriber] Movement #${entity.id} updated (fields: ${Object.keys(changedFields).join(", ")}) → routing to state service`,
      );

      try {
        await stateService.onMovementUpdated(
          entity.id,
          entity,
          changedFields,
          "system",
          queryRunner,
        );
      } catch (err) {
        logger.error(
          `[InventoryMovementSubscriber] Failed to handle onMovementUpdated for movement #${entity.id}:`,
          err,
        );
      }
    }
  }

  /**
   * @param {import("../entities/InventoryMovement")} entity
   */
  beforeRemove(entity) {
    logger.debug("[InventoryMovementSubscriber] beforeRemove:", {
      id: entity?.id,
      movementType: entity?.movementType,
      qtyChange: entity?.qtyChange,
      meatId: entity?.meatId,
      batchId: entity?.batchId,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event, { manager, queryRunner }) {
    const { entityId, databaseEntity } = event;

    let movementType = databaseEntity?.movementType;
    let qtyChange = databaseEntity?.qtyChange;
    let batchId = databaseEntity?.batchId;
    let meatId = databaseEntity?.meatId;
    let batchCode = null;
    let meatName = null;

    // If databaseEntity not fully loaded, try to fetch it
    if (!databaseEntity) {
      try {
        const repo = manager.getRepository(InventoryMovement);
        const movement = await repo.findOne({
          where: { id: entityId },
          withDeleted: true,
        });
        movementType = movement?.movementType;
        qtyChange = movement?.qtyChange;
        batchId = movement?.batchId;
        meatId = movement?.meatId;
      } catch (err) {
        // Silently fail – non-critical
      }
    }

    // Try to get batchCode and meatName even on delete
    try {
      if (batchId) {
        const batch = await manager.getRepository(Batch).findOne({
          where: { id: batchId },
          select: ["batchCode"],
          withDeleted: true,
        });
        batchCode = batch?.batchCode || null;
      }
      if (meatId) {
        const meat = await manager.getRepository(Meat).findOne({
          where: { id: meatId },
          select: ["name"],
          withDeleted: true,
        });
        meatName = meat?.name || null;
      }
    } catch (err) {
      logger.warn(
        `[InventoryMovementSubscriber] Failed to load relations for deleted movement #${entityId}:`,
        err.message,
      );
    }

    logger.info("[InventoryMovementSubscriber] afterRemove:", {
      id: entityId,
      movementType: movementType,
      qtyChange: qtyChange,
      meatId: meatId,
      meatName: meatName,
      batchId: batchId,
      batchCode: batchCode,
      deletedAt: new Date().toISOString(),
    });

    // ✅ Route to state service for side effects
    try {
      const {
        InventoryMovementStateService,
      } = require("../stateServices/InventoryMovement");
      const stateService = new InventoryMovementStateService(AppDataSource);
      await stateService.onMovementDeleted(
        entityId,
        databaseEntity,
        "system",
        queryRunner,
      );
    } catch (err) {
      logger.error(
        `[InventoryMovementSubscriber] Failed to handle onMovementDeleted for movement #${entityId}:`,
        err,
      );
    }
  }

  /**
   * Helper to get meat name by ID
   * @param {number} meatId
   * @param {import("typeorm").EntityManager} manager
   * @returns {Promise<string|null>}
   */
  async _getMeatName(meatId, manager) {
    try {
      if (!meatId) return null;
      const meat = await manager.getRepository(Meat).findOne({
        where: { id: meatId },
        select: ["name"],
      });
      return meat?.name || null;
    } catch (err) {
      logger.warn(
        `[InventoryMovementSubscriber] Failed to get meat name for ID ${meatId}:`,
        err.message,
      );
      return null;
    }
  }

  /**
   * Helper to get batch code by ID
   * @param {number} batchId
   * @param {import("typeorm").EntityManager} manager
   * @returns {Promise<string|null>}
   */
  async _getBatchCode(batchId, manager) {
    try {
      if (!batchId) return null;
      const batch = await manager.getRepository(Batch).findOne({
        where: { id: batchId },
        select: ["batchCode"],
      });
      return batch?.batchCode || null;
    } catch (err) {
      logger.warn(
        `[InventoryMovementSubscriber] Failed to get batch code for ID ${batchId}:`,
        err.message,
      );
      return null;
    }
  }
}

module.exports = InventoryMovementSubscriber;

// ┌──────────────────────────────────────────────────────────────────┐
// │ 1. IPC Handler: refund_sale.ipc.js                            │
// │    - Validates saleId                                          │
// │    - Calls SaleService.refundSale                             │
// └──────────────────────────────────────────────────────────────────┘
//                               ↓
// ┌──────────────────────────────────────────────────────────────────┐
// │ 2. SaleService.refundSale (SETTER)                             │
// │    - Validates sale exists and status = "paid"                 │
// │    - Updates status → "refunded"                              │
// │    - Updates notes with reason                                 │
// │    - Saves via updateDb (triggers subscriber)                  │
// └──────────────────────────────────────────────────────────────────┘
//                               ↓
// ┌──────────────────────────────────────────────────────────────────┐
// │ 3. SaleSubscriber.afterUpdate                                 │
// │    - Detects status change: paid → refunded                   │
// │    - Calls SaleStateService.onRefunded                        │
// └──────────────────────────────────────────────────────────────────┘
//                               ↓
// ┌──────────────────────────────────────────────────────────────────┐
// │ 4. SaleStateService.onRefunded (SIDE EFFECTS)                 │
// │    - For each sale item:                                       │
// │      a. Get the batch                                          │
// │      b. Call BatchService.addToBatch                          │
// │      c. Create InventoryMovement (refund)                     │
// │    - Reverse loyalty points (if any)                          │
// │    - Audit log                                                │
// │    - Send notification (optional)                             │
// └──────────────────────────────────────────────────────────────────┘
//                               ↓
// ┌──────────────────────────────────────────────────────────────────┐
// │ 5. BatchService.addToBatch (SETTER)                           │
// │    - Adds weight to batch.remainingQuantity                   │
// │    - Updates status if needed (depleted → active)            │
// │    - Saves via updateDb (triggers BatchSubscriber)           │
// └──────────────────────────────────────────────────────────────────┘
//                               ↓
// ┌──────────────────────────────────────────────────────────────────┐
// │ 6. BatchSubscriber.afterUpdate                                │
// │    - Detects remainingQuantity change                         │
// │    - Calls BatchStateService.onUpdate                         │
// └──────────────────────────────────────────────────────────────────┘
//                               ↓
// ┌──────────────────────────────────────────────────────────────────┐
// │ 7. BatchStateService.onUpdate (SIDE EFFECTS)                  │
// │    - Broadcasts to UI (batch:updated)                         │
// │    - Audit log                                                │
// │    - Notification if depleted/expired                         │
// └──────────────────────────────────────────────────────────────────┘
