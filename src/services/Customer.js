// src/services/Customer.js
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
  "email",
  "phone",
  "loyaltyPointsBalance",
  "lifetimePointsEarned",
  "status",
  "isActive",
  "createdAt",
  "updatedAt",
]);

class CustomerService {
  constructor() {
    this.customerRepository = null;
    this.saleRepository = null;
    this.loyaltyRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Customer = require("../entities/Customer");
    const Sale = require("../entities/Sale");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.saleRepository = AppDataSource.getRepository(Sale);
    this.loyaltyRepository = AppDataSource.getRepository(LoyaltyTransaction);
    logger.debug("CustomerService initialized");
  }

  async getRepositories() {
    if (!this.customerRepository) {
      await this.initialize();
    }
    return {
      customer: this.customerRepository,
      sale: this.saleRepository,
      loyalty: this.loyaltyRepository,
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
      `[Customer._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Customer._getRepo] Using global repository (fallback)`);
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
      logger.warn(
        `[Customer] Failed to check audit enabled status: ${error.message}, defaulting to true`,
      );
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
      return await system.getBool(
        "default_customer_active",
        SettingType.SALES,
        true,
      );
    } catch (error) {
      logger.warn(
        `[Customer] Failed to get default active status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * ✅ NEW: Get default customer status from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _getDefaultCustomerStatus(qr = null) {
    try {
      const status = await system.getValue(
        "default_customer_status",
        SettingType.SALES,
        "regular",
      );
      const validStatuses = ["regular", "vip", "elite"];
      if (!validStatuses.includes(status)) {
        logger.warn(
          `[Customer] Invalid default status "${status}", defaulting to "regular"`,
        );
        return "regular";
      }
      return status;
    } catch (error) {
      logger.warn(
        `[Customer] Failed to get default status: ${error.message}, defaulting to "regular"`,
      );
      return "regular";
    }
  }

  /**
   * ✅ NEW: Get allowed customer statuses from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedStatuses(qr = null) {
    try {
      return await system.getArray(
        "allowed_customer_statuses",
        SettingType.SALES,
        ["regular", "vip", "elite"],
      );
    } catch (error) {
      logger.warn(
        `[Customer] Failed to get allowed statuses: ${error.message}, using defaults`,
      );
      return ["regular", "vip", "elite"];
    }
  }

  /**
   * ✅ NEW: Check if loyalty points are enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isLoyaltyEnabled(qr = null) {
    try {
      return await system.loyaltyPointsEnabled();
    } catch (error) {
      logger.warn(
        `[Customer] Failed to check loyalty enabled: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * ✅ NEW: Get VIP threshold from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getVipThreshold(qr = null) {
    try {
      return await system.loyaltyVipThreshold();
    } catch (error) {
      logger.warn(
        `[Customer] Failed to get VIP threshold: ${error.message}, defaulting to 1000`,
      );
      return 1000;
    }
  }

  /**
   * ✅ NEW: Get Elite threshold from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getEliteThreshold(qr = null) {
    try {
      return await system.loyaltyEliteThreshold();
    } catch (error) {
      logger.warn(
        `[Customer] Failed to get Elite threshold: ${error.message}, defaulting to 5000`,
      );
      return 5000;
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
   * Create a new customer
   * @param {Object} data - { name, email?, phone?, address?, notes? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    try {
      // Validate required fields
      if (!data.name) throw new Error("name is required");

      // ✅ Validate email format if provided
      if (data.email && !this._isValidEmail(data.email)) {
        throw new Error(`Invalid email format: "${data.email}"`);
      }

      // ✅ Validate phone format if provided
      if (data.phone && !this._isValidPhone(data.phone)) {
        throw new Error(`Invalid phone format: "${data.phone}"`);
      }

      // Check email uniqueness if provided
      if (data.email) {
        const existing = await repo.findOne({ where: { email: data.email } });
        if (existing) {
          throw new Error(`Email "${data.email}" already exists`);
        }
      }

      // Check phone uniqueness if provided
      if (data.phone) {
        const existing = await repo.findOne({ where: { phone: data.phone } });
        if (existing) {
          throw new Error(`Phone "${data.phone}" already exists`);
        }
      }

      // ✅ Validate status if provided
      if (data.status) {
        const allowedStatuses = await this._getAllowedStatuses(qr);
        if (!allowedStatuses.includes(data.status)) {
          throw new Error(
            `Invalid customer status: "${data.status}". Allowed: ${allowedStatuses.join(", ")}`,
          );
        }
      }

      // ✅ Use system settings for defaults
      const defaultActive = await this._getDefaultActiveStatus(qr);
      const defaultStatus = await this._getDefaultCustomerStatus(qr);

      // ✅ Check if loyalty is enabled (for initial points)
      const loyaltyEnabled = await this._isLoyaltyEnabled(qr);
      const initialPoints = loyaltyEnabled ? 0 : 0; // Always start at 0

      const customer = repo.create({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        loyaltyPointsBalance: initialPoints,
        lifetimePointsEarned: 0,
        status: data.status || defaultStatus,
        isActive: data.isActive !== undefined ? data.isActive : defaultActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(repo, customer, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Customer", saved.id, saved, user);
      }

      logger.debug(`Customer created: #${saved.id} - ${saved.name}`);
      return saved;
    } catch (error) {
      console.error("Failed to create customer:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing customer
   * @param {number} id
   * @param {Object} data - Fields to update
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Customer with ID ${id} not found`);
      }

      const oldData = { ...existing };

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

      // Only allow status update through state service
      if (data.status !== undefined && data.status !== existing.status) {
        // ✅ Validate status if provided
        const allowedStatuses = await this._getAllowedStatuses(qr);
        if (!allowedStatuses.includes(data.status)) {
          throw new Error(
            `Invalid customer status: "${data.status}". Allowed: ${allowedStatuses.join(", ")}`,
          );
        }
        throw new Error("Use CustomerStateService to update customer status");
      }

      // Only allow loyalty points update through state service
      if (
        data.loyaltyPointsBalance !== undefined ||
        data.lifetimePointsEarned !== undefined
      ) {
        throw new Error("Use CustomerStateService to update loyalty points");
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Customer", id, oldData, saved, user);
      }

      logger.debug(`Customer updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update customer:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a customer (set isActive = false)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    try {
      const customer = await repo.findOne({ where: { id } });
      if (!customer) {
        throw new Error(`Customer with ID ${id} not found`);
      }

      if (!customer.isActive) {
        throw new Error(`Customer #${id} is already inactive`);
      }

      // Check if customer has pending returns or active debts (optional)
      // You can add checks here if needed

      const oldData = { ...customer };
      customer.isActive = false;
      customer.updatedAt = new Date();

      const saved = await updateDb(repo, customer, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Customer", id, oldData, user);
      }

      logger.debug(`Customer deactivated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete customer:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted customer (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    try {
      const customer = await repo.findOne({ where: { id } });
      if (!customer) {
        throw new Error(`Customer with ID ${id} not found`);
      }

      if (customer.isActive) {
        throw new Error(`Customer #${id} is already active`);
      }

      const oldData = { ...customer };
      customer.isActive = true;
      customer.updatedAt = new Date();

      const saved = await updateDb(repo, customer, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Customer", id, oldData, saved, user);
      }

      logger.debug(`Customer restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore customer:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a customer (hard delete) – only if no sales or loyalty transactions
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Customer = require("../entities/Customer");
    const Sale = require("../entities/Sale");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");

    const customerRepo = this._getRepo(qr, Customer);
    const saleRepo = this._getRepo(qr, Sale);
    const loyaltyRepo = this._getRepo(qr, LoyaltyTransaction);

    const customer = await customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    // Check if customer has sales
    const salesCount = await saleRepo.count({ where: { customer: { id } } });
    if (salesCount > 0) {
      throw new Error(
        `Cannot delete customer #${id} because they have ${salesCount} sale(s)`,
      );
    }

    // Check if customer has loyalty transactions
    const loyaltyCount = await loyaltyRepo.count({
      where: { customer: { id } },
    });
    if (loyaltyCount > 0) {
      throw new Error(
        `Cannot delete customer #${id} because they have ${loyaltyCount} loyalty transaction(s)`,
      );
    }

    await removeDb(customerRepo, customer, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("Customer", id, customer, user);
    }

    logger.debug(`Customer #${id} permanently deleted`);
  }

  /**
   * Find customer by ID
   * @param {number} id
   * @param {boolean} includeInactive
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeInactive = false, qr = null) {
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new Error(`Invalid customer ID: ${id}`);
    }

    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    const queryBuilder = repo
      .createQueryBuilder("customer")
      .where("customer.id = :id", { id });

    if (!includeInactive) {
      queryBuilder.andWhere("customer.isActive = true");
    }

    const customer = await queryBuilder.getOne();
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    await logger.debug("Customer", id, "system");
    return customer;
  }

  /**
   * Find all customers with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    const qb = repo.createQueryBuilder("customer");

    // Filters
    if (options.isActive !== undefined) {
      qb.andWhere("customer.isActive = :isActive", {
        isActive: options.isActive,
      });
    }
    if (options.status) {
      const statuses = Array.isArray(options.status)
        ? options.status
        : [options.status];
      // ✅ Validate statuses against allowed list
      const allowedStatuses = await this._getAllowedStatuses(qr);
      const invalidStatuses = statuses.filter(
        (s) => !allowedStatuses.includes(s),
      );
      if (invalidStatuses.length > 0) {
        logger.warn(
          `[Customer] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${allowedStatuses.join(", ")}`,
        );
      }
      qb.andWhere("customer.status IN (:...statuses)", { statuses });
    }
    if (options.minPoints !== undefined) {
      qb.andWhere("customer.loyaltyPointsBalance >= :minPoints", {
        minPoints: options.minPoints,
      });
    }
    if (options.maxPoints !== undefined) {
      qb.andWhere("customer.loyaltyPointsBalance <= :maxPoints", {
        maxPoints: options.maxPoints,
      });
    }
    if (options.search) {
      qb.andWhere(
        "(customer.name LIKE :search OR customer.email LIKE :search OR customer.phone LIKE :search OR customer.address LIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    // Sorting
    let sortBy = options.sortBy || "name";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(
        `[Customer] Invalid sortBy: ${sortBy}, falling back to name`,
      );
      sortBy = "name";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`customer.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("Customer", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get customer statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    // ✅ Get thresholds from settings
    const vipThreshold = await this._getVipThreshold(qr);
    const eliteThreshold = await this._getEliteThreshold(qr);
    const loyaltyEnabled = await this._isLoyaltyEnabled(qr);

    const totalActive = await repo.count({ where: { isActive: true } });
    const totalInactive = await repo.count({ where: { isActive: false } });

    // By status
    const byStatus = await repo
      .createQueryBuilder("customer")
      .select("customer.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("customer.isActive = true")
      .groupBy("customer.status")
      .getRawMany();

    // Average points (only if loyalty is enabled)
    let avgPoints = 0;
    let withPoints = 0;
    if (loyaltyEnabled) {
      const avgPointsResult = await repo
        .createQueryBuilder("customer")
        .select("AVG(customer.loyaltyPointsBalance)", "avg")
        .where("customer.isActive = true")
        .getRawOne();
      avgPoints = parseFloat(avgPointsResult.avg) || 0;

      withPoints = await repo.count({
        where: { isActive: true, loyaltyPointsBalance: { $gt: 0 } },
      });
    }

    // Top customers by points (only if loyalty is enabled)
    let topCustomers = [];
    if (loyaltyEnabled) {
      topCustomers = await repo
        .createQueryBuilder("customer")
        .where("customer.isActive = true")
        .orderBy("customer.loyaltyPointsBalance", "DESC")
        .limit(5)
        .getMany();
    }

    // ✅ Count customers by tier
    const vipCount = await repo.count({
      where: {
        isActive: true,
        lifetimePointsEarned: { $gte: vipThreshold, $lt: eliteThreshold },
      },
    });
    const eliteCount = await repo.count({
      where: {
        isActive: true,
        lifetimePointsEarned: { $gte: eliteThreshold },
      },
    });

    return {
      totalActive,
      totalInactive,
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {}),
      averageLoyaltyPoints: avgPoints,
      customersWithPoints: withPoints,
      loyaltyEnabled,
      vipThreshold,
      eliteThreshold,
      vipCount,
      eliteCount,
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        points: c.loyaltyPointsBalance,
        status: c.status,
        lifetimePoints: c.lifetimePointsEarned || 0,
      })),
    };
  }

  /**
   * Export customers to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportCustomers(
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
      const customers = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Name",
          "Email",
          "Phone",
          "Address",
          "Loyalty Points",
          "Lifetime Points",
          "Status",
          "Active",
          "Notes",
          "Created At",
          "Updated At",
        ];
        const rows = customers.map((c) => [
          c.id,
          c.name,
          c.email ?? "",
          c.phone ?? "",
          c.address ?? "",
          c.loyaltyPointsBalance,
          c.lifetimePointsEarned ?? 0,
          c.status,
          c.isActive ? "Yes" : "No",
          c.notes ?? "",
          new Date(c.createdAt).toLocaleString(),
          c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `customers_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: customers,
          filename: `customers_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Customer", format, filters, user);
      }

      logger.debug(
        `Exported ${customers.length} customers in ${format} format`,
      );
      return exportData;
    } catch (error) {
      console.error("Failed to export customers:", error);
      throw error;
    }
  }

  /**
   * Bulk create customers
   * @param {Array<Object>} customersArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(customersArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of customersArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ customer: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update customers
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
   * Import customers from CSV file
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
          email: record.email || null,
          phone: record.phone || null,
          address: record.address || null,
          notes: record.notes || null,
          isActive: record.isActive !== "false",
          status: record.status || "regular",
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
   * ✅ NEW: Clean up inactive customers (soft delete)
   * @param {number} daysOld - Inactive for this many days
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanInactiveCustomers(daysOld = 365, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

    // ✅ Get threshold from settings if not provided
    if (daysOld === 365) {
      try {
        daysOld = await system.getInt(
          "inactive_customer_cleanup_days",
          SettingType.SALES,
          365,
        );
      } catch (error) {
        logger.warn(
          `[Customer] Failed to get inactive cleanup days: ${error.message}, defaulting to 365`,
        );
      }
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const inactiveCustomers = await repo
      .createQueryBuilder("customer")
      .where("customer.isActive = true")
      .andWhere("customer.updatedAt < :cutoffDate", { cutoffDate })
      .andWhere("customer.loyaltyPointsBalance = 0")
      .getMany();

    if (inactiveCustomers.length === 0) {
      logger.info(
        `[Customer] No inactive customers to clean up (threshold: ${daysOld} days)`,
      );
      return { count: 0 };
    }

    let updatedCount = 0;
    for (const customer of inactiveCustomers) {
      try {
        customer.isActive = false;
        customer.updatedAt = new Date();
        await updateDb(repo, customer, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logUpdate(
            "Customer",
            customer.id,
            { isActive: true },
            { isActive: false },
            user,
          );
        }

        updatedCount++;
        logger.info(
          `[Customer] Customer #${customer.id} (${customer.name}) deactivated (inactive for ${daysOld} days)`,
        );
      } catch (err) {
        logger.error(
          `[Customer] Failed to clean inactive customer #${customer.id}:`,
          err,
        );
      }
    }

    logger.info(
      `[Customer] Cleaned up ${updatedCount} inactive customers (older than ${daysOld} days)`,
    );
    return { count: updatedCount };
  }

  /**
   * ✅ NEW: Get customer tier info
   * @param {number} lifetimePoints
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ tier: string, nextTier: string | null, pointsToNext: number }>}
   */
  async getCustomerTierInfo(lifetimePoints, qr = null) {
    const vipThreshold = await this._getVipThreshold(qr);
    const eliteThreshold = await this._getEliteThreshold(qr);

    if (lifetimePoints >= eliteThreshold) {
      return { tier: "elite", nextTier: null, pointsToNext: 0 };
    } else if (lifetimePoints >= vipThreshold) {
      return {
        tier: "vip",
        nextTier: "elite",
        pointsToNext: eliteThreshold - lifetimePoints,
      };
    } else {
      return {
        tier: "regular",
        nextTier: "vip",
        pointsToNext: vipThreshold - lifetimePoints,
      };
    }
  }
}

// Singleton instance
const customerService = new CustomerService();
module.exports = customerService;
