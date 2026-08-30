// src/subscribers/SaleSubscriber.js
const Sale = require("../entities/Sale");
const { logger } = require("../utils/logger");
const { SaleStateService } = require("../stateServices/Sale");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading SaleSubscriber");

class SaleSubscriber {
  constructor() {
    this.stateService = null;
  }

  async getStateService(dataSource) {
    if (!this.stateService) {
      this.stateService = new SaleStateService(dataSource);
    }
    return this.stateService;
  }

  listenTo() {
    return Sale;
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  beforeInsert(entity) {
    logger.debug("[SaleSubscriber] beforeInsert:", {
      id: entity?.id,
      customerId: entity?.customerId,
      status: entity?.status,
      totalAmount: entity?.totalAmount,
      paymentMethod: entity?.paymentMethod,
    });
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[SaleSubscriber] afterInsert:", {
      id: entity.id,
      customerId: entity.customerId,
      status: entity.status,
      totalAmount: entity.totalAmount,
      paymentMethod: entity.paymentMethod,
    });

    // If sale is created with 'paid' status, trigger state service
    if (entity.status === "paid") {
      try {
        const service = await this.getStateService(manager.connection);
        await service.onPaid(entity.id, "system", queryRunner);
      } catch (err) {
        logger.error("[SaleSubscriber] Failed to process paid sale on insert:", err);
      }
    }
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[SaleSubscriber] beforeUpdate:", {
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

    logger.info("[SaleSubscriber] afterUpdate:", {
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
        case "paid":
          await service.onPaid(entity.id, "system", queryRunner);
          break;
        case "refunded":
          await service.onRefunded(entity.id, "", "system", queryRunner);
          break;
        case "voided":
          await service.onVoided(entity.id, "", "system", queryRunner);
          break;
        default:
          break;
      }
    } catch (err) {
      logger.error(`[SaleSubscriber] Failed to handle status change to ${entity.status}:`, err);
    }
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  beforeRemove(entity) {
    logger.debug("[SaleSubscriber] beforeRemove:", {
      id: entity?.id,
      status: entity?.status,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[SaleSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = SaleSubscriber;