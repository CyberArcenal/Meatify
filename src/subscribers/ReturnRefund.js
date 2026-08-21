// src/subscribers/ReturnRefundSubscriber.js
const ReturnRefund = require("../entities/ReturnRefund");
const { logger } = require("../utils/logger");
const { ReturnRefundStateService } = require("../stateServices/ReturnRefund");
const { AppDataSource } = require("../main/db/data-source");

console.log("[Subscriber] Loading ReturnRefundSubscriber");

class ReturnRefundSubscriber {
  constructor() {
    this.stateService = null;
  }

  async getStateService(dataSource) {
    if (!this.stateService) {
      this.stateService = new ReturnRefundStateService(dataSource);
    }
    return this.stateService;
  }

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

    // If return is created with 'processed' status, trigger state service
    if (entity.status === "processed") {
      try {
        const service = await this.getStateService(manager.connection);
        await service.processReturn(entity.id, "system", queryRunner);
      } catch (err) {
        logger.error("[ReturnRefundSubscriber] Failed to process return on insert:", err);
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

    // Skip if status hasn't changed
    if (databaseEntity && databaseEntity.status === entity.status) {
      return;
    }

    // Trigger state service based on new status
    try {
      const service = await this.getStateService(manager.connection);

      switch (entity.status) {
        case "processed":
          await service.processReturn(entity.id, "system", queryRunner);
          break;
        case "cancelled":
          await service.cancelReturn(entity.id, "", "system", queryRunner);
          break;
        default:
          break;
      }
    } catch (err) {
      logger.error(`[ReturnRefundSubscriber] Failed to handle status change to ${entity.status}:`, err);
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
  afterRemove(event) {
    logger.info("[ReturnRefundSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = ReturnRefundSubscriber;