// src/subscribers/InventoryMovementSubscriber.js
const InventoryMovement = require("../entities/InventoryMovement");
const { logger } = require("../utils/logger");
const { InventoryMovementStateService } = require("../stateServices/InventoryMovement");

console.log("[Subscriber] Loading InventoryMovementSubscriber");

class InventoryMovementSubscriber {
  constructor() {
    this.stateService = null;
  }

  async getStateService(dataSource) {
    if (!this.stateService) {
      this.stateService = new InventoryMovementStateService(dataSource);
    }
    return this.stateService;
  }

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
    });
  }

  /**
   * @param {import("../entities/InventoryMovement")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[InventoryMovementSubscriber] afterInsert:", {
      id: entity.id,
      movementType: entity.movementType,
      qtyChange: entity.qtyChange,
      meatId: entity.meatId,
      batchId: entity.batchId,
    });

    // Trigger batch update if batchId exists
    if (entity.batchId) {
      try {
        const service = await this.getStateService(manager.connection);
        await service.onMovementCreated(entity, "system", queryRunner);
      } catch (err) {
        logger.error("[InventoryMovementSubscriber] Failed to update batch:", err);
        // Don't throw – we don't want to break the transaction
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
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[InventoryMovementSubscriber] afterUpdate:", {
      id: entity?.id,
      oldNotes: databaseEntity?.notes,
      newNotes: entity?.notes,
    });
  }

  /**
   * @param {import("../entities/InventoryMovement")} entity
   */
  beforeRemove(entity) {
    logger.debug("[InventoryMovementSubscriber] beforeRemove:", {
      id: entity?.id,
      movementType: entity?.movementType,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[InventoryMovementSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = InventoryMovementSubscriber;