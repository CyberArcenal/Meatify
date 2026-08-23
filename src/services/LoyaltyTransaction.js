// src/services/Loyalty.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "transactionType",
  "pointsChange",
  "notes",
  "timestamp",
  "createdAt",
  "updatedAt",
]);

class LoyaltyTransactionService {
  constructor() {
    this.loyaltyRepository = null;
    this.customerRepository = null;
    this.saleRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const Customer = require("../entities/Customer");
    const Sale = require("../entities/Sale");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.loyaltyRepository = AppDataSource.getRepository(LoyaltyTransaction);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.saleRepository = AppDataSource.getRepository(Sale);
    logger.debug("LoyaltyTransactionService initialized");
  }

  async getRepositories() {
    if (!this.loyaltyRepository) {
      await this.initialize();
    }
    return {
      loyalty: this.loyaltyRepository,
      customer: this.customerRepository,
      sale: this.saleRepository,
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
      `[LoyaltyTransaction._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[LoyaltyTransaction._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new loyalty transaction (manual adjustment - no side effects)
   * For earning/redeeming points, use LoyaltyTransactionStateService
   * @param {Object} data - { customerId, pointsChange, transactionType, notes?, saleId? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const Customer = require("../entities/Customer");
    const Sale = require("../entities/Sale");

    const loyaltyRepo = this._getRepo(qr, LoyaltyTransaction);
    const customerRepo = this._getRepo(qr, Customer);
    const saleRepo = this._getRepo(qr, Sale);

    try {
      // Validate required fields
      if (!data.customerId) throw new Error("customerId is required");
      if (data.pointsChange === undefined || data.pointsChange === null) {
        throw new Error("pointsChange is required");
      }
      if (data.pointsChange === 0) {
        throw new Error("pointsChange cannot be zero");
      }
      if (!data.transactionType) throw new Error("transactionType is required");

      // Validate customer exists
      const customer = await customerRepo.findOne({ where: { id: data.customerId } });
      if (!customer) {
        throw new Error(`Customer with ID ${data.customerId} not found`);
      }

      // Validate sale if provided
      let sale = null;
      if (data.saleId) {
        sale = await saleRepo.findOne({ where: { id: data.saleId } });
        if (!sale) {
          throw new Error(`Sale with ID ${data.saleId} not found`);
        }
      }

      // Only allow manual adjustment type for direct creation
      // Earn and redeem should go through state service
      if (data.transactionType !== "adjustment") {
        throw new Error(
          `Use LoyaltyTransactionStateService for "${data.transactionType}" transactions. This service only handles "adjustment".`
        );
      }

      const transaction = loyaltyRepo.create({
        pointsChange: data.pointsChange,
        transactionType: data.transactionType,
        notes: data.notes || `Manual adjustment by ${user}`,
        customer: customer,
        sale: sale || null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(loyaltyRepo, transaction, { queryRunner: qr });
      await auditLogger.logCreate("LoyaltyTransaction", saved.id, saved, user);
      logger.debug(
        `LoyaltyTransaction created: #${saved.id} - ${saved.transactionType} (${saved.pointsChange > 0 ? "+" : ""}${saved.pointsChange})`
      );
      return saved;
    } catch (error) {
      console.error("Failed to create loyalty transaction:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing loyalty transaction (only notes allowed)
   * @param {number} id
   * @param {Object} data - { notes? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const repo = this._getRepo(qr, LoyaltyTransaction);

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`LoyaltyTransaction with ID ${id} not found`);
      }

      const oldData = { ...existing };

      // Only allow updating notes
      if (data.notes !== undefined) {
        existing.notes = data.notes;
      }

      // Prevent updating other fields
      if (data.pointsChange !== undefined || data.transactionType !== undefined ||
          data.customerId !== undefined || data.saleId !== undefined) {
        throw new Error("Cannot update pointsChange, transactionType, customerId, or saleId");
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("LoyaltyTransaction", id, oldData, saved, user);
      logger.debug(`LoyaltyTransaction updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update loyalty transaction:", error.message);
      throw error;
    }
  }

  /**
   * Delete a loyalty transaction (soft delete) - use with caution
   * For reversing point transactions, use LoyaltyTransactionStateService
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const repo = this._getRepo(qr, LoyaltyTransaction);

    try {
      const transaction = await repo.findOne({ where: { id } });
      if (!transaction) {
        throw new Error(`LoyaltyTransaction with ID ${id} not found`);
      }

      // Check if transaction is already deleted
      if (transaction.deletedAt) {
        throw new Error(`LoyaltyTransaction #${id} is already deleted`);
      }

      const oldData = { ...transaction };
      transaction.deletedAt = new Date();
      transaction.updatedAt = new Date();

      const saved = await updateDb(repo, transaction, { queryRunner: qr });
      await auditLogger.debugDelete("LoyaltyTransaction", id, oldData, user);
      logger.debug(`LoyaltyTransaction soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete loyalty transaction:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted loyalty transaction
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const repo = this._getRepo(qr, LoyaltyTransaction);

    try {
      const transaction = await repo.findOne({ where: { id }, withDeleted: true });
      if (!transaction) {
        throw new Error(`LoyaltyTransaction with ID ${id} not found`);
      }

      if (!transaction.deletedAt) {
        throw new Error(`LoyaltyTransaction #${id} is not deleted`);
      }

      const oldData = { ...transaction };
      transaction.deletedAt = null;
      transaction.updatedAt = new Date();

      const saved = await updateDb(repo, transaction, { queryRunner: qr });
      await auditLogger.logUpdate("LoyaltyTransaction", id, oldData, saved, user);
      logger.debug(`LoyaltyTransaction restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore loyalty transaction:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a loyalty transaction (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const repo = this._getRepo(qr, LoyaltyTransaction);

    const transaction = await repo.findOne({ where: { id }, withDeleted: true });
    if (!transaction) {
      throw new Error(`LoyaltyTransaction with ID ${id} not found`);
    }

    await removeDb(repo, transaction, { queryRunner: qr });
    await auditLogger.debugDelete("LoyaltyTransaction", id, transaction, user);
    logger.debug(`LoyaltyTransaction #${id} permanently deleted`);
  }

  /**
   * Find loyalty transaction by ID
   * @param {number} id
   * @param {boolean} includeDeleted
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeDeleted = false, qr = null) {
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const repo = this._getRepo(qr, LoyaltyTransaction);

    const queryBuilder = repo
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.customer", "customer")
      .leftJoinAndSelect("tx.sale", "sale")
      .where("tx.id = :id", { id });

    if (!includeDeleted) {
      queryBuilder.andWhere("tx.deletedAt IS NULL");
    }

    const transaction = await queryBuilder.getOne();
    if (!transaction) {
      throw new Error(`LoyaltyTransaction with ID ${id} not found`);
    }
    await logger.debug("LoyaltyTransaction", id, "system");
    return transaction;
  }

  /**
   * Find all loyalty transactions with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const repo = this._getRepo(qr, LoyaltyTransaction);

    const qb = repo
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.customer", "customer")
      .leftJoinAndSelect("tx.sale", "sale");

    // Exclude soft-deleted by default
    if (!options.includeDeleted) {
      qb.andWhere("tx.deletedAt IS NULL");
    }

    // Filters
    if (options.customerId) {
      qb.andWhere("tx.customerId = :customerId", { customerId: options.customerId });
    }
    if (options.saleId) {
      qb.andWhere("tx.saleId = :saleId", { saleId: options.saleId });
    }
    if (options.transactionType) {
      const types = Array.isArray(options.transactionType) ? options.transactionType : [options.transactionType];
      qb.andWhere("tx.transactionType IN (:...types)", { types });
    }
    if (options.startDate) {
      qb.andWhere("tx.timestamp >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("tx.timestamp <= :endDate", { endDate: end });
    }
    if (options.minPoints !== undefined) {
      qb.andWhere("tx.pointsChange >= :minPoints", { minPoints: options.minPoints });
    }
    if (options.maxPoints !== undefined) {
      qb.andWhere("tx.pointsChange <= :maxPoints", { maxPoints: options.maxPoints });
    }
    if (options.direction === "earn") {
      qb.andWhere("tx.pointsChange > 0");
    } else if (options.direction === "redeem") {
      qb.andWhere("tx.pointsChange < 0");
    }
    if (options.search) {
      qb.andWhere(
        "(tx.notes LIKE :search OR customer.name LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "timestamp";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[LoyaltyTransaction] Invalid sortBy: ${sortBy}, falling back to timestamp`);
      sortBy = "timestamp";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`tx.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("LoyaltyTransaction", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get loyalty transaction statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const repo = this._getRepo(qr, LoyaltyTransaction);

    const qb = repo
      .createQueryBuilder("tx")
      .where("tx.deletedAt IS NULL");

    // By transaction type
    const byType = await qb
      .clone()
      .select("tx.transactionType", "type")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(tx.pointsChange)", "totalPoints")
      .groupBy("tx.transactionType")
      .getRawMany();

    // Total earned (positive points)
    const earnedResult = await qb
      .clone()
      .select("SUM(tx.pointsChange)", "total")
      .where("tx.pointsChange > 0")
      .getRawOne();
    const totalEarned = parseFloat(earnedResult.total) || 0;

    // Total redeemed (negative points)
    const redeemedResult = await qb
      .clone()
      .select("SUM(ABS(tx.pointsChange))", "total")
      .where("tx.pointsChange < 0")
      .getRawOne();
    const totalRedeemed = parseFloat(redeemedResult.total) || 0;

    // Net points
    const netResult = await qb
      .clone()
      .select("SUM(tx.pointsChange)", "net")
      .getRawOne();
    const netPoints = parseFloat(netResult.net) || 0;

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Days = await qb
      .clone()
      .where("tx.timestamp >= :thirtyDaysAgo", { thirtyDaysAgo })
      .getCount();

    // Top customers by points earned
    const topCustomers = await qb
      .clone()
      .leftJoin("tx.customer", "customer")
      .select("customer.id", "customerId")
      .addSelect("customer.name", "customerName")
      .addSelect("SUM(tx.pointsChange)", "totalEarned")
      .where("tx.pointsChange > 0")
      .groupBy("customer.id")
      .orderBy("totalEarned", "DESC")
      .limit(5)
      .getRawMany();

    return {
      byType,
      totalEarned,
      totalRedeemed,
      netPoints,
      last30Days,
      topCustomers,
    };
  }

  /**
   * Export loyalty transactions to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportTransactions(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const transactions = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Customer",
          "Sale ID",
          "Type",
          "Points Change",
          "Notes",
          "Timestamp",
          "Created At",
        ];
        const rows = transactions.map((tx) => [
          tx.id,
          tx.customer?.name ?? "",
          tx.sale?.id ?? "",
          tx.transactionType,
          tx.pointsChange,
          tx.notes ?? "",
          new Date(tx.timestamp).toLocaleString(),
          new Date(tx.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `loyalty_transactions_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: transactions,
          filename: `loyalty_transactions_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      await auditLogger.debugExport("LoyaltyTransaction", format, filters, user);
      logger.debug(`Exported ${transactions.length} loyalty transactions in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export loyalty transactions:", error);
      throw error;
    }
  }

  /**
   * Bulk create loyalty transactions (only adjustment type)
   * @param {Array<Object>} transactionsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(transactionsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of transactionsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ transaction: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import loyalty transactions from CSV file
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
          customerId: parseInt(record.customerId, 10),
          pointsChange: parseInt(record.pointsChange, 10),
          transactionType: record.transactionType || "adjustment",
          notes: record.notes || null,
          saleId: record.saleId ? parseInt(record.saleId, 10) : null,
        };
        if (!data.customerId || data.pointsChange === undefined || data.pointsChange === 0) {
          throw new Error("customerId and non-zero pointsChange are required");
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
const loyaltyTransactionService = new LoyaltyTransactionService();
module.exports = loyaltyTransactionService;