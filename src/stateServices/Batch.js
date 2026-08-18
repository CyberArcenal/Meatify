// src/stateServices/BatchStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Batch = require("../entities/Batch");

/**
 * BatchStateService handles state transitions and side effects for batches.
 * It does NOT contain CRUD operations – those belong to BatchService.
 * All methods here modify the state of batches (remainingQuantity, status, etc.)
 * and trigger side effects like notifications, inventory movements, etc.
 */
class BatchStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
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
   * Deduct a specific weight from a batch (FIFO helper)
   * This method modifies the batch's remainingQuantity and records a movement.
   * @param {number} batchId
   * @param {number} weightToDeduct - in kg
   * @param {string} reason - e.g., "sale", "adjustment"
   * @param {Object} metadata - additional info like saleId, notes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ batch: any, deductedWeight: number }>}
   */
  async deductFromBatch(
    batchId,
    weightToDeduct,
    reason = "adjustment",
    metadata = {},
    user = "system",
    queryRunner = null
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const InventoryMovement = require("../entities/InventoryMovement");

    const batchRepo = this._getRepo(queryRunner, Batch);
    const movementRepo = this._getRepo(queryRunner, InventoryMovement);

    // Load batch with relations
    const batch = await batchRepo.findOne({
      where: { id: batchId },
      relations: ["meat"],
    });
    if (!batch) {
      throw new Error(`Batch #${batchId} not found`);
    }

    // Validate batch status
    if (batch.status !== "active") {
      throw new Error(`Batch #${batchId} is not active (status: ${batch.status})`);
    }

    // Validate expiry
    if (new Date(batch.expiryDate) < new Date()) {
      throw new Error(`Batch #${batchId} is expired (${batch.expiryDate})`);
    }

    // Check sufficient remaining
    if (batch.remainingQuantity < weightToDeduct) {
      throw new Error(
        `Insufficient remaining quantity in batch #${batchId}. Available: ${batch.remainingQuantity}, Requested: ${weightToDeduct}`
      );
    }

    const oldRemaining = batch.remainingQuantity;
    batch.remainingQuantity -= weightToDeduct;
    batch.updatedAt = new Date();

    // If remaining becomes zero, update status to "depleted"
    if (batch.remainingQuantity === 0) {
      batch.status = "depleted";
    }

    // Save the updated batch
    const updatedBatch = await updateDb(batchRepo, batch, {
      queryRunner,
      skipSignal: false, // allow subscribers to trigger further effects
    });

    // Create inventory movement
    const movement = movementRepo.create({
      movementType: reason,
      qtyChange: -weightToDeduct,
      notes: `Deducted from batch #${batchId}. ${metadata.notes || ""}`,
      meat: batch.meat,
      batch: updatedBatch,
      sale: metadata.saleId ? { id: metadata.saleId } : null,
      timestamp: new Date(),
    });
    await saveDb(movementRepo, movement, { queryRunner });

    // Audit log
    await auditLogger.logUpdate(
      "Batch",
      batchId,
      { remainingQuantity: oldRemaining },
      { remainingQuantity: batch.remainingQuantity },
      user
    );
    await auditLogger.logCreate("InventoryMovement", movement.id, movement, user);

    logger.info(
      `[BatchState] Deducted ${weightToDeduct}kg from batch #${batchId} (${reason}). Remaining: ${batch.remainingQuantity}kg`
    );

    return { batch: updatedBatch, deductedWeight: weightToDeduct };
  }

  /**
   * Add quantity back to a batch (e.g., for refunds or corrections)
   * @param {number} batchId
   * @param {number} weightToAdd
   * @param {string} reason
   * @param {Object} metadata
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async addToBatch(
    batchId,
    weightToAdd,
    reason = "refund",
    metadata = {},
    user = "system",
    queryRunner = null
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const InventoryMovement = require("../entities/InventoryMovement");

    const batchRepo = this._getRepo(queryRunner, Batch);
    const movementRepo = this._getRepo(queryRunner, InventoryMovement);

    const batch = await batchRepo.findOne({
      where: { id: batchId },
      relations: ["meat"],
    });
    if (!batch) {
      throw new Error(`Batch #${batchId} not found`);
    }

    // Can only add to active or on_hold batches (or depleted if we want to reactivate)
    if (batch.status === "expired") {
      throw new Error(`Cannot add to expired batch #${batchId}`);
    }

    const oldRemaining = batch.remainingQuantity;
    batch.remainingQuantity += weightToAdd;
    batch.updatedAt = new Date();

    // If it was depleted, reactivate
    if (batch.status === "depleted") {
      batch.status = "active";
    }

    const updatedBatch = await updateDb(batchRepo, batch, {
      queryRunner,
      skipSignal: false,
    });

    const movement = movementRepo.create({
      movementType: reason,
      qtyChange: weightToAdd,
      notes: `Added to batch #${batchId}. ${metadata.notes || ""}`,
      meat: batch.meat,
      batch: updatedBatch,
      sale: metadata.saleId ? { id: metadata.saleId } : null,
      timestamp: new Date(),
    });
    await saveDb(movementRepo, movement, { queryRunner });

    await auditLogger.logUpdate(
      "Batch",
      batchId,
      { remainingQuantity: oldRemaining },
      { remainingQuantity: batch.remainingQuantity },
      user
    );
    await auditLogger.logCreate("InventoryMovement", movement.id, movement, user);

    logger.info(
      `[BatchState] Added ${weightToAdd}kg to batch #${batchId} (${reason}). Remaining: ${batch.remainingQuantity}kg`
    );

    return { batch: updatedBatch, addedWeight: weightToAdd };
  }

  /**
   * Mark a batch as expired (cron job)
   * @param {number} batchId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async markExpired(batchId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(queryRunner, Batch);

    const batch = await batchRepo.findOne({
      where: { id: batchId },
      relations: ["meat"],
    });
    if (!batch) {
      throw new Error(`Batch #${batchId} not found`);
    }

    if (batch.status === "expired") {
      logger.warn(`[BatchState] Batch #${batchId} already expired`);
      return batch;
    }

    // Only mark if expiry date has passed
    if (new Date(batch.expiryDate) > new Date()) {
      throw new Error(`Batch #${batchId} is not yet expired (expiry: ${batch.expiryDate})`);
    }

    const oldStatus = batch.status;
    batch.status = "expired";
    batch.updatedAt = new Date();

    const updatedBatch = await updateDb(batchRepo, batch, {
      queryRunner,
      skipSignal: false,
    });

    await auditLogger.logUpdate(
      "Batch",
      batchId,
      { status: oldStatus },
      { status: "expired" },
      user
    );

    logger.info(`[BatchState] Batch #${batchId} marked as expired`);

    // TODO: Send notification about expiration (can be added here)
    // await notificationService.create(...)

    return updatedBatch;
  }

  /**
   * FIFO Deduction – finds the oldest active batches and deducts sequentially
   * @param {number} meatId
   * @param {number} totalWeight
   * @param {string} reason
   * @param {Object} metadata
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Array<{ batch: any, deductedWeight: number }>>}
   */
  async fifoDeduct(
    meatId,
    totalWeight,
    reason = "sale",
    metadata = {},
    user = "system",
    queryRunner = null
  ) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(queryRunner, Batch);

    // Get active batches for this meat, sorted by expiryDate (oldest first)
    const batches = await batchRepo
      .createQueryBuilder("batch", queryRunner)
      .where("batch.meatId = :meatId", { meatId })
      .andWhere("batch.status = 'active'")
      .andWhere("batch.remainingQuantity > 0")
      .andWhere("batch.expiryDate >= :today", { today: new Date() })
      .orderBy("batch.expiryDate", "ASC")
      .getMany();

    if (batches.length === 0) {
      throw new Error(`No available active batches for meat ID ${meatId}`);
    }

    let remaining = totalWeight;
    const deductions = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const use = Math.min(batch.remainingQuantity, remaining);
      const result = await this.deductFromBatch(
        batch.id,
        use,
        reason,
        { ...metadata, notes: `FIFO deduction (remaining: ${remaining - use}kg)` },
        user,
        queryRunner
      );
      deductions.push(result);
      remaining -= use;
    }

    if (remaining > 0.001) {
      throw new Error(
        `Insufficient stock for meat ID ${meatId}. Needed ${totalWeight}kg, only ${totalWeight - remaining}kg available from active batches.`
      );
    }

    logger.info(
      `[BatchState] FIFO deduction completed for meat #${meatId}: ${totalWeight}kg deducted from ${deductions.length} batch(es)`
    );

    return deductions;
  }
}

module.exports = { BatchStateService };