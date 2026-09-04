// src/services/Batch.js
//@ts-check

const { logger } = require("../utils/logger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");
const { withRetry } = require("../utils/retry");
const { ConcurrencyError, NotFoundError, ValidationError } = require("../utils/errors");

const {
  batchCreateSchema,
  batchUpdateSchema,
  batchStatusSchema,
  batchRemainingQuantitySchema, // ✅ ADDED
} = require("../validation/schemas/batch.schema");
const { validate } = require("../validation");

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
  "version",
]);

/**
 * Batch status transition rules
 */
const STATUS_TRANSITIONS = {
  active: ["depleted", "expired", "on_hold"],
  on_hold: ["active", "depleted", "expired"],
  depleted: ["active", "expired"],
  expired: [],
};

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
   * @param {import("typeorm").QueryRunner | null | undefined} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr && typeof qr === "object" && !!qr.manager) {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    return AppDataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  /**
   * Find batch by ID
   * @param {number} id - Batch ID
   * @param {boolean} includeDeleted - Include soft-deleted (status: depleted/expired)
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<any>}
   */
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
      throw new NotFoundError(`Batch with ID ${id} not found`, "Batch");
    }
    return batch;
  }

  /**
   * Find all batches with filters, pagination, sorting
   * @param {Object} options - Filter options
   * @param {number} [options.meatId] - Filter by meat ID
   * @param {number} [options.supplierId] - Filter by supplier ID
   * @param {string|string[]} [options.status] - Filter by status(es)
   * @param {string} [options.expiryDateFrom] - Filter expiry date from
   * @param {string} [options.expiryDateTo] - Filter expiry date to
   * @param {number} [options.minRemaining] - Minimum remaining quantity
   * @param {number} [options.maxRemaining] - Maximum remaining quantity
   * @param {string} [options.search] - Search term
   * @param {boolean} [options.includeInactive] - Include inactive statuses
   * @param {string} [options.sortBy] - Sort column
   * @param {string} [options.sortOrder] - Sort order (ASC/DESC)
   * @param {number} [options.page] - Page number
   * @param {number} [options.limit] - Items per page
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<{ data: any[], pagination: Object }>}
   */
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
      qb.andWhere("batch.supplierId = :supplierId", {
        supplierId: options.supplierId,
      });
    }
    if (options.status) {
      const statuses = Array.isArray(options.status)
        ? options.status
        : [options.status];
      const allowedStatuses = await this._getAllowedStatuses(qr);
      const invalidStatuses = statuses.filter(
        (s) => !allowedStatuses.includes(s),
      );
      if (invalidStatuses.length > 0) {
        logger.warn(
          `[Batch] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${allowedStatuses.join(", ")}`,
        );
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
        { search: `%${options.search}%` },
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

  /**
   * Create a new batch
   * @param {Object} data - Batch data
   * @param {number} data.meatId - Meat ID
   * @param {number} data.quantity - Initial quantity (kg)
   * @param {number} data.unitCost - Cost per kg
   * @param {string} data.expiryDate - Expiry date (YYYY-MM-DD)
   * @param {number} [data.supplierId] - Supplier ID
   * @param {string} [data.status] - Batch status (default: active)
   * @param {string} [data.note] - Note
   * @param {string} [data.batchCode] - Custom batch code (auto-generated if not provided)
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<any>}
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    const batchRepo = this._getRepo(qr, Batch);
    const meatRepo = this._getRepo(qr, Meat);
    const supplierRepo = this._getRepo(qr, Supplier);

    // ✅ Validate input using Zod schema
    const validated = validate(batchCreateSchema, data, "Batch creation");

    try {
      const {
        meatId,
        quantity,
        unitCost,
        expiryDate,
        supplierId,
        status,
        note,
        batchCode,
      } = validated;

      // ✅ Business validation: Check if meat exists and is active
      const meat = await meatRepo.findOne({
        where: { id: meatId, isActive: true },
      });
      if (!meat) {
        throw new NotFoundError(
          `Meat with ID ${meatId} not found or inactive`,
          "Meat",
        );
      }

      // ✅ Business validation: Check if supplier exists and is active (if provided)
      let supplier = null;
      if (supplierId) {
        supplier = await supplierRepo.findOne({
          where: { id: supplierId, isActive: true },
        });
        if (!supplier) {
          throw new NotFoundError(
            `Supplier with ID ${supplierId} not found or inactive`,
            "Supplier",
          );
        }
      }

      // ✅ Check allowed statuses from settings
      const allowedStatuses = await this._getAllowedStatuses(qr);
      if (status && !allowedStatuses.includes(status)) {
        throw new ValidationError(
          `Invalid batch status: ${status}. Allowed: ${allowedStatuses.join(", ")}`,
        );
      }

      // ✅ Generate or validate batch code
      let finalBatchCode = batchCode;
      if (!finalBatchCode) {
        const prefix = await this._getCompanyPrefix(qr);
        finalBatchCode = await this.generateBatchCode(batchRepo, prefix);
      } else {
        const existing = await batchRepo.findOne({
          where: { batchCode: finalBatchCode },
        });
        if (existing) {
          throw new ValidationError(
            `Batch code "${finalBatchCode}" already exists`,
          );
        }
      }

      // ✅ Parse expiry date (already validated by Zod, but double-check)
      const expiryDateObj = new Date(expiryDate);
      if (isNaN(expiryDateObj.getTime())) {
        throw new ValidationError("Invalid expiryDate format");
      }

      // ✅ Create batch entity
      const batch = batchRepo.create({
        batchCode: finalBatchCode,
        initialQuantity: quantity,
        remainingQuantity: quantity,
        unitCost: unitCost,
        expiryDate: expiryDateObj,
        receivedDate: new Date(),
        status: status || "active",
        note: note || null,
        meat: meat,
        supplier: supplier,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(batchRepo, batch, { queryRunner: qr });

      // ✅ Audit log
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        const auditLogger = require("../utils/auditLogger");
        await auditLogger.logCreate("Batch", saved.id, saved, user);
      }

      logger.debug(`Batch created: #${saved.id} - ${saved.batchCode}`);
      return saved;
    } catch (error) {
      logger.error("Failed to create batch:", {
        error: error.message,
        data,
        user,
      });
      throw error;
    }
  }

  /**
   * Update batch (generic fields only – not remainingQuantity or status)
   * @param {number} id - Batch ID
   * @param {Object} data - Fields to update
   * @param {string} [data.batchCode] - New batch code
   * @param {number} [data.unitCost] - New unit cost
   * @param {string} [data.expiryDate] - New expiry date
   * @param {string} [data.note] - New note
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<any>}
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    // ✅ Validate input
    const validated = validate(batchUpdateSchema, data, "Batch update");

    try {
      const existing = await batchRepo.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundError(`Batch with ID ${id} not found`, "Batch");
      }

      // ❌ Prevent direct updates to remainingQuantity and status
      if (data.remainingQuantity !== undefined) {
        throw new ValidationError(
          "Use updateRemainingQuantity to update remainingQuantity",
        );
      }
      if (data.status !== undefined && data.status !== existing.status) {
        throw new ValidationError("Use updateStatus to update batch status");
      }

      const oldData = { ...existing };

      // ✅ Use validated data
      const { batchCode, unitCost, expiryDate, note } = validated;

      // ✅ Check batchCode uniqueness if changed
      if (batchCode && batchCode !== existing.batchCode) {
        const duplicate = await batchRepo.findOne({
          where: { batchCode },
        });
        if (duplicate) {
          throw new ValidationError(`Batch code "${batchCode}" already exists`);
        }
        existing.batchCode = batchCode;
      }

      // ✅ Update unitCost
      if (unitCost !== undefined) {
        existing.unitCost = unitCost;
      }

      // ✅ Update expiryDate
      if (expiryDate) {
        const expiryDateObj = new Date(expiryDate);
        if (isNaN(expiryDateObj.getTime())) {
          throw new ValidationError("Invalid expiryDate format");
        }
        existing.expiryDate = expiryDateObj;
      }

      // ✅ Update note
      if (note !== undefined) {
        existing.note = note;
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(batchRepo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        const auditLogger = require("../utils/auditLogger");
        await auditLogger.logUpdate("Batch", id, oldData, saved, user);
      }

      logger.debug(`Batch updated: #${id}`);
      return saved;
    } catch (error) {
      logger.error("Failed to update batch:", {
        error: error.message,
        id,
        data,
        user,
      });
      throw error;
    }
  }

  /**
   * DEDICATED SETTER: Update remainingQuantity with optimistic locking
   * @param {number} id - Batch ID
   * @param {number} newQuantity - New remaining quantity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<any>}
   */
  async updateRemainingQuantity(id, newQuantity, user = "system", qr = null) {
    // ✅ Validate quantity
    const validated = validate(
      batchRemainingQuantitySchema,
      { newQuantity },
      "Batch remaining quantity",
    );
    const { newQuantity: validQuantity } = validated;

    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const existing = await batchRepo.findOne({
      where: { id },
      relations: ["meat", "supplier"],
    });

    if (!existing) {
      throw new NotFoundError(`Batch with ID ${id} not found`, "Batch");
    }

    const oldData = {
      remainingQuantity: existing.remainingQuantity,
      status: existing.status,
    };

    const currentVersion = existing.version;

    let newStatus = existing.status;
    if (validQuantity === 0 && existing.status !== "expired") {
      newStatus = "depleted";
    } else if (validQuantity > 0 && existing.status === "depleted") {
      newStatus = "active";
    }

    // Attempt update with optimistic locking
    const updateResult = await batchRepo
      .createQueryBuilder()
      .update(Batch)
      .set({
        remainingQuantity: validQuantity,
        status: newStatus,
        updatedAt: new Date(),
        version: () => "version + 1",
      })
      .where("id = :id AND version = :version", {
        id,
        version: currentVersion,
      })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConcurrencyError(
        `Batch #${id} was modified concurrently. Please retry.`,
      );
    }

    const saved = await batchRepo.findOne({
      where: { id },
      relations: ["meat", "supplier"],
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      const auditLogger = require("../utils/auditLogger");
      await auditLogger.logUpdate("Batch", id, oldData, saved, user);
    }

    logger.debug(
      `Batch #${id} remainingQuantity updated: ${oldData.remainingQuantity} → ${validQuantity} (version: ${saved.version})`,
    );

    return saved;
  }

  /**
   * DEDICATED SETTER: Update batch status with optimistic locking and transition validation
   * @param {number} id - Batch ID
   * @param {string} newStatus - New status
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<any>}
   */
  async updateStatus(id, newStatus, user = "system", qr = null) {
    // ✅ Validate status
    const validated = validate(
      batchStatusSchema,
      { status: newStatus },
      "Batch status",
    );
    const { status: validStatus } = validated;

    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const allowedStatuses = await this._getAllowedStatuses(qr);
    if (!allowedStatuses.includes(validStatus)) {
      throw new ValidationError(
        `Invalid batch status: ${validStatus}. Allowed: ${allowedStatuses.join(", ")}`,
        { newStatus, allowed: allowedStatuses },
      );
    }

    const existing = await batchRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Batch with ID ${id} not found`, "Batch");
    }

    if (existing.status === validStatus) {
      logger.debug(`Batch #${id} already has status ${validStatus}`);
      return existing;
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(validStatus)) {
      throw new ValidationError(
        `Cannot transition from "${existing.status}" to "${validStatus}". ` +
          `Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
        {
          currentStatus: existing.status,
          requestedStatus: validStatus,
          allowedTransitions,
        },
      );
    }

    const oldData = { status: existing.status };
    const currentVersion = existing.version;

    const updateResult = await batchRepo
      .createQueryBuilder()
      .update(Batch)
      .set({
        status: validStatus,
        updatedAt: new Date(),
        version: () => "version + 1",
      })
      .where("id = :id AND version = :version", {
        id,
        version: currentVersion,
      })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConcurrencyError(
        `Batch #${id} was modified concurrently. Please retry.`,
      );
    }

    const saved = await batchRepo.findOne({ where: { id } });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      const auditLogger = require("../utils/auditLogger");
      await auditLogger.logUpdate("Batch", id, oldData, saved, user);
    }

    logger.debug(
      `Batch #${id} status updated: ${oldData.status} → ${validStatus} (version: ${saved.version})`,
    );

    return saved;
  }

  // ============================================================
  // 🧹 SOFT DELETE & RESTORE
  // ============================================================

  /**
   * Soft delete a batch (set status to depleted)
   * @param {number} id - Batch ID
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<any>}
   */
  async delete(id, user = "system", qr = null) {
    const batch = await this.findById(id, false, qr);
    if (batch.remainingQuantity > 0) {
      throw new ValidationError(
        `Cannot soft delete batch #${id} because remainingQuantity is ${batch.remainingQuantity}. Use updateRemainingQuantity first.`,
      );
    }
    return this.updateStatus(id, "depleted", user, qr);
  }

  /**
   * Restore a soft-deleted batch
   * @param {number} id - Batch ID
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<any>}
   */
  async restore(id, user = "system", qr = null) {
    const batch = await this.findById(id, true, qr);
    if (batch.status !== "depleted" && batch.status !== "expired") {
      throw new ValidationError(
        `Batch #${id} is not soft-deleted (status: ${batch.status})`,
      );
    }
    if (batch.remainingQuantity <= 0) {
      throw new ValidationError(
        `Cannot restore batch #${id} because remainingQuantity is 0.`,
      );
    }
    return this.updateStatus(id, "active", user, qr);
  }

  /**
   * Permanently delete a batch (hard delete)
   * @param {number} id - Batch ID
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<void>}
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const batch = await batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundError(`Batch with ID ${id} not found`, "Batch");
    }

    await removeDb(batchRepo, batch, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      const auditLogger = require("../utils/auditLogger");
      await auditLogger.logCreate("Batch", id, batch, user);
    }

    logger.debug(`Batch #${id} permanently deleted`);
  }

  // ============================================================
  // 🧮 FIFO DEDUCTION METHODS
  // ============================================================

  /**
   * Deduct from a single batch with optimistic locking
   * @param {number} batchId - Batch ID
   * @param {number} weightToDeduct - Weight to deduct (kg)
   * @param {string} reason - Reason for deduction
   * @param {Object} metadata - Additional metadata
   * @param {number} [metadata.saleId] - Sale ID (if applicable)
   * @param {string} [metadata.notes] - Additional notes
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner - Transaction query runner
   * @returns {Promise<{ batch: any, deductedWeight: number }>}
   */
  async deductFromBatch(
    batchId,
    weightToDeduct,
    reason = "adjustment",
    metadata = {},
    user = "system",
    queryRunner = null,
  ) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const Batch = require("../entities/Batch");

    const movementRepo = this._getRepo(queryRunner, InventoryMovement);
    const batchRepo = this._getRepo(queryRunner, Batch);

    const batch = await batchRepo.findOne({
      where: { id: batchId },
      relations: ["meat"],
    });

    if (!batch) {
      throw new NotFoundError(`Batch #${batchId} not found`, "Batch");
    }

    if (batch.status !== "active") {
      throw new ValidationError(
        `Batch #${batchId} is not active (status: ${batch.status})`,
        { batchId, status: batch.status },
      );
    }

    if (new Date(batch.expiryDate) < new Date()) {
      throw new ValidationError(
        `Batch #${batchId} is expired (${batch.expiryDate})`,
        { batchId, expiryDate: batch.expiryDate },
      );
    }

    if (batch.remainingQuantity < weightToDeduct) {
      throw new ValidationError(
        `Insufficient remaining quantity in batch #${batchId}. ` +
          `Available: ${batch.remainingQuantity}, Requested: ${weightToDeduct}`,
        {
          batchId,
          available: batch.remainingQuantity,
          requested: weightToDeduct,
        },
      );
    }

    const oldRemaining = batch.remainingQuantity;
    const newRemaining = Number(oldRemaining) - Number(weightToDeduct);
    const currentVersion = batch.version;

    let newStatus = batch.status;
    if (newRemaining === 0 && batch.status !== "expired") {
      newStatus = "depleted";
    }

    logger.debug(
      `[Batch] Deducting ${weightToDeduct}kg from batch #${batchId}`,
      { oldRemaining, newRemaining, currentVersion, newStatus },
    );

    const updateResult = await batchRepo
      .createQueryBuilder()
      .update(Batch)
      .set({
        remainingQuantity: newRemaining,
        status: newStatus,
        updatedAt: new Date(),
        version: () => "version + 1",
      })
      .where("id = :id AND version = :version", {
        id: batchId,
        version: currentVersion,
      })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConcurrencyError(
        `Batch #${batchId} was modified concurrently. Please retry.`,
      );
    }

    const updatedBatch = await batchRepo.findOne({
      where: { id: batchId },
      relations: ["meat"],
    });

    if (!updatedBatch) {
      throw new NotFoundError(
        `Batch #${batchId} not found after update`,
        "Batch",
      );
    }

    const movement = movementRepo.create({
      movementType: reason,
      qtyChange: -weightToDeduct,
      notes: `Deducted from batch #${batchId}. ${metadata.notes || ""}`,
      meatId: updatedBatch.meatId,
      batchId: batchId,
      sale: metadata.saleId ? { id: metadata.saleId } : null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedMovement = await saveDb(movementRepo, movement, {
      queryRunner: queryRunner,
    });

    const auditEnabled = await this._isAuditEnabled(queryRunner);
    if (auditEnabled) {
      const auditLogger = require("../utils/auditLogger");
      await auditLogger.logCreate(
        "InventoryMovement",
        savedMovement.id,
        savedMovement,
        user,
      );
    }

    logger.info(
      `[Batch] Deducted ${weightToDeduct}kg from batch #${batchId} (${reason}). ` +
        `Remaining: ${updatedBatch.remainingQuantity}kg (version: ${updatedBatch.version})`,
    );

    return { batch: updatedBatch, deductedWeight: weightToDeduct };
  }

  /**
   * Add weight to a batch with optimistic locking
   * @param {number} batchId - Batch ID
   * @param {number} weightToAdd - Weight to add (kg)
   * @param {string} reason - Reason for addition
   * @param {Object} metadata - Additional metadata
   * @param {number} [metadata.saleId] - Sale ID (if applicable)
   * @param {string} [metadata.notes] - Additional notes
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner - Transaction query runner
   * @returns {Promise<{ batch: any, addedWeight: number }>}
   */
  async addToBatch(
    batchId,
    weightToAdd,
    reason = "refund",
    metadata = {},
    user = "system",
    queryRunner = null,
  ) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const InventoryMovement = require("../entities/InventoryMovement");
    const Batch = require("../entities/Batch");

    const movementRepo = this._getRepo(queryRunner, InventoryMovement);
    const batchRepo = this._getRepo(queryRunner, Batch);

    const batch = await batchRepo.findOne({
      where: { id: batchId },
      relations: ["meat"],
    });

    if (!batch) {
      throw new NotFoundError(`Batch #${batchId} not found`, "Batch");
    }

    if (batch.status === "expired") {
      throw new ValidationError(`Cannot add to expired batch #${batchId}`, {
        batchId,
        status: batch.status,
      });
    }

    const oldRemaining = batch.remainingQuantity;
    const newRemaining = Number(oldRemaining) + Number(weightToAdd);
    const currentVersion = batch.version;

    let newStatus = batch.status;
    if (batch.status === "depleted" && newRemaining > 0) {
      newStatus = "active";
    }

    const updateResult = await batchRepo
      .createQueryBuilder()
      .update(Batch)
      .set({
        remainingQuantity: newRemaining,
        status: newStatus,
        updatedAt: new Date(),
        version: () => "version + 1",
      })
      .where("id = :id AND version = :version", {
        id: batchId,
        version: currentVersion,
      })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConcurrencyError(
        `Batch #${batchId} was modified concurrently. Please retry.`,
      );
    }

    const updatedBatch = await batchRepo.findOne({
      where: { id: batchId },
      relations: ["meat"],
    });

    const movement = movementRepo.create({
      movementType: reason,
      qtyChange: weightToAdd,
      notes: `Added to batch #${batchId}. ${metadata.notes || ""}`,
      meatId: updatedBatch.meatId,
      batchId: batchId,
      sale: metadata.saleId ? { id: metadata.saleId } : null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedMovement = await saveDb(movementRepo, movement, {
      queryRunner: queryRunner,
    });

    const auditEnabled = await this._isAuditEnabled(queryRunner);
    if (auditEnabled) {
      const auditLogger = require("../utils/auditLogger");
      await auditLogger.logCreate(
        "InventoryMovement",
        savedMovement.id,
        savedMovement,
        user,
      );
    }

    logger.info(
      `[Batch] Added ${weightToAdd}kg to batch #${batchId} (${reason}). ` +
        `Remaining: ${updatedBatch.remainingQuantity}kg (version: ${updatedBatch.version})`,
    );

    return { batch: updatedBatch, addedWeight: weightToAdd };
  }

  /**
   * FIFO Deduction – finds oldest active batches and deducts sequentially
   * @param {number} meatId - Meat ID
   * @param {number} totalWeight - Total weight to deduct (kg)
   * @param {string} reason - Reason for deduction
   * @param {Object} metadata - Additional metadata
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner - Transaction query runner
   * @returns {Promise<Array<{ batch: any, deductedWeight: number }>>}
   */
  async fifoDeduct(
    meatId,
    totalWeight,
    reason = "sale",
    metadata = {},
    user = "system",
    queryRunner = null,
  ) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(queryRunner, Batch);

    let remaining = Number(totalWeight);
    const deductions = [];
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (remaining > 0.001 && retryCount < MAX_RETRIES) {
      // Get active batches for this meat
      const batches = await batchRepo
        .createQueryBuilder("batch")
        .where("batch.meatId = :meatId", { meatId })
        .andWhere("batch.status = 'active'")
        .andWhere("batch.remainingQuantity > 0")
        .andWhere("batch.expiryDate >= :today", { today: new Date() })
        .orderBy("batch.expiryDate", "ASC")
        .getMany();

      if (batches.length === 0) {
        if (deductions.length === 0) {
          throw new ValidationError(
            `No available active batches for meat ID ${meatId}`,
            { meatId },
          );
        }
        // No more stock, but we deducted some
        break;
      }

      let deductedThisRound = false;

      for (const batch of batches) {
        if (remaining <= 0.001) break;

        const freshBatch = await batchRepo.findOne({
          where: { id: batch.id },
        });

        if (!freshBatch || freshBatch.remainingQuantity <= 0) {
          continue;
        }

        const use = Math.min(Number(freshBatch.remainingQuantity), remaining);

        try {
          const result = await withRetry(
            async () => {
              return await this.deductFromBatch(
                freshBatch.id,
                use,
                reason,
                {
                  ...metadata,
                  notes: `FIFO deduction (remaining: ${remaining - use}kg)`,
                },
                user,
                queryRunner,
              );
            },
            {
              maxAttempts: 3,
              baseDelay: 100,
              operation: `fifoDeduct-batch-${freshBatch.id}`,
            },
          );

          deductions.push(result);
          remaining -= use;
          deductedThisRound = true;
        } catch (error) {
          if (error.name === "ConcurrencyError") {
            logger.warn(
              `[fifoDeduct] Concurrency conflict on batch #${freshBatch.id}, retrying round...`,
            );
            retryCount++;
            // Break inner loop to refresh batch list
            break;
          }
          throw error;
        }
      }

      // If we didn't deduct anything this round and there are still batches,
      // we might be stuck in a loop, so break
      if (!deductedThisRound) {
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          throw new ConcurrencyError(
            `FIFO deduction failed after ${MAX_RETRIES} retries due to concurrency conflicts`,
          );
        }
        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
      }
    }

    if (remaining > 0.001) {
      const deductedAmount = Number(totalWeight) - remaining;
      throw new ValidationError(
        `Insufficient stock for meat ID ${meatId}. Needed ${totalWeight}kg, ` +
          `only ${deductedAmount.toFixed(3)}kg available from active batches.`,
        { meatId, needed: totalWeight, available: deductedAmount },
      );
    }

    logger.info(
      `[Batch] FIFO deduction completed for meat #${meatId}: ${totalWeight}kg ` +
        `deducted from ${deductions.length} batch(es)`,
    );

    return deductions;
  }

  /**
   * Mark a batch as expired (used by cron job)
   * @param {number} batchId - Batch ID
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner - Transaction query runner
   * @returns {Promise<any>}
   */
  async markExpired(batchId, user = "system", queryRunner = null) {
    const batch = await this.findById(batchId, true, queryRunner);

    if (batch.status === "expired") {
      logger.warn(`[Batch] Batch #${batchId} already expired`);
      return batch;
    }

    if (new Date(batch.expiryDate) > new Date()) {
      throw new ValidationError(
        `Batch #${batchId} is not yet expired (expiry: ${batch.expiryDate})`,
      );
    }

    return this.updateStatus(batchId, "expired", user, queryRunner);
  }

  /**
   * Clean up expired batches (mark as expired)
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<{ count: number }>}
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
        logger.info(
          `[Batch] Batch #${batch.id} (${batch.batchCode}) marked as expired`,
        );
      } catch (error) {
        logger.error(
          `[Batch] Failed to mark batch #${batch.id} as expired:`,
          error,
        );
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
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<Object>}
   */
  async getStatistics(qr = null) {
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(qr, Batch);

    const threshold = await this._getLowStockThreshold(qr);

    const byStatus = await batchRepo
      .createQueryBuilder("batch")
      .select("batch.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("batch.status")
      .getRawMany();

    const totalRemainingResult = await batchRepo
      .createQueryBuilder("batch")
      .select("SUM(batch.remainingQuantity)", "total")
      .where("batch.status IN ('active', 'on_hold')")
      .getRawOne();
    const totalRemaining = parseFloat(totalRemainingResult.total) || 0;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSoon = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate <= :sevenDaysFromNow", { sevenDaysFromNow })
      .andWhere("batch.expiryDate >= :today", { today: new Date() })
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getCount();

    const expired = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.expiryDate < :today", { today: new Date() })
      .andWhere("batch.status IN ('active', 'on_hold')")
      .getCount();

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
      lowStockDetails: lowStockBatches.map((b) => ({
        id: b.id,
        batchCode: b.batchCode,
        meatName: b.meat?.name,
        remainingQuantity: b.remainingQuantity,
      })),
    };
  }

  /**
   * Get batch health summary
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<Object>}
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
      .where("batch.expiryDate <= :soon", {
        soon: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
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
      healthScore:
        total > 0
          ? Math.round(
              ((total - expired - expiringSoon - lowStock) / total) * 100,
            )
          : 100,
    };
  }

  // ============================================================
  // 🔒 PRIVATE HELPERS
  // ============================================================

  /**
   * Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(
        `[Batch] Failed to check audit enabled status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get allowed batch statuses from settings
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<string[]>}
   */
  async _getAllowedStatuses(qr = null) {
    try {
      return await system.getArray(
        "allowed_batch_statuses",
        SettingType.INVENTORY,
        ["active", "depleted", "expired", "on_hold"],
      );
    } catch (error) {
      logger.warn(
        `[Batch] Failed to get allowed statuses: ${error.message}, using defaults`,
      );
      return ["active", "depleted", "expired", "on_hold"];
    }
  }

  /**
   * Get low stock threshold from settings
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<number>}
   */
  async _getLowStockThreshold(qr = null) {
    try {
      return await system.lowStockThreshold();
    } catch (error) {
      logger.warn(
        `[Batch] Failed to get low stock threshold: ${error.message}, defaulting to 5`,
      );
      return 5;
    }
  }

  /**
   * Get company prefix from settings
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<string>}
   */
  async _getCompanyPrefix(qr = null) {
    try {
      const company = await system.companyName();
      return company.substring(0, 4).toUpperCase();
    } catch (error) {
      logger.warn(
        `[Batch] Failed to get company name: ${error.message}, defaulting to "BATCH"`,
      );
      return "BATCH";
    }
  }

  /**
   * Generate a unique batch code
   * @param {import("typeorm").Repository<any>} repo - Batch repository
   * @param {string} prefix - Prefix for the batch code
   * @returns {Promise<string>}
   */
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

  // ============================================================
  // 📤 BULK & IMPORT OPERATIONS
  // ============================================================

  /**
   * Bulk create batches
   * @param {Array<Object>} batchesArray - Array of batch data objects
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<{ created: any[], errors: Array<{ batch: any, error: string }> }>}
   */
  async bulkCreate(batchesArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of batchesArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (error) {
        results.errors.push({
          batch: data,
          error: error.message,
        });
      }
    }
    return results;
  }

  /**
   * Bulk update batches – intelligently routes to appropriate setters
   * @param {Array<{ id: number, updates: Object }>} updatesArray - Array of updates
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<{ updated: any[], errors: Array<{ id: number, error: string }> }>}
   */
  async bulkUpdate(updatesArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };

    for (const { id, updates } of updatesArray) {
      try {
        let saved;

        if (updates.remainingQuantity !== undefined) {
          const newQty = updates.remainingQuantity;
          const { remainingQuantity, ...rest } = updates;
          saved = await this.updateRemainingQuantity(id, newQty, user, qr);

          if (Object.keys(rest).length > 0) {
            const current = await this.findById(id, false, qr);
            const { status, ...otherFields } = rest;
            Object.assign(current, otherFields);
            saved = await this.update(id, otherFields, user, qr);
          }
        } else if (updates.status !== undefined) {
          saved = await this.updateStatus(id, updates.status, user, qr);
        } else {
          saved = await this.update(id, updates, user, qr);
        }

        results.updated.push(saved);
      } catch (error) {
        results.errors.push({ id, error: error.message });
      }
    }

    return results;
  }

  /**
   * Export batches to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters - Same filters as findAll
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<{ format: string, data: string | any[], filename: string }>}
   */
  async exportBatches(
    format = "json",
    filters = {},
    user = "system",
    qr = null,
  ) {
    try {
      const result = await this.findAll(
        { ...filters, limit: undefined, page: undefined },
        qr,
      );
      const batches = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Batch Code",
          "Meat",
          "Supplier",
          "Initial Quantity (kg)",
          "Remaining Quantity (kg)",
          "Unit Cost",
          "Expiry Date",
          "Received Date",
          "Status",
          "Note",
          "Created At",
          "Updated At",
          "Version",
        ];
        const rows = batches.map((b) => [
          b.id,
          b.batchCode,
          b.meat?.name ?? "",
          b.supplier?.name ?? "",
          b.initialQuantity,
          b.remainingQuantity,
          b.unitCost,
          b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "",
          b.receivedDate ? new Date(b.receivedDate).toLocaleDateString() : "",
          b.status,
          b.note ?? "",
          new Date(b.createdAt).toLocaleString(),
          b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "",
          b.version ?? 1,
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `batches_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: batches,
          filename: `batches_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        const auditLogger = require("../utils/auditLogger");
        await auditLogger.logCreate("Batch", format, filters, user);
      }

      logger.debug(`Exported ${batches.length} batches in ${format} format`);
      return exportData;
    } catch (error) {
      logger.error("Failed to export batches:", error);
      throw error;
    }
  }

  /**
   * Import batches from a CSV file
   * @param {string} filePath - Path to CSV file
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<{ imported: any[], errors: Array<{ row: any, error: string }> }>}
   */
  async importFromCSV(filePath, user = "system", qr = null) {
    const fs = require("fs").promises;
    const csv = require("csv-parse/sync");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { imported: [], errors: [] };

    for (const record of records) {
      try {
        const data = {
          meatId: parseInt(record.meatId, 10),
          supplierId: record.supplierId
            ? parseInt(record.supplierId, 10)
            : null,
          quantity: parseFloat(record.quantity || record.initialQuantity),
          unitCost: parseFloat(record.unitCost),
          expiryDate: record.expiryDate || null,
          status: record.status || "active",
          note: record.note || null,
          batchCode: record.batchCode || null,
        };

        if (!data.meatId || isNaN(data.meatId)) {
          throw new ValidationError("meatId is required and must be a number");
        }
        if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
          throw new ValidationError("quantity must be a positive number");
        }
        if (isNaN(data.unitCost) || data.unitCost < 0) {
          throw new ValidationError("unitCost must be a non-negative number");
        }
        if (!data.expiryDate) {
          throw new ValidationError("expiryDate is required");
        }

        const saved = await this.create(data, user, qr);
        results.imported.push(saved);
      } catch (error) {
        results.errors.push({
          row: record,
          error: error.message,
        });
      }
    }

    return results;
  }
}

// Singleton instance
const batchService = new BatchService();
module.exports = batchService;