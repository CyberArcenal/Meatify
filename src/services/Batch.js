// src/services/Batch.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "batchCode",
  "initialQuantity",
  "remainingQuantity",
  "unitCost",
  "expiryDate",
  "receivedDate",
  "status",
  "note",
  "createdAt",
  "updatedAt",
]);

class BatchService {
  constructor() {
    this.batchRepository = null;
    this.meatRepository = null;
    this.supplierRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Batch = require("../entities/Batch");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.batchRepository = AppDataSource.getRepository(Batch);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    logger.debug("BatchService initialized");
  }

  async getRepositories() {
    if (!this.batchRepository) {
      await this.initialize();
    }
    return {
      batch: this.batchRepository,
      meat: this.meatRepository,
      supplier: this.supplierRepository,
    };
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    const qrType = qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    logger.debug(`[Batch._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Batch._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  async findById(id, includeDeleted = false, qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const queryBuilder = batchRepo
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.meat", "meat")
      .leftJoinAndSelect("batch.supplier", "supplier")
      .where("batch.id = :id", { id });

    if (!includeDeleted) {
      queryBuilder.andWhere("batch.status IN ('active', 'on_hold')");
    }

    const batch = await queryBuilder.getOne();
    if (!batch) {
      throw new Error(`Batch with ID ${id} not found`);
    }
    return batch;
  }

  async findAll(options = {}, qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const qb = batchRepo
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.meat", "meat")
      .leftJoinAndSelect("batch.supplier", "supplier");

    if (options.meatId) {
      qb.andWhere("batch.meatId = :meatId", { meatId: options.meatId });
    }
    if (options.supplierId) {
      qb.andWhere("batch.supplierId = :supplierId", { supplierId: options.supplierId });
    }
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      const allowedStatuses = await this._getAllowedStatuses(qr);
      const invalidStatuses = statuses.filter(s => !allowedStatuses.includes(s));
      if (invalidStatuses.length > 0) {
        logger.warn(`[Batch] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${allowedStatuses.join(", ")}`);
      }
      qb.andWhere("batch.status IN (:...statuses)", { statuses });
    }
    if (options.expiryDateFrom) {
      qb.andWhere("batch.expiryDate >= :expiryDateFrom", {
        expiryDateFrom: new Date(options.expiryDateFrom),
      });
    }
    if (options.expiryDateTo) {
      qb.andWhere("batch.expiryDate <= :expiryDateTo", {
        expiryDateTo: new Date(options.expiryDateTo),
      });
    }
    if (options.minRemaining !== undefined) {
      qb.andWhere("batch.remainingQuantity >= :minRemaining", {
        minRemaining: options.minRemaining,
      });
    }
    if (options.maxRemaining !== undefined) {
      qb.andWhere("batch.remainingQuantity <= :maxRemaining", {
        maxRemaining: options.maxRemaining,
      });
    }
    if (options.search) {
      qb.andWhere(
        "(batch.batchCode LIKE :search OR batch.note LIKE :search OR meat.name LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    if (!options.includeInactive) {
      qb.andWhere("batch.status IN ('active', 'on_hold')");
    }

    let sortBy = options.sortBy || "expiryDate";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      sortBy = "expiryDate";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`batch.${sortBy}`, sortOrder);

    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    return result;
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (Setters)
  // ============================================================

  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    const batchRepo = this._getRepo(qr, Batch);
    const meatRepo = this._getRepo(qr, Meat);
    const supplierRepo = this._getRepo(qr, Supplier);

    try {
      if (!data.meatId) throw new Error("meatId is required");
      if (!data.quantity || data.quantity <= 0) throw new Error("quantity must be greater than 0");
      if (!data.unitCost || data.unitCost < 0) throw new Error("unitCost must be non-negative");
      if (!data.expiryDate) throw new Error("expiryDate is required");

      const meat = await meatRepo.findOne({ where: { id: data.meatId, isActive: true } });
      if (!meat) {
        throw new Error(`Meat with ID ${data.meatId} not found or inactive`);
      }

      let supplier = null;
      if (data.supplierId) {
        supplier = await supplierRepo.findOne({ where: { id: data.supplierId, isActive: true } });
        if (!supplier) {
          throw new Error(`Supplier with ID ${data.supplierId} not found or inactive`);
        }
      }

      const allowedStatuses = await this._getAllowedStatuses(qr);
      if (data.status && !allowedStatuses.includes(data.status)) {
        throw new Error(`Invalid batch status: ${data.status}. Allowed: ${allowedStatuses.join(", ")}`);
      }

      let batchCode = data.batchCode;
      if (!batchCode) {
        const prefix = await this._getCompanyPrefix(qr);
        batchCode = await this.generateBatchCode(batchRepo, prefix);
      } else {
        const existing = await batchRepo.findOne({ where: { batchCode } });
        if (existing) {
          throw new Error(`Batch code "${batchCode}" already exists`);
        }
      }

      const expiryDate = new Date(data.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new Error("Invalid expiryDate format");
      }

      const batch = batchRepo.create({
        batchCode,
        initialQuantity: data.quantity,
        remainingQuantity: data.quantity,
        unitCost: data.unitCost,
        expiryDate,
        receivedDate: new Date(),
        status: data.status || "active",
        note: data.note || null,
        meat: meat,
        supplier: supplier || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(batchRepo, batch, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Batch", saved.id, saved, user);
      }

      logger.debug(`Batch created: #${saved.id} - ${saved.batchCode}`);
      return saved;
    } catch (error) {
      console.error("Failed to create batch:", error.message);
      throw error;
    }
  }

  /**
   * ✅ UPDATE BATCH (generic fields only – not remainingQuantity or status)
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    try {
      const existing = await batchRepo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Batch with ID ${id} not found`);
      }

      // ❌ Prevent direct updates to remainingQuantity – use dedicated methods below
      if (data.remainingQuantity !== undefined) {
        throw new Error("Use updateRemainingQuantity to update remainingQuantity");
      }

      // ❌ Prevent direct updates to status – use dedicated methods below
      if (data.status !== undefined && data.status !== existing.status) {
        throw new Error("Use updateStatus to update batch status");
      }

      const oldData = { ...existing };

      if (data.batchCode && data.batchCode !== existing.batchCode) {
        const duplicate = await batchRepo.findOne({ where: { batchCode: data.batchCode } });
        if (duplicate) {
          throw new Error(`Batch code "${data.batchCode}" already exists`);
        }
      }

      if (data.unitCost !== undefined && data.unitCost < 0) {
        throw new Error("unitCost must be non-negative");
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(batchRepo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Batch", id, oldData, saved, user);
      }

      logger.debug(`Batch updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update batch:", error.message);
      throw error;
    }
  }

  /**
   * ✅ DEDICATED SETTER: Update remainingQuantity
   * Called by state service or directly when quantity changes
   */
  async updateRemainingQuantity(id, newQuantity, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const existing = await batchRepo.findOne({ where: { id } });
    if (!existing) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    if (newQuantity < 0) {
      throw new Error(`Remaining quantity cannot be negative: ${newQuantity}`);
    }

    const oldData = { remainingQuantity: existing.remainingQuantity, status: existing.status };
    existing.remainingQuantity = newQuantity;

    // Auto-update status based on remaining quantity
    if (newQuantity === 0 && existing.status !== "expired") {
      existing.status = "depleted";
    } else if (newQuantity > 0 && existing.status === "depleted") {
      existing.status = "active";
    }

    existing.updatedAt = new Date();

    const saved = await updateDb(batchRepo, existing, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate("Batch", id, oldData, saved, user);
    }

    logger.debug(`Batch #${id} remainingQuantity updated: ${oldData.remainingQuantity} → ${newQuantity}`);
    return saved;
  }

  /**
   * ✅ DEDICATED SETTER: Update batch status
   * Called by state service or directly when status changes
   */
  async updateStatus(id, newStatus, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const allowedStatuses = await this._getAllowedStatuses(qr);
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(`Invalid batch status: ${newStatus}. Allowed: ${allowedStatuses.join(", ")}`);
    }

    const existing = await batchRepo.findOne({ where: { id } });
    if (!existing) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    if (existing.status === newStatus) {
      logger.debug(`Batch #${id} already has status ${newStatus}`);
      return existing;
    }

    const oldData = { status: existing.status };
    existing.status = newStatus;
    existing.updatedAt = new Date();

    const saved = await updateDb(batchRepo, existing, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate("Batch", id, oldData, saved, user);
    }

    logger.debug(`Batch #${id} status updated: ${oldData.status} → ${newStatus}`);
    return saved;
  }

  // ============================================================
  // 🧹 SOFT DELETE & RESTORE
  // ============================================================

  async delete(id, user = "system", qr = null) {
    // Use updateStatus to set to 'depleted' (if remaining is 0)
    const batch = await this.findById(id, false, qr);
    if (batch.remainingQuantity > 0) {
      throw new Error(
        `Cannot soft delete batch #${id} because remainingQuantity is ${batch.remainingQuantity}. Use updateRemainingQuantity first.`
      );
    }
    return this.updateStatus(id, "depleted", user, qr);
  }

  async restore(id, user = "system", qr = null) {
    const batch = await this.findById(id, true, qr);
    if (batch.status !== "depleted" && batch.status !== "expired") {
      throw new Error(`Batch #${id} is not soft-deleted (status: ${batch.status})`);
    }
    if (batch.remainingQuantity <= 0) {
      throw new Error(`Cannot restore batch #${id} because remainingQuantity is 0.`);
    }
    return this.updateStatus(id, "active", user, qr);
  }

  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const batch = await batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    await removeDb(batchRepo, batch, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("Batch", id, batch, user);
    }

    logger.debug(`Batch #${id} permanently deleted`);
  }

  // ============================================================
  // 🧮 FIFO DEDUCTION METHODS (Moved from StateService)
  // ============================================================

  /**
   * Deduct a specific weight from a single batch.
   * Uses updateRemainingQuantity to modify the batch.
   * Also creates an InventoryMovement record.
   * @param {number} batchId
   * @param {number} weightToDeduct - in kg
   * @param {string} reason - e.g., "sale", "adjustment"
   * @param {Object} metadata - { saleId?, notes? }
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
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(queryRunner, InventoryMovement);

    // Load batch with meat relation
    const batch = await this.findById(batchId, false, queryRunner);
    if (!batch) throw new Error(`Batch #${batchId} not found`);

    // Validate
    if (batch.status !== "active") {
      throw new Error(`Batch #${batchId} is not active (status: ${batch.status})`);
    }
    if (new Date(batch.expiryDate) < new Date()) {
      throw new Error(`Batch #${batchId} is expired (${batch.expiryDate})`);
    }
    if (batch.remainingQuantity < weightToDeduct) {
      throw new Error(
        `Insufficient remaining quantity in batch #${batchId}. Available: ${batch.remainingQuantity}, Requested: ${weightToDeduct}`
      );
    }

    const oldRemaining = batch.remainingQuantity;
    const newRemaining = oldRemaining - weightToDeduct;

    // 1. Update batch remaining quantity (service setter)
    const updatedBatch = await this.updateRemainingQuantity(
      batchId,
      newRemaining,
      user,
      queryRunner
    );

    // 2. Create InventoryMovement record
    const movement = movementRepo.create({
      movementType: reason,
      qtyChange: -weightToDeduct,
      notes: `Deducted from batch #${batchId}. ${metadata.notes || ""}`,
      meat: batch.meat,
      batch: updatedBatch,
      sale: metadata.saleId ? { id: metadata.saleId } : null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const savedMovement = await saveDb(movementRepo, movement, { queryRunner });

    const auditEnabled = await this._isAuditEnabled(queryRunner);
    if (auditEnabled) {
      await auditLogger.logCreate("InventoryMovement", savedMovement.id, savedMovement, user);
    }

    logger.info(
      `[Batch] Deducted ${weightToDeduct}kg from batch #${batchId} (${reason}). Remaining: ${updatedBatch.remainingQuantity}kg`
    );

    return { batch: updatedBatch, deductedWeight: weightToDeduct };
  }

  /**
   * Add weight back to a batch (refund or correction)
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
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const movementRepo = this._getRepo(queryRunner, InventoryMovement);

    const batch = await this.findById(batchId, true, queryRunner);
    if (!batch) throw new Error(`Batch #${batchId} not found`);

    if (batch.status === "expired") {
      throw new Error(`Cannot add to expired batch #${batchId}`);
    }

    const oldRemaining = batch.remainingQuantity;
    const newRemaining = oldRemaining + weightToAdd;

    // 1. Update batch remaining quantity
    const updatedBatch = await this.updateRemainingQuantity(
      batchId,
      newRemaining,
      user,
      queryRunner
    );

    // 2. Create InventoryMovement record
    const movement = movementRepo.create({
      movementType: reason,
      qtyChange: weightToAdd,
      notes: `Added to batch #${batchId}. ${metadata.notes || ""}`,
      meat: batch.meat,
      batch: updatedBatch,
      sale: metadata.saleId ? { id: metadata.saleId } : null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const savedMovement = await saveDb(movementRepo, movement, { queryRunner });

    const auditEnabled = await this._isAuditEnabled(queryRunner);
    if (auditEnabled) {
      await auditLogger.logCreate("InventoryMovement", savedMovement.id, savedMovement, user);
    }

    logger.info(
      `[Batch] Added ${weightToAdd}kg to batch #${batchId} (${reason}). Remaining: ${updatedBatch.remainingQuantity}kg`
    );

    return { batch: updatedBatch, addedWeight: weightToAdd };
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
      // Call deductFromBatch (which uses updateRemainingQuantity)
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
      `[Batch] FIFO deduction completed for meat #${meatId}: ${totalWeight}kg deducted from ${deductions.length} batch(es)`
    );

    return deductions;
  }

  /**
   * Mark a batch as expired (cron job)
   * @param {number} batchId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async markExpired(batchId, user = "system", queryRunner = null) {
    const batch = await this.findById(batchId, true, queryRunner);
    if (!batch) throw new Error(`Batch #${batchId} not found`);

    if (batch.status === "expired") {
      logger.warn(`[Batch] Batch #${batchId} already expired`);
      return batch;
    }

    if (new Date(batch.expiryDate) > new Date()) {
      throw new Error(`Batch #${batchId} is not yet expired (expiry: ${batch.expiryDate})`);
    }

    return this.updateStatus(batchId, "expired", user, queryRunner);
  }

  /**
   * ✅ NEW: Clean up expired batches (soft delete)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async cleanExpiredBatches(user = "system", qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const today = new Date();
    const expiredBatches = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate < :today", { today })
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getMany();

    if (expiredBatches.length === 0) {
      logger.info("[Batch] No expired batches to clean up");
      return { count: 0 };
    }

    let updatedCount = 0;
    for (const batch of expiredBatches) {
      try {
        await this.updateStatus(batch.id, "expired", user, qr);
        updatedCount++;
        logger.info(`[Batch] Batch #${batch.id} (${batch.batchCode}) marked as expired`);
      } catch (err) {
        logger.error(`[Batch] Failed to mark batch #${batch.id} as expired:`, err);
      }
    }

    logger.info(`[Batch] Cleaned up ${updatedCount} expired batches`);
    return { count: updatedCount };
  }

  // ============================================================
  // 📊 STATISTICS & HEALTH
  // ============================================================

  /**
   * Get batch statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const threshold = await this._getLowStockThreshold(qr);

    // Count by status
    const byStatus = await batchRepo
      .createQueryBuilder("batch")
      .select("batch.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("batch.status")
      .getRawMany();

    // Total remaining quantity
    const totalRemainingResult = await batchRepo
      .createQueryBuilder("batch")
      .select("SUM(batch.remainingQuantity)", "total")
      .where("batch.status IN ('active', 'on_hold')")
      .getRawOne();
    const totalRemaining = parseFloat(totalRemainingResult.total) || 0;

    // Expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSoon = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate <= :sevenDaysFromNow", { sevenDaysFromNow })
      .andWhere("batch.expiryDate >= :today", { today: new Date() })
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getCount();

    // Expired batches
    const expired = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate < :today", { today: new Date() })
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getCount();

    // Low stock batches
    const lowStockBatches = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.remainingQuantity <= :threshold", { threshold })
      .andWhere("batch.remainingQuantity > 0")
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getMany();

    return {
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {}),
      totalRemaining,
      expiringSoon,
      expired,
      lowStockBatches: lowStockBatches.length,
      lowStockThreshold: threshold,
      lowStockDetails: lowStockBatches.map(b => ({
        id: b.id,
        batchCode: b.batchCode,
        meatName: b.meat?.name,
        remainingQuantity: b.remainingQuantity,
      })),
    };
  }

  /**
   * Get batch health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);
    const threshold = await this._getLowStockThreshold(qr);

    const total = await batchRepo.count({ where: { status: "active" } });
    const expired = await batchRepo.count({
      where: { expiryDate: { $lt: new Date() }, status: "active" },
    });
    const expiringSoon = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate <= :soon", { soon: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
      .andWhere("batch.expiryDate >= :today", { today: new Date() })
      .andWhere("batch.status = 'active'")
      .getCount();

    const lowStock = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.remainingQuantity <= :threshold", { threshold })
      .andWhere("batch.remainingQuantity > 0")
      .andWhere("batch.status = 'active'")
      .getCount();

    const depleted = await batchRepo.count({ where: { status: "depleted" } });

    return {
      totalActive: total,
      expired,
      expiringSoon,
      lowStock,
      depleted,
      lowStockThreshold: threshold,
      healthScore: total > 0 ? Math.round(((total - expired - expiringSoon - lowStock) / total) * 100) : 100,
    };
  }

  // ============================================================
  // 🔒 PRIVATE HELPERS
  // ============================================================

  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[Batch] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  async _getAllowedStatuses(qr = null) {
    try {
      return await system.getArray("allowed_batch_statuses", SettingType.INVENTORY, [
        "active", "depleted", "expired", "on_hold"
      ]);
    } catch (error) {
      logger.warn(`[Batch] Failed to get allowed statuses: ${error.message}, using defaults`);
      return ["active", "depleted", "expired", "on_hold"];
    }
  }

  async _getLowStockThreshold(qr = null) {
    try {
      return await system.lowStockThreshold();
    } catch (error) {
      logger.warn(`[Batch] Failed to get low stock threshold: ${error.message}, defaulting to 5`);
      return 5;
    }
  }

  async _getCompanyPrefix(qr = null) {
    try {
      const company = await system.companyName();
      return company.substring(0, 4).toUpperCase();
    } catch (error) {
      logger.warn(`[Batch] Failed to get company name: ${error.message}, defaulting to "BATCH"`);
      return "BATCH";
    }
  }

  async generateBatchCode(repo, prefix = "BATCH") {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
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

// Singleton instance
const batchService = new BatchService();
module.exports = batchService;