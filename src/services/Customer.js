// src/services/Customer.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

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
    console.log("CustomerService initialized");
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
    console.log(
      `[Customer._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[Customer._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
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

      const customer = repo.create({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        loyaltyPointsBalance: 0,
        lifetimePointsEarned: 0,
        status: "regular",
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(repo, customer, { queryRunner: qr });
      await auditLogger.logCreate("Customer", saved.id, saved, user);
      console.log(`Customer created: #${saved.id} - ${saved.name}`);
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

      // Check email uniqueness if changed
      if (data.email && data.email !== existing.email) {
        const duplicate = await repo.findOne({ where: { email: data.email } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Email "${data.email}" already exists`);
        }
      }

      // Check phone uniqueness if changed
      if (data.phone && data.phone !== existing.phone) {
        const duplicate = await repo.findOne({ where: { phone: data.phone } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Phone "${data.phone}" already exists`);
        }
      }

      // Only allow status update through state service
      if (data.status !== undefined && data.status !== existing.status) {
        throw new Error("Use CustomerStateService to update customer status");
      }

      // Only allow loyalty points update through state service
      if (data.loyaltyPointsBalance !== undefined || data.lifetimePointsEarned !== undefined) {
        throw new Error("Use CustomerStateService to update loyalty points");
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Customer", id, oldData, saved, user);
      console.log(`Customer updated: #${id}`);
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
      await auditLogger.logDelete("Customer", id, oldData, user);
      console.log(`Customer deactivated: #${id}`);
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
      await auditLogger.logUpdate("Customer", id, oldData, saved, user);
      console.log(`Customer restored: #${id}`);
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
        `Cannot delete customer #${id} because they have ${salesCount} sale(s)`
      );
    }

    // Check if customer has loyalty transactions
    const loyaltyCount = await loyaltyRepo.count({
      where: { customer: { id } },
    });
    if (loyaltyCount > 0) {
      throw new Error(
        `Cannot delete customer #${id} because they have ${loyaltyCount} loyalty transaction(s)`
      );
    }

    await removeDb(customerRepo, customer, { queryRunner: qr });
    await auditLogger.logDelete("Customer", id, customer, user);
    console.log(`Customer #${id} permanently deleted`);
  }

  /**
   * Find customer by ID
   * @param {number} id
   * @param {boolean} includeInactive
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeInactive = false, qr = null) {
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
    await auditLogger.logView("Customer", id, "system");
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
      qb.andWhere("customer.isActive = :isActive", { isActive: options.isActive });
    }
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      qb.andWhere("customer.status IN (:...statuses)", { statuses });
    }
    if (options.minPoints !== undefined) {
      qb.andWhere("customer.loyaltyPointsBalance >= :minPoints", { minPoints: options.minPoints });
    }
    if (options.maxPoints !== undefined) {
      qb.andWhere("customer.loyaltyPointsBalance <= :maxPoints", { maxPoints: options.maxPoints });
    }
    if (options.search) {
      qb.andWhere(
        "(customer.name LIKE :search OR customer.email LIKE :search OR customer.phone LIKE :search OR customer.address LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "name";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Customer] Invalid sortBy: ${sortBy}, falling back to name`);
      sortBy = "name";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`customer.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Customer", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get customer statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Customer = require("../entities/Customer");
    const repo = this._getRepo(qr, Customer);

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

    // Average points
    const avgPointsResult = await repo
      .createQueryBuilder("customer")
      .select("AVG(customer.loyaltyPointsBalance)", "avg")
      .where("customer.isActive = true")
      .getRawOne();
    const avgPoints = parseFloat(avgPointsResult.avg) || 0;

    // Top customers by points
    const topCustomers = await repo
      .createQueryBuilder("customer")
      .where("customer.isActive = true")
      .orderBy("customer.loyaltyPointsBalance", "DESC")
      .limit(5)
      .getMany();

    // Customers with positive points
    const withPoints = await repo.count({
      where: { isActive: true, loyaltyPointsBalance: { $gt: 0 } },
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
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        points: c.loyaltyPointsBalance,
        status: c.status,
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
  async exportCustomers(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
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

      await auditLogger.logExport("Customer", format, filters, user);
      console.log(`Exported ${customers.length} customers in ${format} format`);
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
}

// Singleton instance
const customerService = new CustomerService();
module.exports = customerService;