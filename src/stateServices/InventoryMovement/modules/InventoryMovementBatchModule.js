// src/stateServices/inventoryMovement/modules/InventoryMovementBatchModule.js
const { logger } = require("../../../utils/logger");
const { updateDb } = require("../../../utils/dbUtils/dbActions");
const Batch = require("../../../entities/Batch");
const InventoryMovement = require("../../../entities/InventoryMovement");

/**
 * InventoryMovementBatchModule - Handles batch updates triggered by inventory movements.
 * This module updates batch remaining quantities and recalculates when needed.
 */
class InventoryMovementBatchModule {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.batchRepo = dataSource.getRepository(Batch);
    this.movementRepo = dataSource.getRepository(InventoryMovement);
  }

  /**
   * Helper: get repository (transactional)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Update batch remaining quantity based on a movement
   * @param {Object} movement - The movement entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The updated batch
   */
  async updateBatchFromMovement(movement, user = "system", queryRunner = null) {
    if (!movement.batchId) {
      logger.info(`[InventoryMovementBatch] Movement #${movement.id} has no batch, skipping.`);
      return null;
    }

    const batchRepo = this._getRepo(queryRunner, this.batchRepo.target);
    const batch = await batchRepo.findOne({ where: { id: movement.batchId } });
    if (!batch) {
      logger.warn(`[InventoryMovementBatch] Batch #${movement.batchId} not found for movement #${movement.id}`);
      return null;
    }

    const oldRemaining = batch.remainingQuantity;
    const newRemaining = oldRemaining + movement.qtyChange;
    if (newRemaining < 0) {
      throw new Error(
        `Batch #${batch.id} would have negative remaining quantity (${newRemaining}) after movement #${movement.id}`
      );
    }

    batch.remainingQuantity = newRemaining;

    // Update batch status if needed
    if (batch.remainingQuantity === 0 && batch.status !== "expired") {
      batch.status = "depleted";
    } else if (movement.qtyChange > 0 && batch.status === "depleted" && batch.remainingQuantity > 0) {
      batch.status = "active";
    }
    batch.updatedAt = new Date();

    await updateDb(batchRepo, batch, { queryRunner, skipSignal: false });

    logger.info(
      `[InventoryMovementBatch] Batch #${batch.id} updated: ${oldRemaining} → ${batch.remainingQuantity} (movement #${movement.id})`
    );

    return batch;
  }

  /**
   * Recalculate batch remaining quantity from all movements
   * @param {number} batchId - The batch ID
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The updated batch
   */
  async recalcBatchRemaining(batchId, user = "system", queryRunner = null) {
    const batchRepo = this._getRepo(queryRunner, this.batchRepo.target);
    const movementRepo = this._getRepo(queryRunner, this.movementRepo.target);

    const batch = await batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error(`Batch #${batchId} not found`);
    }

    const result = await movementRepo
      .createQueryBuilder("movement", queryRunner)
      .select("SUM(movement.qtyChange)", "total")
      .where("movement.batchId = :batchId", { batchId })
      .getRawOne();
    const netChange = parseFloat(result.total) || 0;

    const newRemaining = batch.initialQuantity + netChange;
    if (newRemaining < 0) {
      throw new Error(`Recalculated remaining quantity for batch #${batchId} is negative (${newRemaining})`);
    }

    const oldRemaining = batch.remainingQuantity;
    batch.remainingQuantity = newRemaining;
    if (batch.remainingQuantity === 0 && batch.status !== "expired") {
      batch.status = "depleted";
    } else if (batch.remainingQuantity > 0 && batch.status === "depleted") {
      batch.status = "active";
    }
    batch.updatedAt = new Date();

    await updateDb(batchRepo, batch, { queryRunner, skipSignal: false });

    logger.info(`[InventoryMovementBatch] Recalculated batch #${batchId}: ${oldRemaining} → ${batch.remainingQuantity}`);
    return batch;
  }
}

module.exports = InventoryMovementBatchModule;