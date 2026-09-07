// src/stateServices/inventoryMovement/InventoryMovementStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const InventoryMovement = require("../../entities/InventoryMovement");
const Batch = require("../../entities/Batch");
const MovementCreatedModule = require("./modules/status/MovementCreatedModule");
const MovementUpdatedModule = require("./modules/status/MovementUpdatedModule");
const MovementDeletedModule = require("./modules/status/MovementDeletedModule");
const InventoryMovementStatusModule = require("./modules/InventoryMovementStatusModule");
const InventoryMovementBatchModule = require("./modules/InventoryMovementBatchModule");
const InventoryMovementAuditModule = require("./modules/InventoryMovementAuditModule");

/**
 * InventoryMovementStateService - Orchestrates side effects for inventory movement events.
 * It does NOT contain CRUD operations – those belong to InventoryMovementService.
 */
class InventoryMovementStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.movementRepo = dataSource.getRepository(InventoryMovement);
    this.batchRepo = dataSource.getRepository(Batch);

    // ─── Initialize modules ──────────────────────────────────────
    this.createdModule = new MovementCreatedModule(dataSource);
    this.updatedModule = new MovementUpdatedModule();
    this.deletedModule = new MovementDeletedModule();
    this.statusModule = new InventoryMovementStatusModule();
    this.batchModule = new InventoryMovementBatchModule(dataSource);
    this.auditModule = new InventoryMovementAuditModule();
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔄 SIDE EFFECTS (called by subscriber)
  // ============================================================

  /**
   * Called after a movement is inserted – update the associated batch's remaining quantity.
   * @param {InventoryMovement} movement - The newly created movement (with relations loaded)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMovementCreated(movement, user = "system", queryRunner = null) {
    logger.info(`[InventoryMovementState] Processing movement #${movement.id} created`);

    // 1. Validate creation (placeholder for future)
    const validation = this.statusModule.validateCreate(movement, {});
    if (!validation.valid) {
      logger.warn(`[InventoryMovementState] Creation validation: ${validation.reason}`);
    }

    // 2. Handle creation side effects (UI broadcast + batch update)
    await this.createdModule.handle(
      movement,
      this.batchModule.updateBatchFromMovement.bind(this.batchModule),
      user,
      queryRunner
    );

    // 3. Audit log
    await this.auditModule.logCreated(movement.id, movement, user);
  }

  /**
   * Called after a movement is deleted (soft or hard) – reverse the effect on batch.
   * @param {number} movementId - The movement that was deleted
   * @param {Object} movementData - The movement data (if available)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMovementDeleted(movementId, movementData, user = "system", queryRunner = null) {
    logger.info(`[InventoryMovementState] Movement #${movementId} deleted`);

    // 1. Validate deletion (placeholder for future)
    if (movementData) {
      const validation = this.statusModule.validateDelete(movementData, {});
      if (!validation.valid) {
        logger.warn(`[InventoryMovementState] Deletion validation: ${validation.reason}`);
      }
    }

    // 2. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(movementId, movementData, user);

    // 3. Audit log
    await this.auditModule.logDeleted(movementId, movementData, user);
  }

  /**
   * Called after a movement is updated.
   * @param {number} movementId
   * @param {InventoryMovement} movement
   * @param {Object} changes - The changed fields
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMovementUpdated(movementId, movement, changes, user = "system", queryRunner = null) {
    logger.info(`[InventoryMovementState] Movement #${movementId} updated (fields: ${Object.keys(changes).join(", ")})`);

    // 1. Validate update (placeholder for future)
    const validation = this.statusModule.validateUpdate(movement, changes, {});
    if (!validation.valid) {
      logger.warn(`[InventoryMovementState] Update validation: ${validation.reason}`);
    }

    // 2. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(movementId, movement, changes, user);

    // 3. Audit log
    await this.auditModule.logUpdated(movementId, changes, movement, user);
  }

  // ============================================================
  // 🔧 UTILITY METHODS (delegated to batch module)
  // ============================================================

  /**
   * Recalculate batch remaining quantities from all movements – useful for fixing inconsistencies.
   * @param {number} batchId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The updated batch
   */
  async recalcBatchRemaining(batchId, user = "system", queryRunner = null) {
    return this.batchModule.recalcBatchRemaining(batchId, user, queryRunner);
  }
}

module.exports = { InventoryMovementStateService };