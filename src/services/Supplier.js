// src/services/Supplier.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");
const notificationLogService = require("./NotificationLog");
const { validate } = require("../validation");
const {
  supplierCreateSchema,
  supplierUpdateSchema,
  supplierMergeSchema,
} = require("../validation/schemas/supplier.schema");
const { z } = require("zod");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "name",
  "contactInfo",
  "email",
  "phone",
  "address",
  "isActive",
  "createdAt",
  "updatedAt",
]);

class SupplierService {
  constructor() {
    this.supplierRepository = null;
    this.meatRepository = null;
    this.purchaseRepository = null;
    this.batchRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Supplier = require("../entities/Supplier");
    const Meat = require("../entities/Meat");
    const Purchase = require("../entities/Purchase");
    const Batch = require("../entities/Batch");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.purchaseRepository = AppDataSource.getRepository(Purchase);
    this.batchRepository = AppDataSource.getRepository(Batch);
    logger.debug("SupplierService initialized");
  }

  async getRepositories() {
    if (!this.supplierRepository) {
      await this.initialize();
    }
    return {
      supplier: this.supplierRepository,
      meat: this.meatRepository,
      purchase: this.purchaseRepository,
      batch: this.batchRepository,
    };
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    const qrType =
      qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    logger.debug(
      `[Supplier._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Supplier._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(
        `[Supplier] Failed to check audit enabled status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get default active status from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _getDefaultActiveStatus(qr = null) {
    try {
      return await system.getBool(
        "default_supplier_active",
        SettingType.INVENTORY,
        true,
      );
    } catch (error) {
      logger.warn(
        `[Supplier] Failed to get default active status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get max name length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNameLength(qr = null) {
    try {
      return await system.getInt(
        "max_supplier_name_length",
        SettingType.INVENTORY,
        100,
      );
    } catch (error) {
      logger.warn(
        `[Supplier] Failed to get max name length: ${error.message}, defaulting to 100`,
      );
      return 100;
    }
  }

  /**
   * Get max contact info length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxContactInfoLength(qr = null) {
    try {
      return await system.getInt(
        "max_supplier_contact_length",
        SettingType.INVENTORY,
        255,
      );
    } catch (error) {
      logger.warn(
        `[Supplier] Failed to get max contact info length: ${error.message}, defaulting to 255`,
      );
      return 255;
    }
  }

  /**
   * Get max notes length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNotesLength(qr = null) {
    try {
      return await system.getInt(
        "max_supplier_notes_length",
        SettingType.INVENTORY,
        500,
      );
    } catch (error) {
      logger.warn(
        `[Supplier] Failed to get max notes length: ${error.message}, defaulting to 500`,
      );
      return 500;
    }
  }

  /**
   * Validate email format
   * @param {string} email
   * @returns {boolean}
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   * @param {string} phone
   * @returns {boolean}
   */
  _isValidPhone(phone) {
    const phoneRegex = /^[\d\+\-\(\)\s]+$/;
    return phoneRegex.test(phone);
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  /**
   * Find supplier by ID
   * @param {number} id
   * @param {boolean} includeInactive
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeInactive = false, qr = null) {
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    const queryBuilder = repo
      .createQueryBuilder("supplier")
      .where("supplier.id = :id", { id });

    if (!includeInactive) {
      queryBuilder.andWhere("supplier.isActive = true");
    }

    const supplier = await queryBuilder.getOne();
    if (!supplier) {
      throw new Error(`Supplier with ID ${id} not found`);
    }
    await logger.debug("Supplier", id, "system");
    return supplier;
  }

  /**
   * Find all suppliers with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    const qb = repo.createQueryBuilder("supplier");

    if (options.isActive !== undefined) {
      qb.andWhere("supplier.isActive = :isActive", {
        isActive: options.isActive,
      });
    }
    if (options.search) {
      qb.andWhere(
        "(supplier.name LIKE :search OR supplier.contactInfo LIKE :search OR supplier.email LIKE :search OR supplier.phone LIKE :search OR supplier.address LIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    let sortBy = options.sortBy || "name";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(
        `[Supplier] Invalid sortBy: ${sortBy}, falling back to name`,
      );
      sortBy = "name";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`supplier.${sortBy}`, sortOrder);

    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("Supplier", null, "system");
    return result;
  }

  /**
   * Get supplier statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Supplier = require("../entities/Supplier");
    const Meat = require("../entities/Meat");
    const Purchase = require("../entities/Purchase");
    const Batch = require("../entities/Batch");

    const supplierRepo = this._getRepo(qr, Supplier);
    const meatRepo = this._getRepo(qr, Meat);
    const purchaseRepo = this._getRepo(qr, Purchase);
    const batchRepo = this._getRepo(qr, Batch);

    const totalActive = await supplierRepo.count({ where: { isActive: true } });
    const totalInactive = await supplierRepo.count({
      where: { isActive: false },
    });

    const suppliersWithMeats = await supplierRepo
      .createQueryBuilder("supplier")
      .leftJoin("supplier.meats", "meat")
      .select("supplier.id", "id")
      .addSelect("supplier.name", "name")
      .addSelect("COUNT(meat.id)", "meatCount")
      .where("supplier.isActive = true")
      .groupBy("supplier.id")
      .orderBy("meatCount", "DESC")
      .getRawMany();

    const supplierPurchases = await purchaseRepo
      .createQueryBuilder("purchase")
      .leftJoin("purchase.supplier", "supplier")
      .select("supplier.id", "supplierId")
      .addSelect("supplier.name", "supplierName")
      .addSelect("COUNT(purchase.id)", "purchaseCount")
      .addSelect("SUM(purchase.totalAmount)", "totalSpent")
      .where("purchase.status = 'completed'")
      .andWhere("supplier.isActive = true")
      .groupBy("supplier.id")
      .orderBy("totalSpent", "DESC")
      .getRawMany();

    const supplierBatches = await batchRepo
      .createQueryBuilder("batch")
      .leftJoin("batch.supplier", "supplier")
      .select("supplier.id", "supplierId")
      .addSelect("supplier.name", "supplierName")
      .addSelect("COUNT(batch.id)", "batchCount")
      .addSelect("SUM(batch.remainingQuantity)", "totalRemaining")
      .where("batch.status = 'active'")
      .andWhere("supplier.isActive = true")
      .groupBy("supplier.id")
      .getRawMany();

    const defaultActive = await this._getDefaultActiveStatus(qr);
    const maxNameLength = await this._getMaxNameLength(qr);

    return {
      totalActive,
      totalInactive,
      suppliersWithMeats,
      topSuppliersBySpend: supplierPurchases.slice(0, 5),
      supplierBatches,
      defaultActive,
      maxNameLength,
    };
  }

  /**
   * Export suppliers to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportSuppliers(
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
      const suppliers = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Name",
          "Contact Info",
          "Email",
          "Phone",
          "Address",
          "Notes",
          "Active",
          "Created At",
          "Updated At",
        ];
        const rows = suppliers.map((s) => [
          s.id,
          s.name,
          s.contactInfo ?? "",
          s.email ?? "",
          s.phone ?? "",
          s.address ?? "",
          s.notes ?? "",
          s.isActive ? "Yes" : "No",
          new Date(s.createdAt).toLocaleString(),
          s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `suppliers_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: suppliers,
          filename: `suppliers_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Supplier", format, filters, user);
      }

      logger.debug(
        `Exported ${suppliers.length} suppliers in ${format} format`,
      );
      return exportData;
    } catch (error) {
      console.error("Failed to export suppliers:", error);
      throw error;
    }
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (CRUD) - WITH VALIDATION
  // ============================================================

  /**
   * Create a new supplier
   * @param {Object} data - { name, contactInfo?, email?, phone?, address?, notes?, isActive? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    // ✅ Validate input
    const validated = validate(supplierCreateSchema, data, "Supplier creation");

    try {
      const { name, contactInfo, email, phone, address, notes, isActive } =
        validated;

      // ✅ Check name uniqueness
      const existing = await repo.findOne({ where: { name } });
      if (existing) {
        throw new Error(`Supplier with name "${name}" already exists`);
      }

      // ✅ Check email uniqueness if provided
      if (email) {
        const existingEmail = await repo.findOne({ where: { email } });
        if (existingEmail) {
          throw new Error(`Email "${email}" already exists`);
        }
      }

      // ✅ Check phone uniqueness if provided
      if (phone) {
        const existingPhone = await repo.findOne({ where: { phone } });
        if (existingPhone) {
          throw new Error(`Phone "${phone}" already exists`);
        }
      }

      // ✅ Use system setting for default active status
      const defaultActive = await this._getDefaultActiveStatus(qr);
      const finalIsActive = isActive !== undefined ? isActive : defaultActive;

      const supplier = repo.create({
        name,
        contactInfo: contactInfo || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        isActive: finalIsActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(repo, supplier, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Supplier", saved.id, saved, user);
      }

      logger.debug(`Supplier created: #${saved.id} - ${saved.name}`);
      return saved;
    } catch (error) {
      console.error("Failed to create supplier:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing supplier
   * @param {number} id
   * @param {Object} data - Fields to update
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    // ✅ Validate input
    const validated = validate(supplierUpdateSchema, data, "Supplier update");

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Supplier with ID ${id} not found`);
      }

      const oldData = { ...existing };

      // Use validated data
      const { name, contactInfo, email, phone, address, notes, isActive } =
        validated;

      // ✅ Update name with uniqueness check
      if (name && name !== existing.name) {
        const duplicate = await repo.findOne({ where: { name } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Supplier with name "${name}" already exists`);
        }
        existing.name = name;
      }

      // ✅ Update email with uniqueness check
      if (email && email !== existing.email) {
        if (!this._isValidEmail(email)) {
          throw new Error(`Invalid email format: "${email}"`);
        }
        const duplicate = await repo.findOne({ where: { email } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Email "${email}" already exists`);
        }
        existing.email = email;
      }

      // ✅ Update phone with uniqueness check
      if (phone && phone !== existing.phone) {
        if (!this._isValidPhone(phone)) {
          throw new Error(`Invalid phone format: "${phone}"`);
        }
        const duplicate = await repo.findOne({ where: { phone } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Phone "${phone}" already exists`);
        }
        existing.phone = phone;
      }

      // ✅ Update contactInfo
      if (contactInfo !== undefined) {
        existing.contactInfo = contactInfo;
      }

      // ✅ Update address
      if (address !== undefined) {
        existing.address = address;
      }

      // ✅ Update notes
      if (notes !== undefined) {
        existing.notes = notes;
      }

      // ❌ Prevent direct isActive updates – use activate/deactivate
      if (isActive !== undefined && isActive !== existing.isActive) {
        throw new Error(
          "Use activate() or deactivate() to update supplier status",
        );
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Supplier", id, oldData, saved, user);
      }

      logger.debug(`Supplier updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update supplier:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a supplier (set isActive = false)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    return this.deactivate(id, {}, user, qr);
  }

  /**
   * Restore a soft-deleted supplier (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    return this.activate(id, user, qr);
  }

  /**
   * Permanently delete a supplier (hard delete) – only if no meats or purchases linked
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const Meat = require("../entities/Meat");
    const Purchase = require("../entities/Purchase");
    const Batch = require("../entities/Batch");

    const supplierRepo = this._getRepo(qr, Supplier);
    const meatRepo = this._getRepo(qr, Meat);
    const purchaseRepo = this._getRepo(qr, Purchase);
    const batchRepo = this._getRepo(qr, Batch);

    const supplier = await supplierRepo.findOne({ where: { id } });
    if (!supplier) {
      throw new Error(`Supplier with ID ${id} not found`);
    }

    const meatCount = await meatRepo.count({
      where: { supplier: { id } },
    });
    if (meatCount > 0) {
      throw new Error(
        `Cannot delete supplier #${id} because it is used by ${meatCount} meat(s). Reassign them first.`,
      );
    }

    const purchaseCount = await purchaseRepo.count({
      where: { supplier: { id } },
    });
    if (purchaseCount > 0) {
      throw new Error(
        `Cannot delete supplier #${id} because it has ${purchaseCount} purchase(s).`,
      );
    }

    const batchCount = await batchRepo.count({
      where: { supplier: { id } },
    });
    if (batchCount > 0) {
      throw new Error(
        `Cannot delete supplier #${id} because it has ${batchCount} batch(es).`,
      );
    }

    await removeDb(supplierRepo, supplier, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("Supplier", id, supplier, user);
    }

    logger.debug(`Supplier #${id} permanently deleted`);
  }

  // ============================================================
  // 🔄 BUSINESS LOGIC METHODS (Status Transitions)
  // ============================================================

  /**
   * Activate a supplier (set isActive = true)
   * @param {number} supplierId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async activate(supplierId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    // ✅ Validate supplierId
    const validated = validate(
      z.object({ supplierId: z.number().int().positive() }),
      { supplierId },
      "Activate supplier",
    );

    const supplier = await repo.findOne({
      where: { id: validated.supplierId },
    });
    if (!supplier) {
      throw new Error(`Supplier with ID ${validated.supplierId} not found`);
    }

    if (supplier.isActive) {
      logger.warn(
        `[Supplier] Supplier #${validated.supplierId} is already active`,
      );
      return supplier;
    }

    const oldData = { isActive: supplier.isActive };
    supplier.isActive = true;
    supplier.updatedAt = new Date();

    const updated = await updateDb(repo, supplier, {
      queryRunner: qr,
      skipSignal: false,
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Supplier",
        validated.supplierId,
        oldData,
        updated,
        user,
      );
    }

    logger.info(
      `[Supplier] Supplier #${validated.supplierId} activated (subscriber will handle side effects)`,
    );
    return updated;
  }

  /**
   * Deactivate a supplier (set isActive = false) - with optional reassignment
   * @param {number} supplierId
   * @param {Object} options
   * @param {number} [options.reassignToSupplierId] - Optional supplier to reassign meats to
   * @param {boolean} [options.allowWithPendingPurchases=false] - Allow deactivation even with pending purchases
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async deactivate(supplierId, options = {}, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const Meat = require("../entities/Meat");
    const Purchase = require("../entities/Purchase");
    const Batch = require("../entities/Batch");

    // ✅ Validate supplierId
    const validated = validate(
      z.object({
        supplierId: z.number().int().positive(),
        reassignToSupplierId: z.number().int().positive().optional(),
        allowWithPendingPurchases: z.boolean().optional(),
      }),
      { supplierId, ...options },
      "Deactivate supplier",
    );

    const supplierRepo = this._getRepo(qr, Supplier);
    const meatRepo = this._getRepo(qr, Meat);
    const purchaseRepo = this._getRepo(qr, Purchase);
    const batchRepo = this._getRepo(qr, Batch);

    const supplier = await supplierRepo.findOne({
      where: { id: validated.supplierId },
    });
    if (!supplier) {
      throw new Error(`Supplier with ID ${validated.supplierId} not found`);
    }

    if (!supplier.isActive) {
      logger.warn(
        `[Supplier] Supplier #${validated.supplierId} is already inactive`,
      );
      return supplier;
    }

    // Check for pending purchases
    const pendingPurchases = await purchaseRepo.count({
      where: { supplier: { id: validated.supplierId }, status: "pending" },
    });

    if (pendingPurchases > 0 && !validated.allowWithPendingPurchases) {
      throw new Error(
        `Cannot deactivate supplier #${validated.supplierId} because it has ${pendingPurchases} pending purchase(s). Complete or cancel them first, or use allowWithPendingPurchases option.`,
      );
    }

    // Check for meats in this supplier
    const meats = await meatRepo.find({
      where: { supplier: { id: validated.supplierId }, isActive: true },
      relations: ["supplier"],
    });

    let meatsReassigned = 0;
    let reassignToSupplierId = validated.reassignToSupplierId || null;

    // Handle reassignment if there are meats
    if (meats.length > 0) {
      if (reassignToSupplierId) {
        const targetSupplier = await supplierRepo.findOne({
          where: { id: reassignToSupplierId, isActive: true },
        });
        if (!targetSupplier) {
          throw new Error(
            `Target supplier with ID ${reassignToSupplierId} not found or inactive`,
          );
        }

        // Reassign all meats to target supplier
        for (const meat of meats) {
          const oldSupplierId = meat.supplier?.id;
          meat.supplier = targetSupplier;
          meat.updatedAt = new Date();
          await updateDb(meatRepo, meat, {
            queryRunner: qr,
            skipSignal: false,
          });

          const auditEnabled = await this._isAuditEnabled(qr);
          if (auditEnabled) {
            await auditLogger.logUpdate(
              "Meat",
              meat.id,
              { supplierId: oldSupplierId },
              { supplierId: reassignToSupplierId },
              user,
            );
          }

          logger.info(
            `[Supplier] Reassigned meat #${meat.id} from supplier #${validated.supplierId} to #${reassignToSupplierId}`,
          );
        }
        meatsReassigned = meats.length;

        logger.debug(
          `Reassigned ${meats.length} meat(s) from supplier "${supplier.name}" to "${targetSupplier.name}"`,
        );
      } else {
        // If no reassignment target, prevent deactivation
        throw new Error(
          `Cannot deactivate supplier #${validated.supplierId} because it has ${meats.length} active meat(s). Provide a reassignToSupplierId or deactivate the meats first.`,
        );
      }
    }

    // Also handle batches from this supplier
    const batches = await batchRepo.find({
      where: { supplier: { id: validated.supplierId }, status: "active" },
    });

    if (batches.length > 0) {
      logger.info(
        `[Supplier] Supplier #${validated.supplierId} has ${batches.length} active batches. They will remain active but with a deactivated supplier.`,
      );
    }

    // Deactivate the supplier
    const oldData = { isActive: supplier.isActive };
    supplier.isActive = false;
    supplier.updatedAt = new Date();

    const updated = await updateDb(supplierRepo, supplier, {
      queryRunner: qr,
      skipSignal: false,
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Supplier",
        validated.supplierId,
        oldData,
        updated,
        user,
      );
    }

    logger.info(
      `[Supplier] Supplier #${validated.supplierId} deactivated (subscriber will handle side effects)`,
    );

    // Return metadata for subscriber side effects
    return {
      supplier: updated,
      meatsReassigned,
      reassignToSupplierId,
      pendingPurchases,
    };
  }

  /**
   * Merge a source supplier into a target supplier
   * @param {number} sourceSupplierId - Supplier to merge from (will be deactivated)
   * @param {number} targetSupplierId - Supplier to merge into (must be active)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async mergeSuppliers(
    sourceSupplierId,
    targetSupplierId,
    user = "system",
    qr = null,
  ) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const Meat = require("../entities/Meat");
    const Purchase = require("../entities/Purchase");
    const Batch = require("../entities/Batch");

    // ✅ Validate input
    const validated = validate(
      supplierMergeSchema,
      { sourceSupplierId, targetSupplierId },
      "Supplier merge",
    );

    const supplierRepo = this._getRepo(qr, Supplier);
    const meatRepo = this._getRepo(qr, Meat);
    const purchaseRepo = this._getRepo(qr, Purchase);
    const batchRepo = this._getRepo(qr, Batch);

    const { sourceSupplierId: validSourceId, targetSupplierId: validTargetId } =
      validated;

    if (validSourceId === validTargetId) {
      throw new Error("Cannot merge a supplier into itself");
    }

    const sourceSupplier = await supplierRepo.findOne({
      where: { id: validSourceId },
    });
    if (!sourceSupplier) {
      throw new Error(`Source supplier with ID ${validSourceId} not found`);
    }

    const targetSupplier = await supplierRepo.findOne({
      where: { id: validTargetId, isActive: true },
    });
    if (!targetSupplier) {
      throw new Error(
        `Target supplier with ID ${validTargetId} not found or inactive`,
      );
    }

    // Get all meats from source supplier
    const meats = await meatRepo.find({
      where: { supplier: { id: validSourceId } },
    });

    // Reassign meats to target supplier
    for (const meat of meats) {
      meat.supplier = targetSupplier;
      meat.updatedAt = new Date();
      await updateDb(meatRepo, meat, { queryRunner: qr, skipSignal: false });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate(
          "Meat",
          meat.id,
          { supplierId: validSourceId },
          { supplierId: validTargetId },
          user,
        );
      }
    }

    // Get all purchases from source supplier and reassign
    const purchases = await purchaseRepo.find({
      where: { supplier: { id: validSourceId } },
    });

    for (const purchase of purchases) {
      purchase.supplier = targetSupplier;
      purchase.updatedAt = new Date();
      await updateDb(purchaseRepo, purchase, {
        queryRunner: qr,
        skipSignal: false,
      });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate(
          "Purchase",
          purchase.id,
          { supplierId: validSourceId },
          { supplierId: validTargetId },
          user,
        );
      }
    }

    // Get all batches from source supplier and reassign
    const batches = await batchRepo.find({
      where: { supplier: { id: validSourceId } },
    });

    for (const batch of batches) {
      batch.supplier = targetSupplier;
      batch.updatedAt = new Date();
      await updateDb(batchRepo, batch, { queryRunner: qr, skipSignal: false });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate(
          "Batch",
          batch.id,
          { supplierId: validSourceId },
          { supplierId: validTargetId },
          user,
        );
      }
    }

    // Deactivate source supplier
    const oldData = { isActive: sourceSupplier.isActive };
    sourceSupplier.isActive = false;
    sourceSupplier.updatedAt = new Date();
    await updateDb(supplierRepo, sourceSupplier, {
      queryRunner: qr,
      skipSignal: false,
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Supplier",
        validSourceId,
        oldData,
        sourceSupplier,
        user,
      );
    }

    logger.info(
      `[Supplier] Merged supplier #${validSourceId} into #${validTargetId}. ` +
        `${meats.length} meats, ${purchases.length} purchases, ${batches.length} batches reassigned.`,
    );

    // Return metadata for subscriber side effects
    return {
      sourceSupplier,
      targetSupplier,
      meatsReassigned: meats.length,
      purchasesReassigned: purchases.length,
      batchesReassigned: batches.length,
    };
  }

  /**
   * Bulk deactivate suppliers with optional reassignment
   * @param {Array<number>} supplierIds
   * @param {Object} options
   * @param {number} [options.reassignToSupplierId]
   * @param {boolean} [options.allowWithPendingPurchases=false]
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkDeactivateSuppliers(
    supplierIds,
    options = {},
    user = "system",
    qr = null,
  ) {
    // ✅ Validate array
    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
      throw new Error("supplierIds must be a non-empty array");
    }

    const results = { deactivated: [], errors: [] };

    for (const supplierId of supplierIds) {
      try {
        const result = await this.deactivate(supplierId, options, user, qr);
        results.deactivated.push(result);
      } catch (err) {
        results.errors.push({ supplierId, error: err.message });
      }
    }

    logger.info(
      `[Supplier] Bulk deactivate: ${results.deactivated.length} succeeded, ${results.errors.length} failed`,
    );
    return results;
  }

  // ============================================================
  // 📤 BULK & IMPORT OPERATIONS
  // ============================================================

  /**
   * Bulk create suppliers
   * @param {Array<Object>} suppliersArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(suppliersArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of suppliersArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ supplier: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update suppliers
   * @param {Array<{ id: number, updates: Object }>} updatesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkUpdate(updatesArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        const saved = await this.update(id, updates, user, qr);
        results.updated.push(saved);
      } catch (err) {
        results.errors.push({ id, updates, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import suppliers from CSV file
   * @param {string} filePath
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
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
          name: record.name,
          contactInfo: record.contactInfo || null,
          email: record.email || null,
          phone: record.phone || null,
          address: record.address || null,
          notes: record.notes || null,
          isActive: record.isActive !== "false",
        };
        if (!data.name) {
          throw new Error("name is required");
        }
        const saved = await this.create(data, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }

  // ============================================================
  // 🧹 CLEANUP & HELPERS
  // ============================================================

  /**
   * Get supplier health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const Supplier = require("../entities/Supplier");
    const supplierRepo = this._getRepo(qr, Supplier);

    const totalActive = await supplierRepo.count({ where: { isActive: true } });
    const totalInactive = await supplierRepo.count({
      where: { isActive: false },
    });

    const defaultActive = await this._getDefaultActiveStatus(qr);

    const noEmail = await supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.email IS NULL")
      .andWhere("supplier.isActive = true")
      .getCount();

    const noPhone = await supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.phone IS NULL")
      .andWhere("supplier.isActive = true")
      .getCount();

    const noAddress = await supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.address IS NULL")
      .andWhere("supplier.isActive = true")
      .getCount();

    const healthScore =
      totalActive > 0
        ? Math.round(
            ((totalActive - noEmail - noPhone - noAddress) / totalActive) * 100,
          )
        : 100;

    return {
      totalActive,
      totalInactive,
      noEmail,
      noPhone,
      noAddress,
      defaultActive,
      healthScore,
    };
  }

  /**
   * Get supplier by email
   * @param {string} email
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findByEmail(email, qr = null) {
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    const supplier = await repo.findOne({
      where: { email, isActive: true },
    });

    return supplier;
  }

  /**
   * Get supplier by phone
   * @param {string} phone
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findByPhone(phone, qr = null) {
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    const supplier = await repo.findOne({
      where: { phone, isActive: true },
    });

    return supplier;
  }

  /**
   * Get top suppliers by purchase amount
   * @param {number} limit
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getTopSuppliers(limit = 10, qr = null) {
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    const topSuppliers = await purchaseRepo
      .createQueryBuilder("purchase")
      .leftJoin("purchase.supplier", "supplier")
      .select("supplier.id", "supplierId")
      .addSelect("supplier.name", "supplierName")
      .addSelect("COUNT(purchase.id)", "purchaseCount")
      .addSelect("SUM(purchase.totalAmount)", "totalSpent")
      .where("purchase.status = 'completed'")
      .andWhere("supplier.isActive = true")
      .groupBy("supplier.id")
      .orderBy("totalSpent", "DESC")
      .limit(limit)
      .getRawMany();

    return topSuppliers;
  }

  // ============================================================
  // 📨 NOTIFY SUPPLIER (using NotificationLogService)
  // ============================================================

  /**
   * Send a notification to a supplier via email or SMS.
   * Uses NotificationLogService to create a queued log entry.
   *
   * @param {number} supplierId - Supplier ID
   * @param {string} subject - Notification subject
   * @param {string} message - Notification message (plain text or HTML)
   * @param {string} channel - 'email' or 'sms' (default: 'email')
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Transaction query runner
   * @returns {Promise<{ success: boolean, logId?: number, message: string }>}
   */
  async notifySupplier(
    supplierId,
    subject,
    message,
    channel = "email",
    user = "system",
    qr = null,
  ) {
    // ✅ Validate input
    const validated = validate(
      z.object({
        supplierId: z.number().int().positive(),
        subject: z.string().min(1, "Subject is required").max(255),
        message: z.string().min(1, "Message is required").max(5000),
        channel: z.enum(["email", "sms"]).default("email"),
      }),
      { supplierId, subject, message, channel },
      "Notify supplier",
    );

    try {
      // 1. Validate supplier exists and is active
      const Supplier = require("../entities/Supplier");
      const supplierRepo = this._getRepo(qr, Supplier);

      const supplier = await supplierRepo.findOne({
        where: { id: validated.supplierId, isActive: true },
      });

      if (!supplier) {
        throw new Error(
          `Supplier with ID ${validated.supplierId} not found or inactive`,
        );
      }

      // 2. Determine recipient based on channel
      let recipient = null;
      if (validated.channel === "email") {
        recipient = supplier.email;
        if (!recipient) {
          throw new Error(
            `Supplier #${validated.supplierId} has no email address configured`,
          );
        }
      } else if (validated.channel === "sms") {
        recipient = supplier.phone;
        if (!recipient) {
          throw new Error(
            `Supplier #${validated.supplierId} has no phone number configured`,
          );
        }
      }

      // 3. Create NotificationLog entry via service
      const logData = {
        to: recipient,
        subject: validated.subject,
        payload: validated.message,
        channel: validated.channel,
      };

      const savedLog = await notificationLogService.create(logData, user, qr);

      // 4. Audit log (already handled inside notificationLogService.create)
      logger.debug(
        `[Supplier] Notification log #${savedLog.id} created for supplier #${validated.supplierId} (${supplier.name}) via ${validated.channel}`,
      );

      return {
        success: true,
        logId: savedLog.id,
        message: `Notification queued for supplier "${supplier.name}" via ${validated.channel}`,
      };
    } catch (error) {
      logger.error(
        `[Supplier] Failed to notify supplier #${validated.supplierId}:`,
        error,
      );
      throw error;
    }
  }
}

// Singleton instance
const supplierService = new SupplierService();
module.exports = supplierService;
