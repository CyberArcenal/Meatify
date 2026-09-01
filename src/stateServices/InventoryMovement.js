// src/stateServices/InventoryMovementState.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const InventoryMovement = require("../entities/InventoryMovement");
const Batch = require("../entities/Batch");

/**
 * InventoryMovementStateService handles side effects when an inventory movement is created/updated.
 * It does NOT contain CRUD operations – those belong to InventoryMovementService.
 * Typically, this service will be called from subscribers when a movement is inserted,
 * to update the batch's remaining quantity (for sales, purchases, refunds) and trigger notifications.
 */
class InventoryMovementStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.movementRepo = dataSource.getRepository(InventoryMovement);
    this.batchRepo = dataSource.getRepository(Batch);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Called after a movement is inserted – update the associated batch's remaining quantity.
   * This should be triggered by a subscriber, but can also be called manually.
   * @param {InventoryMovement} movement - The newly created movement (with relations loaded)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMovementCreated(movement, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");

    // If movement is not linked to a batch, skip batch update
    if (!movement.batchId) {
      logger.info(
        `[InventoryMovementState] Movement #${movement.id} has no batch, skipping batch update.`,
      );
      return;
    }

    const batchRepo = this._getRepo(queryRunner, Batch);
    const batch = await batchRepo.findOne({ where: { id: movement.batchId } });
    if (!batch) {
      logger.warn(
        `[InventoryMovementState] Batch #${movement.batchId} not found for movement #${movement.id}`,
      );
      return;
    }

    // Apply the qtyChange to the batch's remainingQuantity
    const oldRemaining = batch.remainingQuantity;
    const newRemaining = oldRemaining + movement.qtyChange;
    if (newRemaining < 0) {
      // This should not happen if business logic is correct, but we log and throw.
      throw new Error(
        `Batch #${batch.id} would have negative remaining quantity (${newRemaining}) after movement #${movement.id}`,
      );
    }

    batch.remainingQuantity = newRemaining;
    // If remaining becomes zero, set status to "depleted"
    if (batch.remainingQuantity === 0 && batch.status !== "expired") {
      batch.status = "depleted";
    }
    // If we are adding back (positive qtyChange) and batch was depleted, reactivate
    if (
      movement.qtyChange > 0 &&
      batch.status === "depleted" &&
      batch.remainingQuantity > 0
    ) {
      batch.status = "active";
    }
    batch.updatedAt = new Date();

    await updateDb(batchRepo, batch, { queryRunner, skipSignal: false });

    // Audit log for batch update
    await auditLogger.logUpdate(
      "Batch",
      batch.id,
      { remainingQuantity: oldRemaining },
      { remainingQuantity: batch.remainingQuantity },
      user,
    );

    logger.info(
      `[InventoryMovementState] Batch #${batch.id} updated: remaining ${oldRemaining} → ${batch.remainingQuantity} (movement #${movement.id})`,
    );

    // Optional: send notification if batch is now depleted or expired
    if (batch.status === "depleted") {
      // TODO: send notification for depleted batch
    }
  }

  /**
   * Called after a movement is deleted (soft or hard) – reverse the effect on batch.
   * @param {number} movementId - The movement that was deleted
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMovementDeleted(movementId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    // We need the movement data to know qtyChange and batchId.
    // Since it might be deleted, we may need to store this info before deletion.
    // For now, we'll just log a warning.
    logger.warn(
      `[InventoryMovementState] onMovementDeleted not fully implemented for movement #${movementId}`,
    );
    // In a real implementation, you would retrieve the movement from the database before deletion,
    // or you could have a separate cleanup process.
  }

  /**
   * Recalculate batch remaining quantities from all movements – useful for fixing inconsistencies.
   * @param {number} batchId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async recalcBatchRemaining(batchId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const batchRepo = this._getRepo(queryRunner, Batch);
    const movementRepo = this._getRepo(queryRunner, InventoryMovement);

    const batch = await batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error(`Batch #${batchId} not found`);
    }

    // Sum all qtyChange for this batch (using soft-deleted? we'll use all)
    const result = await movementRepo
      .createQueryBuilder("movement", queryRunner)
      .select("SUM(movement.qtyChange)", "total")
      .where("movement.batchId = :batchId", { batchId })
      .getRawOne();
    const netChange = parseFloat(result.total) || 0;

    // Initial quantity + net change = remaining
    const newRemaining = batch.initialQuantity + netChange;
    if (newRemaining < 0) {
      throw new Error(
        `Recalculated remaining quantity for batch #${batchId} is negative (${newRemaining})`,
      );
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

    await auditLogger.logUpdate(
      "Batch",
      batchId,
      { remainingQuantity: oldRemaining },
      { remainingQuantity: batch.remainingQuantity },
      user,
    );

    logger.info(
      `[InventoryMovementState] Recalculated batch #${batchId}: ${oldRemaining} → ${batch.remainingQuantity}`,
    );
    return batch;
  }

  /**
   * Called after a movement is updated.
   * @param {number} movementId
   * @param {InventoryMovement} movement
   * @param {Object} changes - The changed fields
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMovementUpdated(
    movementId,
    movement,
    changes,
    user = "system",
    queryRunner = null,
  ) {
    logger.info(
      `[InventoryMovementState] Movement #${movementId} updated (fields: ${Object.keys(changes).join(", ")})`,
    );

    // Broadcast to UI
    try {
      const { BrowserWindow } = require("electron");
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send("inventoryMovement:updated", {
            id: movementId,
            changes,
            updatedAt: movement.updatedAt,
          });
        }
      });
    } catch (error) {
      logger.warn(
        "[InventoryMovementState] Failed to send IPC event:",
        error.message,
      );
    }

    // Audit log for movement update
    await auditLogger.logUpdate(
      "InventoryMovement",
      movementId,
      changes,
      movement,
      user,
    );
  }
}

module.exports = { InventoryMovementStateService };
