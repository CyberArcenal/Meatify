// src/services/Supplier.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system"); // ✅ ADDED - for flexible settings
const { SettingType } = require("../entities/systemSettings"); // ✅ ADDED - for setting types

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
   * ✅ NEW: Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[Supplier] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get default active status from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _getDefaultActiveStatus(qr = null) {
    try {
      return await system.getBool("default_supplier_active", SettingType.INVENTORY, true);
    } catch (error) {
      logger.warn(`[Supplier] Failed to get default active status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get max name length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNameLength(qr = null) {
    try {
      return await system.getInt("max_supplier_name_length", SettingType.INVENTORY, 100);
    } catch (error) {
      logger.warn(`[Supplier] Failed to get max name length: ${error.message}, defaulting to 100`);
      return 100;
    }
  }

  /**
   * ✅ NEW: Get max contact info length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxContactInfoLength(qr = null) {
    try {
      return await system.getInt("max_supplier_contact_length", SettingType.INVENTORY, 255);
    } catch (error) {
      logger.warn(`[Supplier] Failed to get max contact info length: ${error.message}, defaulting to 255`);
      return 255;
    }
  }

  /**
   * ✅ NEW: Get max notes length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNotesLength(qr = null) {
    try {
      return await system.getInt("max_supplier_notes_length", SettingType.INVENTORY, 500);
    } catch (error) {
      logger.warn(`[Supplier] Failed to get max notes length: ${error.message}, defaulting to 500`);
      return 500;
    }
  }

  /**
   * ✅ NEW: Validate email format
   * @param {string} email
   * @returns {boolean}
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * ✅ NEW: Validate phone format
   * @param {string} phone
   * @returns {boolean}
   */
  _isValidPhone(phone) {
    const phoneRegex = /^[\d\+\-\(\)\s]+$/;
    return phoneRegex.test(phone);
  }

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
      // Validate required fields
      if (!data.name) throw new Error("name is required");

      // ✅ Validate name length
      const maxNameLength = await this._getMaxNameLength(qr);
      if (data.name.length > maxNameLength) {
        throw new Error(`Supplier name cannot exceed ${maxNameLength} characters`);
      }

      // ✅ Validate email format if provided
      if (data.email && !this._isValidEmail(data.email)) {
        throw new Error(`Invalid email format: "${data.email}"`);
      }

      // ✅ Validate phone format if provided
      if (data.phone && !this._isValidPhone(data.phone)) {
        throw new Error(`Invalid phone format: "${data.phone}"`);
      }

      // ✅ Validate contact info length
      if (data.contactInfo) {
        const maxContactLength = await this._getMaxContactInfoLength(qr);
        if (data.contactInfo.length > maxContactLength) {
          throw new Error(`Contact info cannot exceed ${maxContactLength} characters`);
        }
      }

      // ✅ Validate notes length
      if (data.notes) {
        const maxNotesLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxNotesLength) {
          throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
        }
      }

      // Check name uniqueness
      const existing = await repo.findOne({ where: { name: data.name } });
      if (existing) {
        throw new Error(`Supplier with name "${data.name}" already exists`);
      }

      // Check email uniqueness if provided
      if (data.email) {
        const existingEmail = await repo.findOne({ where: { email: data.email } });
        if (existingEmail) {
          throw new Error(`Email "${data.email}" already exists`);
        }
      }

      // Check phone uniqueness if provided
      if (data.phone) {
        const existingPhone = await repo.findOne({ where: { phone: data.phone } });
        if (existingPhone) {
          throw new Error(`Phone "${data.phone}" already exists`);
        }
      }

      // ✅ Use system setting for default active status
      const defaultActive = await this._getDefaultActiveStatus(qr);
      const isActive = data.isActive !== undefined ? data.isActive : defaultActive;

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

      // ✅ Check if audit logging is enabled before logging
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

      // ✅ Validate name length if changed
      if (data.name) {
        const maxNameLength = await this._getMaxNameLength(qr);
        if (data.name.length > maxNameLength) {
          throw new Error(`Supplier name cannot exceed ${maxNameLength} characters`);
        }
        const duplicate = await repo.findOne({ where: { name: data.name } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Supplier with name "${data.name}" already exists`);
        }
      }

      // ✅ Validate email format if changed
      if (data.email && data.email !== existing.email) {
        if (!this._isValidEmail(data.email)) {
          throw new Error(`Invalid email format: "${data.email}"`);
        }
        const duplicate = await repo.findOne({ where: { email: data.email } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Email "${data.email}" already exists`);
        }
      }

      // ✅ Validate phone format if changed
      if (data.phone && data.phone !== existing.phone) {
        if (!this._isValidPhone(data.phone)) {
          throw new Error(`Invalid phone format: "${data.phone}"`);
        }
        const duplicate = await repo.findOne({ where: { phone: data.phone } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Phone "${data.phone}" already exists`);
        }
      }

      // ✅ Validate contact info length if changed
      if (data.contactInfo) {
        const maxContactLength = await this._getMaxContactInfoLength(qr);
        if (data.contactInfo.length > maxContactLength) {
          throw new Error(`Contact info cannot exceed ${maxContactLength} characters`);
        }
      }

      // ✅ Validate notes length if changed
      if (data.notes) {
        const maxNotesLength = await this._getMaxNotesLength(qr);
        if (data.notes.length > maxNotesLength) {
          throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
        }
      }

      // Only allow isActive update through state service
      if (data.isActive !== undefined && data.isActive !== existing.isActive) {
        throw new Error("Use SupplierStateService to update supplier status");
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
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
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    try {
      const supplier = await repo.findOne({ where: { id } });
      if (!supplier) {
        throw new Error(`Supplier with ID ${id} not found`);
      }

      if (!supplier.isActive) {
        throw new Error(`Supplier #${id} is already inactive`);
      }

      // Check if supplier has active meats
      const meatRepo = this._getRepo(qr, this.meatRepository.target);
      const meatCount = await meatRepo.count({
        where: { supplier: { id }, isActive: true },
      });
      if (meatCount > 0) {
        throw new Error(
          `Cannot deactivate supplier #${id} because it has ${meatCount} active meat(s). Use SupplierStateService to handle reassignment.`
        );
      }

      // Check if supplier has pending purchases
      const purchaseRepo = this._getRepo(qr, this.purchaseRepository.target);
      const pendingPurchases = await purchaseRepo.count({
        where: { supplier: { id }, status: "pending" },
      });
      if (pendingPurchases > 0) {
        throw new Error(
          `Cannot deactivate supplier #${id} because it has ${pendingPurchases} pending purchase(s). Complete or cancel them first.`
        );
      }

      const oldData = { ...supplier };
      supplier.isActive = false;
      supplier.updatedAt = new Date();

      const saved = await updateDb(repo, supplier, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugDelete("Supplier", id, oldData, user);
      }

      logger.debug(`Supplier deactivated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete supplier:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted supplier (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Supplier = require("../entities/Supplier");
    const repo = this._getRepo(qr, Supplier);

    try {
      const supplier = await repo.findOne({ where: { id } });
      if (!supplier) {
        throw new Error(`Supplier with ID ${id} not found`);
      }

      if (supplier.isActive) {
        throw new Error(`Supplier #${id} is already active`);
      }

      const oldData = { ...supplier };
      supplier.isActive = true;
      supplier.updatedAt = new Date();

      const saved = await updateDb(repo, supplier, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Supplier", id, oldData, saved, user);
      }

      logger.debug(`Supplier restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore supplier:", error.message);
      throw error;
    }
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

    // Check if any meats are linked to this supplier
    const meatCount = await meatRepo.count({
      where: { supplier: { id } },
    });
    if (meatCount > 0) {
      throw new Error(
        `Cannot delete supplier #${id} because it is used by ${meatCount} meat(s). Reassign them first.`
      );
    }

    // Check if any purchases are linked to this supplier
    const purchaseCount = await purchaseRepo.count({
      where: { supplier: { id } },
    });
    if (purchaseCount > 0) {
      throw new Error(
        `Cannot delete supplier #${id} because it has ${purchaseCount} purchase(s).`
      );
    }

    // Check if any batches are linked to this supplier
    const batchCount = await batchRepo.count({
      where: { supplier: { id } },
    });
    if (batchCount > 0) {
      throw new Error(
        `Cannot delete supplier #${id} because it has ${batchCount} batch(es).`
      );
    }

    await removeDb(supplierRepo, supplier, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.debugDelete("Supplier", id, supplier, user);
    }

    logger.debug(`Supplier #${id} permanently deleted`);
  }

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

    // Filters
    if (options.isActive !== undefined) {
      qb.andWhere("supplier.isActive = :isActive", { isActive: options.isActive });
    }
    if (options.search) {
      qb.andWhere(
        "(supplier.name LIKE :search OR supplier.contactInfo LIKE :search OR supplier.email LIKE :search OR supplier.phone LIKE :search OR supplier.address LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "name";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Supplier] Invalid sortBy: ${sortBy}, falling back to name`);
      sortBy = "name";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`supplier.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("Supplier", null, "system");
    return result; // { data: [], pagination: {} }
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
    const totalInactive = await supplierRepo.count({ where: { isActive: false } });

    // Suppliers with meat count
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

    // Total purchases per supplier (completed only)
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

    // Total active batches per supplier
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

    // ✅ Get default active status from settings
    const defaultActive = await this._getDefaultActiveStatus(qr);

    // ✅ Get max name length from settings
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
  async exportSuppliers(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
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

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Supplier", format, filters, user);
      }

      logger.debug(`Exported ${suppliers.length} suppliers in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export suppliers:", error);
      throw error;
    }
  }

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

  /**
   * ✅ NEW: Get supplier health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const Supplier = require("../entities/Supplier");
    const supplierRepo = this._getRepo(qr, Supplier);

    const totalActive = await supplierRepo.count({ where: { isActive: true } });
    const totalInactive = await supplierRepo.count({ where: { isActive: false } });

    // ✅ Get default active status from settings
    const defaultActive = await this._getDefaultActiveStatus(qr);

    // ✅ Count suppliers with no email
    const noEmail = await supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.email IS NULL")
      .andWhere("supplier.isActive = true")
      .getCount();

    // ✅ Count suppliers with no phone
    const noPhone = await supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.phone IS NULL")
      .andWhere("supplier.isActive = true")
      .getCount();

    // ✅ Count suppliers with no address
    const noAddress = await supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.address IS NULL")
      .andWhere("supplier.isActive = true")
      .getCount();

    const healthScore = totalActive > 0
      ? Math.round(((totalActive - noEmail - noPhone - noAddress) / totalActive) * 100)
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
   * ✅ NEW: Get supplier by email
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
   * ✅ NEW: Get supplier by phone
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
   * ✅ NEW: Get top suppliers by purchase amount
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
}

// Singleton instance
const supplierService = new SupplierService();
module.exports = supplierService;