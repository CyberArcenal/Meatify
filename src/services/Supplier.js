// src/services/Supplier.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");
const notificationLogService = require("./NotificationLog");

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
  // ✏️ WRITE OPERATIONS (CRUD)
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

    try {
      if (!data.name) throw new Error("name is required");

      const maxNameLength = await this._getMaxNameLength(qr);
      if (data.name.length > maxNameLength) {
        throw new Error(
          `Supplier name cannot exceed ${maxNameLength} characters`,
        );
      }

      if (data.email && !this._isValidEmail(data.email)) {
        throw new Error(`Invalid email format: "${data.email}"`);
      }

      if (data.phone && !this._isValidPhone(data.phone)) {
        throw new Error(`Invalid phone format: "${data.phone}"`);
      }

      if (data.contactInfo) {
        const maxContactLength = await this._getMaxContactInfoLength(qr);
        if (data.contactInfo.length > maxContactLength) {
          throw new Error(
            `Contact info cannot exceed ${maxContactLength} characters`,
          );
        }
      }

      if (data.notes) {
        const maxNotesLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxNotesLength) {
          throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
        }
      }

      const existing = await repo.findOne({ where: { name: data.name } });
      if (existing) {
        throw new Error(`Supplier with name "${data.name}" already exists`);
      }

      if (data.email) {
        const existingEmail = await repo.findOne({
          where: { email: data.email },
        });
        if (existingEmail) {
          throw new Error(`Email "${data.email}" already exists`);
        }
      }

      if (data.phone) {
        const existingPhone = await repo.findOne({
          where: { phone: data.phone },
        });
        if (existingPhone) {
          throw new Error(`Phone "${data.phone}" already exists`);
        }
      }

      const defaultActive = await this._getDefaultActiveStatus(qr);
      const isActive =
        data.isActive !== undefined ? data.isActive : defaultActive;

      const supplier = repo.create({
        name: data.name,
        contactInfo: data.contactInfo || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        isActive: isActive,
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

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Supplier with ID ${id} not found`);
      }

      const oldData = { ...existing };

      if (data.name) {
        const maxNameLength = await this._getMaxNameLength(qr);
        if (data.name.length > maxNameLength) {
          throw new Error(
            `Supplier name cannot exceed ${maxNameLength} characters`,
          );
        }
        const duplicate = await repo.findOne({ where: { name: data.name } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Supplier with name "${data.name}" already exists`);
        }
      }

      if (data.email && data.email !== existing.email) {
        if (!this._isValidEmail(data.email)) {
          throw new Error(`Invalid email format: "${data.email}"`);
        }
        const duplicate = await repo.findOne({ where: { email: data.email } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Email "${data.email}" already exists`);
        }
      }

      if (data.phone && data.phone !== existing.phone) {
        if (!this._isValidPhone(data.phone)) {
          throw new Error(`Invalid phone format: "${data.phone}"`);
        }
        const duplicate = await repo.findOne({ where: { phone: data.phone } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Phone "${data.phone}" already exists`);
        }
      }

      if (data.contactInfo) {
        const maxContactLength = await this._getMaxContactInfoLength(qr);
        if (data.contactInfo.length > maxContactLength) {
          throw new Error(
            `Contact info cannot exceed ${maxContactLength} characters`,
          );
        }
      }

      if (data.notes) {
        const maxNotesLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxNotesLength) {
          throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
        }
      }

      // Only allow isActive update through dedicated methods
      if (data.isActive !== undefined && data.isActive !== existing.isActive) {
        throw new Error(
          "Use activate() or deactivate() to update supplier status",
        );
      }

      Object.assign(existing, data);
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
  // 🔄 BUSINESS LOGIC METHODS (Moved from State Service)
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

    const supplier = await repo.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new Error(`Supplier with ID ${supplierId} not found`);
    }

    if (supplier.isActive) {
      logger.warn(`[Supplier] Supplier #${supplierId} is already active`);
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
        supplierId,
        oldData,
        updated,
        user,
      );
    }

    logger.info(
      `[Supplier] Supplier #${supplierId} activated (subscriber will handle side effects)`,
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

    const supplierRepo = this._getRepo(qr, Supplier);
    const meatRepo = this._getRepo(qr, Meat);
    const purchaseRepo = this._getRepo(qr, Purchase);
    const batchRepo = this._getRepo(qr, Batch);

    const supplier = await supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new Error(`Supplier with ID ${supplierId} not found`);
    }

    if (!supplier.isActive) {
      logger.warn(`[Supplier] Supplier #${supplierId} is already inactive`);
      return supplier;
    }

    // Check for pending purchases
    const pendingPurchases = await purchaseRepo.count({
      where: { supplier: { id: supplierId }, status: "pending" },
    });

    if (pendingPurchases > 0 && !options.allowWithPendingPurchases) {
      throw new Error(
        `Cannot deactivate supplier #${supplierId} because it has ${pendingPurchases} pending purchase(s). Complete or cancel them first, or use allowWithPendingPurchases option.`,
      );
    }

    // Check for meats in this supplier
    const meats = await meatRepo.find({
      where: { supplier: { id: supplierId }, isActive: true },
      relations: ["supplier"],
    });

    let meatsReassigned = 0;
    let reassignToSupplierId = options.reassignToSupplierId || null;

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
            `[Supplier] Reassigned meat #${meat.id} from supplier #${supplierId} to #${reassignToSupplierId}`,
          );
        }
        meatsReassigned = meats.length;

        logger.debug(
          `Reassigned ${meats.length} meat(s) from supplier "${supplier.name}" to "${targetSupplier.name}"`,
        );
      } else {
        // If no reassignment target, prevent deactivation
        throw new Error(
          `Cannot deactivate supplier #${supplierId} because it has ${meats.length} active meat(s). Provide a reassignToSupplierId or deactivate the meats first.`,
        );
      }
    }

    // Also handle batches from this supplier
    const batches = await batchRepo.find({
      where: { supplier: { id: supplierId }, status: "active" },
    });

    if (batches.length > 0) {
      logger.info(
        `[Supplier] Supplier #${supplierId} has ${batches.length} active batches. They will remain active but with a deactivated supplier.`,
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
        supplierId,
        oldData,
        updated,
        user,
      );
    }

    logger.info(
      `[Supplier] Supplier #${supplierId} deactivated (subscriber will handle side effects)`,
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

    const supplierRepo = this._getRepo(qr, Supplier);
    const meatRepo = this._getRepo(qr, Meat);
    const purchaseRepo = this._getRepo(qr, Purchase);
    const batchRepo = this._getRepo(qr, Batch);

    if (sourceSupplierId === targetSupplierId) {
      throw new Error("Cannot merge a supplier into itself");
    }

    const sourceSupplier = await supplierRepo.findOne({
      where: { id: sourceSupplierId },
    });
    if (!sourceSupplier) {
      throw new Error(`Source supplier with ID ${sourceSupplierId} not found`);
    }

    const targetSupplier = await supplierRepo.findOne({
      where: { id: targetSupplierId, isActive: true },
    });
    if (!targetSupplier) {
      throw new Error(
        `Target supplier with ID ${targetSupplierId} not found or inactive`,
      );
    }

    // Get all meats from source supplier
    const meats = await meatRepo.find({
      where: { supplier: { id: sourceSupplierId } },
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
          { supplierId: sourceSupplierId },
          { supplierId: targetSupplierId },
          user,
        );
      }
    }

    // Get all purchases from source supplier and reassign
    const purchases = await purchaseRepo.find({
      where: { supplier: { id: sourceSupplierId } },
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
          { supplierId: sourceSupplierId },
          { supplierId: targetSupplierId },
          user,
        );
      }
    }

    // Get all batches from source supplier and reassign
    const batches = await batchRepo.find({
      where: { supplier: { id: sourceSupplierId } },
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
          { supplierId: sourceSupplierId },
          { supplierId: targetSupplierId },
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
        sourceSupplierId,
        oldData,
        sourceSupplier,
        user,
      );
    }

    logger.info(
      `[Supplier] Merged supplier #${sourceSupplierId} into #${targetSupplierId}. ` +
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
    try {
      // 1. Validate supplier exists and is active
      const Supplier = require("../entities/Supplier");
      const supplierRepo = this._getRepo(qr, Supplier);

      const supplier = await supplierRepo.findOne({
        where: { id: supplierId, isActive: true },
      });

      if (!supplier) {
        throw new Error(`Supplier with ID ${supplierId} not found or inactive`);
      }

      // 2. Validate input
      if (!subject || subject.trim().length === 0) {
        throw new Error("Subject is required");
      }
      if (!message || message.trim().length === 0) {
        throw new Error("Message is required");
      }

      // 3. Validate channel
      const validChannels = ["email", "sms"];
      if (!validChannels.includes(channel)) {
        throw new Error(
          `Invalid channel. Must be one of: ${validChannels.join(", ")}`,
        );
      }

      // 4. Determine recipient based on channel
      let recipient = null;
      if (channel === "email") {
        recipient = supplier.email;
        if (!recipient) {
          throw new Error(
            `Supplier #${supplierId} has no email address configured`,
          );
        }
      } else if (channel === "sms") {
        recipient = supplier.phone;
        if (!recipient) {
          throw new Error(
            `Supplier #${supplierId} has no phone number configured`,
          );
        }
      }

      // 5. Create NotificationLog entry via service
      const logData = {
        to: recipient,
        subject: subject,
        payload: message,
        channel: channel,
      };

      const savedLog = await notificationLogService.create(logData, user, qr);

      // 6. Audit log (already handled inside notificationLogService.create)
      logger.debug(
        `[Supplier] Notification log #${savedLog.id} created for supplier #${supplierId} (${supplier.name}) via ${channel}`,
      );

      return {
        success: true,
        logId: savedLog.id,
        message: `Notification queued for supplier "${supplier.name}" via ${channel}`,
      };
    } catch (error) {
      logger.error(
        `[Supplier] Failed to notify supplier #${supplierId}:`,
        error,
      );
      throw error;
    }
  }
}

// Singleton instance
const supplierService = new SupplierService();
module.exports = supplierService;
