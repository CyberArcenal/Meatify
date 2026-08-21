// src/subscribers/PurchaseSubscriber.js
const Purchase = require("../entities/Purchase");
const { logger } = require("../utils/logger");
const { PurchaseStateService } = require("../stateServices/Purchase");
const { AppDataSource } = require("../main/db/data-source");

console.log("[Subscriber] Loading PurchaseSubscriber");

class PurchaseSubscriber {
  constructor() {
    this.stateService = null;
  }

  async getStateService(dataSource) {
    if (!this.stateService) {
      this.stateService = new PurchaseStateService(dataSource);
    }
    return this.stateService;
  }

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

    // If purchase is created with 'approved' or 'completed' status, trigger state service
    if (entity.status === "approved") {
      try {
        const service = await this.getStateService(manager.connection);
        await service.approve(entity.id, "system", queryRunner);
      } catch (err) {
        logger.error("[PurchaseSubscriber] Failed to approve purchase on insert:", err);
      }
    }

    if (entity.status === "completed") {
      try {
        const service = await this.getStateService(manager.connection);
        await service.complete(entity.id, "system", queryRunner);
      } catch (err) {
        logger.error("[PurchaseSubscriber] Failed to complete purchase on insert:", err);
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

    // Skip if status hasn't changed
    if (databaseEntity && databaseEntity.status === entity.status) {
      return;
    }

    // Trigger state service based on new status
    try {
      const service = await this.getStateService(manager.connection);

      switch (entity.status) {
        case "approved":
          await service.approve(entity.id, "system", queryRunner);
          break;
        case "completed":
          await service.complete(entity.id, "system", queryRunner);
          break;
        case "cancelled":
          await service.cancel(entity.id, "", "system", queryRunner);
          break;
        default:
          break;
      }
    } catch (err) {
      logger.error(`[PurchaseSubscriber] Failed to handle status change to ${entity.status}:`, err);
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
  afterRemove(event) {
    logger.info("[PurchaseSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = PurchaseSubscriber;