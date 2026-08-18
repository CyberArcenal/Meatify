// src/stateServices/PurchaseState.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Purchase = require("../entities/Purchase");
const PurchaseItem = require("../entities/PurchaseItem");
const notificationService = require("../services/Notification");

/**
 * PurchaseStateService handles state transitions for purchases.
 * It does NOT contain CRUD operations – those belong to PurchaseService.
 * All methods here modify the state (status) of purchases and trigger side effects.
 */
class PurchaseStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.purchaseRepo = dataSource.getRepository(Purchase);
    this.purchaseItemRepo = dataSource.getRepository(PurchaseItem);
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
   * Approve a purchase (pending → approved) – notifies supplier
   * @param {number} purchaseId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async approve(purchaseId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");

    const purchaseRepo = this._getRepo(queryRunner, Purchase);

    const purchase = await purchaseRepo.findOne({
      where: { id: purchaseId },
      relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
    });
    if (!purchase) {
      throw new Error(`Purchase #${purchaseId} not found`);
    }

    if (purchase.status !== "pending") {
      throw new Error(`Cannot approve a purchase with status "${purchase.status}"`);
    }

    logger.info(`[PurchaseState] Approving purchase #${purchaseId}`);

    purchase.status = "approved";
    purchase.updatedAt = new Date();

    const approvedPurchase = await updateDb(purchaseRepo, purchase, { queryRunner });

    await auditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { status: "pending" },
      { status: "approved" },
      user
    );

    // Side effect: Notify supplier
    try {
      await this._notifySupplier(purchase, "approved", user, queryRunner);
    } catch (err) {
      logger.error(`[PurchaseState] Failed to notify supplier for purchase #${purchaseId}:`, err);
    }

    logger.info(`[PurchaseState] Purchase #${purchaseId} approved`);
    return approvedPurchase;
  }

  /**
   * Complete a purchase (approved/confirmed → completed) – creates batches and updates stock
   * @param {number} purchaseId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async complete(purchaseId, user = "system", queryRunner = null) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

    const purchaseRepo = this._getRepo(queryRunner, Purchase);
    const purchaseItemRepo = this._getRepo(queryRunner, PurchaseItem);
    const Batch = require("../entities/Batch");
    const InventoryMovement = require("../entities/InventoryMovement");

    const purchase = await purchaseRepo.findOne({
      where: { id: purchaseId },
      relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
    });
    if (!purchase) {
      throw new Error(`Purchase #${purchaseId} not found`);
    }

    if (purchase.status !== "approved" && purchase.status !== "confirmed") {
      throw new Error(`Cannot complete a purchase with status "${purchase.status}"`);
    }

    logger.info(`[PurchaseState] Completing purchase #${purchaseId}`);

    const batchRepo = this._getRepo(queryRunner, Batch);
    const movementRepo = this._getRepo(queryRunner, InventoryMovement);

    // --- STEP 1: Create batches for each purchase item ---
    for (const item of purchase.purchaseItems) {
      const batch = batchRepo.create({
        batchCode: await this._generateBatchCode(batchRepo),
        initialQuantity: item.quantity,
        remainingQuantity: item.quantity,
        unitCost: item.unitPrice,
        expiryDate: item.expiryDate,
        receivedDate: new Date(),
        status: "active",
        note: `Purchase #${purchase.id} - ${purchase.referenceNo}`,
        meat: item.meat,
        supplier: purchase.supplier || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const savedBatch = await saveDb(batchRepo, batch, { queryRunner });

      // Create inventory movement for batch addition
      const movement = movementRepo.create({
        movementType: "purchase",
        qtyChange: item.quantity,
        notes: `Purchase #${purchase.id} - ${purchase.referenceNo}`,
        meat: item.meat,
        batch: savedBatch,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await saveDb(movementRepo, movement, { queryRunner });

      await auditLogger.logCreate("Batch", savedBatch.id, savedBatch, user);
      await auditLogger.logCreate("InventoryMovement", movement.id, movement, user);
    }

    // --- STEP 2: Update purchase status ---
    purchase.status = "completed";
    purchase.updatedAt = new Date();

    const completedPurchase = await updateDb(purchaseRepo, purchase, { queryRunner });

    await auditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { status: purchase.status === "approved" ? "approved" : "confirmed" },
      { status: "completed" },
      user
    );

    // --- STEP 3: Side effects - Notify supplier ---
    try {
      await this._notifySupplier(purchase, "completed", user, queryRunner);
    } catch (err) {
      logger.error(`[PurchaseState] Failed to notify supplier for purchase #${purchaseId}:`, err);
    }

    logger.info(`[PurchaseState] Purchase #${purchaseId} completed, ${purchase.purchaseItems.length} batch(es) created`);
    return completedPurchase;
  }

  /**
   * Cancel a purchase (pending/approved/confirmed → cancelled)
   * @param {number} purchaseId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async cancel(purchaseId, reason = "", user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");

    const purchaseRepo = this._getRepo(queryRunner, Purchase);

    const purchase = await purchaseRepo.findOne({
      where: { id: purchaseId },
      relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
    });
    if (!purchase) {
      throw new Error(`Purchase #${purchaseId} not found`);
    }

    if (purchase.status === "completed") {
      throw new Error("Cannot cancel a completed purchase");
    }

    if (purchase.status === "cancelled") {
      logger.warn(`[PurchaseState] Purchase #${purchaseId} is already cancelled`);
      return purchase;
    }

    const oldStatus = purchase.status;
    logger.info(`[PurchaseState] Cancelling purchase #${purchaseId} (from ${oldStatus})`);

    purchase.status = "cancelled";
    purchase.notes = purchase.notes
      ? `${purchase.notes}\nCancelled: ${reason}`
      : `Cancelled: ${reason}`;
    purchase.updatedAt = new Date();

    const cancelledPurchase = await updateDb(purchaseRepo, purchase, { queryRunner });

    await auditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { status: oldStatus },
      { status: "cancelled" },
      user
    );

    // Side effect: Notify supplier
    try {
      await this._notifySupplier(purchase, "cancelled", user, queryRunner, reason);
    } catch (err) {
      logger.error(`[PurchaseState] Failed to notify supplier for purchase #${purchaseId}:`, err);
    }

    logger.info(`[PurchaseState] Purchase #${purchaseId} cancelled`);
    return cancelledPurchase;
  }

  // --- Helper methods ---

  /**
   * Notify supplier about purchase status change
   * @private
   */
  async _notifySupplier(purchase, action, user, queryRunner, reason = "") {
    if (!purchase.supplier) {
      logger.warn(`[PurchaseState] No supplier for purchase #${purchase.id}, skipping notification`);
      return;
    }

    const supplier = purchase.supplier;
    let title, message, type;

    switch (action) {
      case "approved":
        title = "Purchase Order Approved";
        message = `Purchase #${purchase.referenceNo} has been approved. Please prepare the order.`;
        type = "info";
        break;
      case "completed":
        title = "Purchase Order Completed";
        message = `Purchase #${purchase.referenceNo} has been completed. Stock has been added to inventory.`;
        type = "success";
        break;
      case "cancelled":
        title = "Purchase Order Cancelled";
        message = `Purchase #${purchase.referenceNo} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`;
        type = "warning";
        break;
      default:
        return;
    }

    try {
      await notificationService.create(
        {
          userId: 1, // admin
          title,
          message: `${message}\nSupplier: ${supplier.name}`,
          type,
          metadata: {
            purchaseId: purchase.id,
            referenceNo: purchase.referenceNo,
            supplierId: supplier.id,
            action,
          },
        },
        user,
        queryRunner
      );
      logger.info(`[PurchaseState] Notification sent for purchase #${purchase.id}: ${action}`);
    } catch (err) {
      logger.error(`[PurchaseState] Failed to send notification:`, err);
    }
  }

  /**
   * Generate a unique batch code
   * @param {import("typeorm").Repository<any>} repo
   * @returns {Promise<string>}
   */
  async _generateBatchCode(repo) {
    const prefix = "BATCH";
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    let code = `${prefix}-${datePart}-${randomPart}`;

    let attempts = 0;
    let existing = await repo.findOne({ where: { batchCode: code } });
    while (existing && attempts < 5) {
      const newRandom = Math.floor(1000 + Math.random() * 9000);
      code = `${prefix}-${datePart}-${newRandom}`;
      existing = await repo.findOne({ where: { batchCode: code } });
      attempts++;
    }
    if (existing) {
      code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    return code;
  }
}

module.exports = { PurchaseStateService };