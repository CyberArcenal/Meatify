// src/subscribers/BatchSubscriber.js
const Batch = require("../entities/Batch");
const { logger } = require("../utils/logger");
const { BatchStateService } = require("../stateServices/Batch");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading BatchSubscriber");

class BatchSubscriber {
  constructor() {
    this.stateService = null;
  }

  async getStateService(dataSource) {
    if (!this.stateService) {
      this.stateService = new BatchStateService(dataSource);
    }
    return this.stateService;
  }

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
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[BatchSubscriber] afterInsert:", {
      id: entity.id,
      batchCode: entity.batchCode,
      meatId: entity.meatId,
      remainingQty: entity.remainingQuantity,
      status: entity.status,
    });

    // Check if batch is expiring soon
    const expiryDate = new Date(entity.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
      logger.warn(`[BatchSubscriber] Batch #${entity.id} expires in ${daysUntilExpiry} days`);
      // TODO: Schedule notification
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

    // If status changed to 'depleted', trigger notification
    if (databaseEntity && databaseEntity.status !== "depleted" && entity.status === "depleted") {
      logger.info(`[BatchSubscriber] Batch #${entity.id} depleted`);
      // TODO: Send depletion notification
    }

    // If status changed to 'expired', trigger notification
    if (databaseEntity && databaseEntity.status !== "expired" && entity.status === "expired") {
      logger.info(`[BatchSubscriber] Batch #${entity.id} expired`);
      // TODO: Send expiration notification
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
  afterRemove(event) {
    logger.info("[BatchSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = BatchSubscriber;