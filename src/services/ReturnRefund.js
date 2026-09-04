// src/services/ReturnRefund.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");
const batchService = require("./Batch"); // ✅ Import BatchService
const { z } = require("zod"); // ✅ Fixed import
const {
  returnRefundCreateSchema,
  returnRefundUpdateSchema, // ✅ Added missing import
} = require("../validation/schemas/returnRefund.schema");
const { validate } = require("../validation/validate");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "referenceNo",
  "reason",
  "refundMethod",
  "totalAmount",
  "status",
  "createdAt",
  "updatedAt",
]);

class ReturnRefundService {
  constructor() {
    this.returnRepository = null;
    this.returnItemRepository = null;
    this.saleRepository = null;
    this.customerRepository = null;
    this.meatRepository = null;
    this.batchRepository = null;
    this.loyaltyRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const ReturnRefund = require("../entities/ReturnRefund");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const Sale = require("../entities/Sale");
    const Customer = require("../entities/Customer");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.returnRepository = AppDataSource.getRepository(ReturnRefund);
    this.returnItemRepository = AppDataSource.getRepository(ReturnRefundItem);
    this.saleRepository = AppDataSource.getRepository(Sale);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.batchRepository = AppDataSource.getRepository(Batch);
    this.loyaltyRepository = AppDataSource.getRepository(LoyaltyTransaction);
    logger.debug("ReturnRefundService initialized");
  }

  async getRepositories() {
    if (!this.returnRepository) {
      await this.initialize();
    }
    return {
      return: this.returnRepository,
      returnItem: this.returnItemRepository,
      sale: this.saleRepository,
      customer: this.customerRepository,
      meat: this.meatRepository,
      batch: this.batchRepository,
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
      `[ReturnRefund._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[ReturnRefund._getRepo] Using global repository (fallback)`);
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
        `[ReturnRefund] Failed to check audit enabled status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get allowed return statuses from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedStatuses(qr = null) {
    try {
      return await system.getArray(
        "allowed_return_statuses",
        SettingType.SALES,
        ["pending", "processed", "cancelled"],
      );
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get allowed statuses: ${error.message}, using defaults`,
      );
      return ["pending", "processed", "cancelled"];
    }
  }

  /**
   * Get reference prefix from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _getReferencePrefix(qr = null) {
    try {
      const prefix = await system.getValue(
        "return_reference_prefix",
        SettingType.SALES,
        null,
      );
      if (prefix && prefix.trim()) {
        return prefix.trim().toUpperCase();
      }
      const company = await system.companyName();
      return company.substring(0, 3).toUpperCase() || "RET";
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get reference prefix: ${error.message}, defaulting to "RET"`,
      );
      return "RET";
    }
  }

  /**
   * Check if refunds are enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isRefundsEnabled(qr = null) {
    try {
      return await system.enableRefunds();
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to check refunds enabled: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get refund window days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRefundWindowDays(qr = null) {
    try {
      return await system.refundWindowDays();
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get refund window days: ${error.message}, defaulting to 7`,
      );
      return 7;
    }
  }

  /**
   * Check if receipt is required for refund
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isReceiptRequired(qr = null) {
    try {
      return await system.requireReceiptForRefund();
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to check receipt required: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Check if restock is enabled for refunds
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isRestockEnabled(qr = null) {
    try {
      return await system.refundRestockEnabled();
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to check restock enabled: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get max reason length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxReasonLength(qr = null) {
    try {
      return await system.getInt(
        "max_return_reason_length",
        SettingType.SALES,
        500,
      );
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get max reason length: ${error.message}, defaulting to 500`,
      );
      return 500;
    }
  }

  /**
   * Get retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRetentionDays(qr = null) {
    try {
      return await system.getInt(
        "return_retention_days",
        SettingType.SALES,
        730,
      );
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get retention days: ${error.message}, defaulting to 730`,
      );
      return 730;
    }
  }

  /**
   * Get max weight per item from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxWeightKg(qr = null) {
    try {
      return await system.getDecimal(
        "max_return_weight_kg",
        SettingType.SALES,
        999.999,
      );
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get max weight: ${error.message}, defaulting to 999.999`,
      );
      return 999.999;
    }
  }

  /**
   * Get max unit price from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxUnitPrice(qr = null) {
    try {
      return await system.getDecimal(
        "max_return_unit_price",
        SettingType.SALES,
        9999.99,
      );
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get max unit price: ${error.message}, defaulting to 9999.99`,
      );
      return 9999.99;
    }
  }

  /**
   * Get max total amount from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxTotalAmount(qr = null) {
    try {
      return await system.getDecimal(
        "max_return_total_amount",
        SettingType.SALES,
        999999.99,
      );
    } catch (error) {
      logger.warn(
        `[ReturnRefund] Failed to get max total amount: ${error.message}, defaulting to 999999.99`,
      );
      return 999999.99;
    }
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  /**
   * Find return by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    const returnRefund = await returnRepo
      .createQueryBuilder("return")
      .leftJoinAndSelect("return.sale", "sale")
      .leftJoinAndSelect("return.customer", "customer")
      .leftJoinAndSelect("return.items", "items")
      .leftJoinAndSelect("items.meat", "meat")
      .leftJoinAndSelect("items.batch", "batch")
      .where("return.id = :id", { id })
      .getOne();

    if (!returnRefund) {
      throw new Error(`ReturnRefund with ID ${id} not found`);
    }
    await logger.debug("ReturnRefund", id, "system");
    return returnRefund;
  }

  /**
   * Find all returns with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    const qb = returnRepo
      .createQueryBuilder("return")
      .leftJoinAndSelect("return.sale", "sale")
      .leftJoinAndSelect("return.customer", "customer")
      .leftJoinAndSelect("return.items", "items")
      .leftJoinAndSelect("items.meat", "meat");

    // Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("return.createdAt >= :cutoffDate", { cutoffDate });
    }

    // Filters
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
          `[ReturnRefund] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${allowedStatuses.join(", ")}`,
        );
      }
      qb.andWhere("return.status IN (:...statuses)", { statuses });
    }
    if (options.saleId) {
      qb.andWhere("return.saleId = :saleId", { saleId: options.saleId });
    }
    if (options.customerId) {
      qb.andWhere("return.customerId = :customerId", {
        customerId: options.customerId,
      });
    }
    if (options.refundMethod) {
      qb.andWhere("return.refundMethod = :refundMethod", {
        refundMethod: options.refundMethod,
      });
    }
    if (options.startDate) {
      qb.andWhere("return.createdAt >= :startDate", {
        startDate: new Date(options.startDate),
      });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("return.createdAt <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(return.referenceNo LIKE :search OR return.reason LIKE :search OR customer.name LIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    // Sorting
    let sortBy = options.sortBy || "createdAt";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(
        `[ReturnRefund] Invalid sortBy: ${sortBy}, falling back to createdAt`,
      );
      sortBy = "createdAt";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`return.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("ReturnRefund", null, "system");
    return result;
  }

  /**
   * Get return statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    const retentionDays = await this._getRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const byStatus = await returnRepo
      .createQueryBuilder("return")
      .select("return.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(return.totalAmount)", "total")
      .where("return.createdAt >= :cutoffDate", { cutoffDate })
      .groupBy("return.status")
      .getRawMany();

    const processedResult = await returnRepo
      .createQueryBuilder("return")
      .select("SUM(return.totalAmount)", "total")
      .where("return.status = 'processed'")
      .andWhere("return.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalProcessed = parseFloat(processedResult.total) || 0;

    const avgResult = await returnRepo
      .createQueryBuilder("return")
      .select("AVG(return.totalAmount)", "avg")
      .where("return.status = 'processed'")
      .andWhere("return.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const averageRefund = parseFloat(avgResult.avg) || 0;

    const today = new Date().toISOString().split("T")[0];
    const todayReturns = await returnRepo
      .createQueryBuilder("return")
      .where("DATE(return.createdAt) = :today", { today })
      .getCount();

    const topCustomers = await returnRepo
      .createQueryBuilder("return")
      .leftJoin("return.customer", "customer")
      .select("customer.id", "customerId")
      .addSelect("customer.name", "customerName")
      .addSelect("COUNT(return.id)", "returnCount")
      .addSelect("SUM(return.totalAmount)", "totalRefunded")
      .where("return.status = 'processed'")
      .andWhere("return.createdAt >= :cutoffDate", { cutoffDate })
      .groupBy("customer.id")
      .orderBy("totalRefunded", "DESC")
      .limit(5)
      .getRawMany();

    const allowedStatuses = await this._getAllowedStatuses(qr);
    const refundWindowDays = await this._getRefundWindowDays(qr);
    const refundsEnabled = await this._isRefundsEnabled(qr);

    return {
      byStatus,
      totalProcessed,
      averageRefund,
      todayReturns,
      topCustomers,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      allowedStatuses,
      refundWindowDays,
      refundsEnabled,
    };
  }

  /**
   * Export returns to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportReturns(
    format = "json",
    filters = {},
    user = "system",
    qr = null,
  ) {
    try {
      const result = await this.findAll(
        {
          ...filters,
          limit: undefined,
          page: undefined,
          ignoreRetention: true,
        },
        qr,
      );
      const returns = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Reference No",
          "Sale ID",
          "Customer",
          "Reason",
          "Refund Method",
          "Total Amount",
          "Status",
          "Created At",
        ];
        const rows = returns.map((r) => [
          r.id,
          r.referenceNo,
          r.sale?.id ?? "",
          r.customer?.name ?? "",
          r.reason ?? "",
          r.refundMethod,
          r.totalAmount,
          r.status,
          new Date(r.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `returns_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: returns,
          filename: `returns_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("ReturnRefund", format, filters, user);
      }

      logger.debug(`Exported ${returns.length} returns in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export returns:", error);
      throw error;
    }
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (CRUD)
  // ============================================================

  /**
   * Create a new return/refund request (pending status)
   * @param {Object} data - { saleId, customerId, reason?, refundMethod, items: [{ meatId, batchId, weightKg, unitPrice, reason? }] }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefund = require("../entities/ReturnRefund");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const Sale = require("../entities/Sale");
    const Customer = require("../entities/Customer");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");

    const returnRepo = this._getRepo(qr, ReturnRefund);
    const returnItemRepo = this._getRepo(qr, ReturnRefundItem);
    const saleRepo = this._getRepo(qr, Sale);
    const customerRepo = this._getRepo(qr, Customer);
    const meatRepo = this._getRepo(qr, Meat);
    const batchRepo = this._getRepo(qr, Batch);

    // ✅ Validate input
    const validated = validate(returnRefundCreateSchema, data, 'Return creation');

    try {
      const { saleId, customerId, reason, refundMethod, items, referenceNo, status } = validated;

      // ✅ Check if refunds are enabled
      const refundsEnabled = await this._isRefundsEnabled(qr);
      if (!refundsEnabled) {
        throw new Error("Refunds are disabled in system settings");
      }

      // ✅ Validate reason length
      if (reason) {
        const maxReasonLength = await this._getMaxReasonLength(qr);
        if (reason.length > maxReasonLength) {
          throw new Error(`Reason cannot exceed ${maxReasonLength} characters`);
        }
      }

      // ✅ Validate sale
      const sale = await saleRepo.findOne({ where: { id: saleId } });
      if (!sale) {
        throw new Error(`Sale with ID ${saleId} not found`);
      }
      if (sale.status !== "paid") {
        throw new Error(`Cannot return from a sale with status "${sale.status}"`);
      }

      // ✅ Validate refund window
      const windowDays = await this._getRefundWindowDays(qr);
      const saleDate = new Date(sale.timestamp);
      const now = new Date();
      const daysDiff = (now - saleDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > windowDays) {
        throw new Error(`Refund window of ${windowDays} days has passed (sale was ${Math.floor(daysDiff)} days ago)`);
      }

      // ✅ Validate customer
      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }

      // ✅ Process items
      const maxWeight = await this._getMaxWeightKg(qr);
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      const maxTotalAmount = await this._getMaxTotalAmount(qr);

      const returnItems = [];
      let totalAmount = 0;

      for (const itemData of items) {
        const meat = await meatRepo.findOne({
          where: { id: itemData.meatId, isActive: true },
        });
        if (!meat) {
          throw new Error(`Meat with ID ${itemData.meatId} not found or inactive`);
        }

        const batch = await batchRepo.findOne({
          where: { id: itemData.batchId },
        });
        if (!batch) {
          throw new Error(`Batch with ID ${itemData.batchId} not found`);
        }
        if (batch.meatId !== itemData.meatId) {
          throw new Error(`Batch #${itemData.batchId} does not belong to meat #${itemData.meatId}`);
        }

        // ✅ Validate weight and price
        if (itemData.weightKg > maxWeight) {
          throw new Error(`Weight ${itemData.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`);
        }

        const unitPrice = itemData.unitPrice ?? meat.pricePerKg;
        if (unitPrice > maxUnitPrice) {
          throw new Error(`Unit price ₱${unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
        }

        const subtotal = unitPrice * itemData.weightKg;
        totalAmount += subtotal;

        if (totalAmount > maxTotalAmount) {
          throw new Error(`Total amount ₱${totalAmount} exceeds maximum allowed of ₱${maxTotalAmount}`);
        }

        returnItems.push({
          weightKg: itemData.weightKg,
          unitPrice: unitPrice,
          subtotal: subtotal,
          reason: itemData.reason || null,
          meat: meat,
          batch: batch,
        });
      }

      // ✅ Generate reference number
      let finalReferenceNo = referenceNo;
      if (!finalReferenceNo) {
        const prefix = await this._getReferencePrefix(qr);
        finalReferenceNo = await this.generateReference(returnRepo, prefix);
      } else {
        const existing = await returnRepo.findOne({ where: { referenceNo: finalReferenceNo } });
        if (existing) {
          throw new Error(`Reference "${finalReferenceNo}" already exists`);
        }
      }

      // ✅ Create return
      const returnRefund = returnRepo.create({
        referenceNo: finalReferenceNo,
        reason: reason || null,
        refundMethod: refundMethod,
        totalAmount: Math.round(totalAmount * 100) / 100,
        status: status || "pending",
        sale: sale,
        customer: customer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedReturn = await saveDb(returnRepo, returnRefund, {
        queryRunner: qr,
      });

      // ✅ Create return items
      for (const itemData of returnItems) {
        const returnItem = returnItemRepo.create({
          ...itemData,
          returnRefund: savedReturn,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await saveDb(returnItemRepo, returnItem, { queryRunner: qr });
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        const auditLogger = require("../utils/auditLogger");
        await auditLogger.logCreate("ReturnRefund", savedReturn.id, savedReturn, user);
      }

      logger.debug(`ReturnRefund created: #${savedReturn.id} - ${savedReturn.referenceNo}`);

      const fullReturn = await returnRepo.findOne({
        where: { id: savedReturn.id },
        relations: ["sale", "customer", "items", "items.meat", "items.batch"],
      });

      return fullReturn;
    } catch (error) {
      console.error("Failed to create return:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing return (only allowed for pending status)
   * @param {number} id
   * @param {Object} data - { reason?, refundMethod?, items?, customerId?, saleId? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const {
      updateDb,
      saveDb,
      removeDb,
    } = require("../utils/dbUtils/dbActions");
    const ReturnRefund = require("../entities/ReturnRefund");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const Sale = require("../entities/Sale");
    const Customer = require("../entities/Customer");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");

    const returnRepo = this._getRepo(qr, ReturnRefund);
    const returnItemRepo = this._getRepo(qr, ReturnRefundItem);
    const saleRepo = this._getRepo(qr, Sale);
    const customerRepo = this._getRepo(qr, Customer);
    const meatRepo = this._getRepo(qr, Meat);
    const batchRepo = this._getRepo(qr, Batch);

    // ✅ Validate input
    const validated = validate(returnRefundUpdateSchema, data, 'Return update');

    try {
      const existing = await returnRepo.findOne({
        where: { id },
        relations: ["items", "items.meat", "items.batch", "sale", "customer"],
      });
      if (!existing) {
        throw new Error(`ReturnRefund with ID ${id} not found`);
      }

      if (existing.status !== "pending") {
        throw new Error(
          `Cannot update a return with status "${existing.status}"`,
        );
      }

      const oldData = { ...existing };

      // Use validated data
      const { reason, refundMethod, items, customerId, saleId } = validated;

      // ✅ Validate reason length
      if (reason !== undefined && reason.length > (await this._getMaxReasonLength(qr))) {
        throw new Error(`Reason cannot exceed ${await this._getMaxReasonLength(qr)} characters`);
      }

      // ✅ Handle sale change
      if (saleId && saleId !== existing.sale.id) {
        const sale = await saleRepo.findOne({ where: { id: saleId } });
        if (!sale) {
          throw new Error(`Sale with ID ${saleId} not found`);
        }
        existing.sale = sale;
      }

      // ✅ Handle customer change
      if (customerId && customerId !== existing.customer.id) {
        const customer = await customerRepo.findOne({
          where: { id: customerId },
        });
        if (!customer) {
          throw new Error(`Customer with ID ${customerId} not found`);
        }
        existing.customer = customer;
      }

      // ✅ Handle items update (replace all items)
      if (items) {
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("At least one return item is required");
        }

        const maxWeight = await this._getMaxWeightKg(qr);
        const maxUnitPrice = await this._getMaxUnitPrice(qr);
        const maxTotalAmount = await this._getMaxTotalAmount(qr);

        // Remove old items
        for (const oldItem of existing.items) {
          await removeDb(returnItemRepo, oldItem, { queryRunner: qr });
        }

        const newItems = [];
        let totalAmount = 0;

        for (const itemData of items) {
          if (!itemData.meatId) throw new Error("meatId is required for each item");
          if (!itemData.batchId) throw new Error("batchId is required for each item");
          if (!itemData.weightKg || itemData.weightKg <= 0) {
            throw new Error("weightKg must be greater than 0");
          }
          if (itemData.weightKg > maxWeight) {
            throw new Error(
              `Weight ${itemData.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`,
            );
          }

          const meat = await meatRepo.findOne({
            where: { id: itemData.meatId, isActive: true },
          });
          if (!meat) {
            throw new Error(
              `Meat with ID ${itemData.meatId} not found or inactive`,
            );
          }

          const batch = await batchRepo.findOne({
            where: { id: itemData.batchId },
          });
          if (!batch) {
            throw new Error(`Batch with ID ${itemData.batchId} not found`);
          }
          if (batch.meatId !== itemData.meatId) {
            throw new Error(
              `Batch #${itemData.batchId} does not belong to meat #${itemData.meatId}`,
            );
          }

          const unitPrice = itemData.unitPrice ?? meat.pricePerKg;
          if (unitPrice > maxUnitPrice) {
            throw new Error(
              `Unit price ₱${unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`,
            );
          }

          const subtotal = unitPrice * itemData.weightKg;
          totalAmount += subtotal;

          if (totalAmount > maxTotalAmount) {
            throw new Error(
              `Total amount ₱${totalAmount} exceeds maximum allowed of ₱${maxTotalAmount}`,
            );
          }

          newItems.push({
            weightKg: itemData.weightKg,
            unitPrice: unitPrice,
            subtotal: subtotal,
            reason: itemData.reason || null,
            meat: meat,
            batch: batch,
            returnRefund: existing,
          });
        }

        existing.totalAmount = Math.round(totalAmount * 100) / 100;

        // Save new items
        for (const itemData of newItems) {
          const returnItem = returnItemRepo.create({
            ...itemData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await saveDb(returnItemRepo, returnItem, { queryRunner: qr });
        }
      }

      // ✅ Update other fields
      if (reason !== undefined) existing.reason = reason;
      if (refundMethod !== undefined) existing.refundMethod = refundMethod;

      existing.updatedAt = new Date();

      const saved = await updateDb(returnRepo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("ReturnRefund", id, oldData, saved, user);
      }

      logger.debug(`ReturnRefund updated: #${id}`);

      const fullReturn = await returnRepo.findOne({
        where: { id: saved.id },
        relations: ["sale", "customer", "items", "items.meat", "items.batch"],
      });
      return fullReturn;
    } catch (error) {
      console.error("Failed to update return:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a return (set status to cancelled) – only for pending
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    try {
      const returnRefund = await returnRepo.findOne({ where: { id } });
      if (!returnRefund) {
        throw new Error(`ReturnRefund with ID ${id} not found`);
      }

      if (returnRefund.status === "cancelled") {
        throw new Error(`Return #${id} is already cancelled`);
      }
      if (returnRefund.status === "processed") {
        throw new Error(
          `Cannot cancel a processed return. Use processReturn or cancelReturn methods.`,
        );
      }

      const oldData = { ...returnRefund };
      returnRefund.status = "cancelled";
      returnRefund.updatedAt = new Date();

      const saved = await updateDb(returnRepo, returnRefund, {
        queryRunner: qr,
      });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("ReturnRefund", id, oldData, user);
      }

      logger.debug(`ReturnRefund cancelled: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to cancel return:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a return (hard delete) – only for pending or cancelled
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefund = require("../entities/ReturnRefund");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");

    const returnRepo = this._getRepo(qr, ReturnRefund);
    const returnItemRepo = this._getRepo(qr, ReturnRefundItem);

    const returnRefund = await returnRepo.findOne({
      where: { id },
      relations: ["items"],
    });
    if (!returnRefund) {
      throw new Error(`ReturnRefund with ID ${id} not found`);
    }

    if (returnRefund.status === "processed") {
      throw new Error(
        `Cannot delete a processed return. Use processReturn or cancelReturn methods first.`,
      );
    }

    for (const item of returnRefund.items) {
      await removeDb(returnItemRepo, item, { queryRunner: qr });
    }

    await removeDb(returnRepo, returnRefund, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("ReturnRefund", id, returnRefund, user);
    }

    logger.debug(`ReturnRefund #${id} permanently deleted`);
  }

  // ============================================================
  // 🔄 BUSINESS LOGIC METHODS (Status Transitions + Data Mutation)
  // ============================================================

  /**
   * Process a return (pending → processed) – adds stock back to batches, reverses loyalty points
   *
   * ✅ Uses BatchService for stock operations
   * ✅ Returns metadata for subscriber side effects
   *
   * @param {number} returnId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ return: any, itemsRestocked: number, pointsReversed: number }>}
   */
  async processReturn(returnId, user = "system", qr = null) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefund = require("../entities/ReturnRefund");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const Customer = require("../entities/Customer");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");

    const returnRepo = this._getRepo(qr, ReturnRefund);
    const returnItemRepo = this._getRepo(qr, ReturnRefundItem);
    const customerRepo = this._getRepo(qr, Customer);
    const loyaltyRepo = this._getRepo(qr, LoyaltyTransaction);

    const returnRefund = await returnRepo.findOne({
      where: { id: returnId },
      relations: [
        "sale",
        "sale.customer",
        "items",
        "items.meat",
        "items.batch",
        "customer",
      ],
    });
    if (!returnRefund) {
      throw new Error(`Return #${returnId} not found`);
    }

    if (returnRefund.status !== "pending") {
      throw new Error(
        `Cannot process a return with status "${returnRefund.status}"`,
      );
    }

    logger.info(`[ReturnRefund] Processing return #${returnId}`);

    let itemsRestocked = 0;
    let pointsReversed = 0;

    // ─── STEP 1: Add stock back to batches using BatchService ───
    const restockEnabled = await this._isRestockEnabled(qr);
    if (restockEnabled) {
      for (const item of returnRefund.items) {
        if (item.batch) {
          // ✅ TAMA: Use BatchService (not BatchStateService)
          await batchService.addToBatch(
            item.batch.id,
            item.weightKg,
            "refund",
            {
              saleId: returnRefund.sale?.id,
              notes: `Return #${returnRefund.id} - ${returnRefund.referenceNo}`,
            },
            user,
            qr,
          );
          itemsRestocked++;
        } else {
          logger.warn(
            `[ReturnRefund] Return item #${item.id} has no batch, skipping stock reversal`,
          );
        }
      }
    }

    // ─── STEP 2: Reverse loyalty points from the original sale ───
    if (
      returnRefund.sale &&
      returnRefund.sale.pointsEarn > 0 &&
      returnRefund.sale.customer
    ) {
      const customer = await customerRepo.findOne({
        where: { id: returnRefund.sale.customer.id },
      });
      if (customer) {
        const pointsToDeduct = returnRefund.sale.pointsEarn;
        const oldBalance = customer.loyaltyPointsBalance;
        const oldLifetime = customer.lifetimePointsEarned || 0;

        customer.loyaltyPointsBalance = Math.max(
          0,
          oldBalance - pointsToDeduct,
        );
        customer.lifetimePointsEarned = Math.max(
          0,
          oldLifetime - pointsToDeduct,
        );
        customer.updatedAt = new Date();

        await updateDb(customerRepo, customer, { queryRunner: qr });

        const tx = loyaltyRepo.create({
          pointsChange: -pointsToDeduct,
          transactionType: "refund",
          notes: `Return #${returnRefund.id} - reversed points from sale #${returnRefund.sale.id}`,
          customer: customer,
          sale: returnRefund.sale,
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await saveDb(loyaltyRepo, tx, { queryRunner: qr });

        pointsReversed = pointsToDeduct;

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logUpdate(
            "Customer",
            customer.id,
            { loyaltyPointsBalance: oldBalance },
            { loyaltyPointsBalance: customer.loyaltyPointsBalance },
            user,
          );
          await auditLogger.logCreate("LoyaltyTransaction", tx.id, tx, user);
        }

        logger.info(
          `[ReturnRefund] Reversed ${pointsToDeduct} loyalty points for customer #${customer.id}`,
        );
      }
    }

    // ─── STEP 3: Update return status to processed ───
    const oldStatus = returnRefund.status;
    returnRefund.status = "processed";
    returnRefund.updatedAt = new Date();

    const processedReturn = await updateDb(returnRepo, returnRefund, {
      queryRunner: qr,
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "ReturnRefund",
        returnId,
        { status: oldStatus },
        { status: "processed" },
        user,
      );
    }

    logger.info(
      `[ReturnRefund] Return #${returnId} processed successfully (${itemsRestocked} items restocked, ${pointsReversed} points reversed)`,
    );

    // ✅ Return metadata for subscriber side effects
    return {
      return: processedReturn,
      itemsRestocked,
      pointsReversed,
    };
  }

  /**
   * Cancel a return – if already processed, reverse the stock additions and loyalty reversal
   *
   * ✅ Uses BatchService for stock operations
   * ✅ Returns metadata for subscriber side effects
   *
   * @param {number} returnId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<{ return: any, wasProcessed: boolean, itemsRestockedReversed: number, pointsRestored: number }>}
   */
  async cancelReturn(returnId, reason = "", user = "system", qr = null) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefund = require("../entities/ReturnRefund");
    const Customer = require("../entities/Customer");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");

    const returnRepo = this._getRepo(qr, ReturnRefund);
    const customerRepo = this._getRepo(qr, Customer);
    const loyaltyRepo = this._getRepo(qr, LoyaltyTransaction);

    // ✅ Validate reason
    const validated = validate(
      z.object({ reason: z.string().max(500).optional() }),
      { reason },
      'Cancel reason'
    );

    const returnRefund = await returnRepo.findOne({
      where: { id: returnId },
      relations: ["sale", "sale.customer", "items", "items.meat", "items.batch", "customer"],
    });
    if (!returnRefund) {
      throw new Error(`Return #${returnId} not found`);
    }

    if (returnRefund.status === "cancelled") {
      throw new Error(`Return #${returnId} is already cancelled`);
    }

    let wasProcessed = false;
    let itemsRestockedReversed = 0;
    let pointsRestored = 0;

    if (returnRefund.status === "pending") {
      returnRefund.status = "cancelled";
      returnRefund.notes = returnRefund.notes
        ? `${returnRefund.notes}\nCancelled: ${validated.reason}`
        : `Cancelled: ${validated.reason}`;
      returnRefund.updatedAt = new Date();

      const cancelled = await updateDb(returnRepo, returnRefund, {
        queryRunner: qr,
      });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("ReturnRefund", returnId, { status: "pending" }, { status: "cancelled" }, user);
      }

      logger.info(`[ReturnRefund] Return #${returnId} cancelled (was pending)`);
      return {
        return: cancelled,
        wasProcessed: false,
        itemsRestockedReversed: 0,
        pointsRestored: 0,
      };
    }

    if (returnRefund.status === "processed") {
      wasProcessed = true;

      // ─── Reverse the stock additions using BatchService ───
      logger.info(
        `[ReturnRefund] Cancelling processed return #${returnId} – reversing stock`,
      );

      for (const item of returnRefund.items) {
        if (item.batch) {
          // ✅ TAMA: Use BatchService (not BatchStateService)
          await batchService.deductFromBatch(
            item.batch.id,
            item.weightKg,
            "adjustment",
            {
              saleId: returnRefund.sale?.id,
              notes: `Cancellation of return #${returnRefund.id} - ${returnRefund.referenceNo}`,
            },
            user,
            qr,
          );
          itemsRestockedReversed++;
        } else {
          logger.warn(
            `[ReturnRefund] Return item #${item.id} has no batch, skipping stock reversal`,
          );
        }
      }

      // ─── Reverse loyalty reversal (add back points) ───
      if (
        returnRefund.sale &&
        returnRefund.sale.pointsEarn > 0 &&
        returnRefund.sale.customer
      ) {
        const customer = await customerRepo.findOne({
          where: { id: returnRefund.sale.customer.id },
        });
        if (customer) {
          const pointsToAdd = returnRefund.sale.pointsEarn;
          const oldBalance = customer.loyaltyPointsBalance;
          const oldLifetime = customer.lifetimePointsEarned || 0;

          customer.loyaltyPointsBalance += pointsToAdd;
          customer.lifetimePointsEarned = oldLifetime + pointsToAdd;
          customer.updatedAt = new Date();

          await updateDb(customerRepo, customer, { queryRunner: qr });

          const tx = loyaltyRepo.create({
            pointsChange: pointsToAdd,
            transactionType: "earn",
            notes: `Reversal of return cancellation #${returnRefund.id} - restored points from sale #${returnRefund.sale.id}`,
            customer: customer,
            sale: returnRefund.sale,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await saveDb(loyaltyRepo, tx, { queryRunner: qr });

          pointsRestored = pointsToAdd;

          const auditEnabled = await this._isAuditEnabled(qr);
          if (auditEnabled) {
            await auditLogger.logUpdate(
              "Customer",
              customer.id,
              { loyaltyPointsBalance: oldBalance },
              { loyaltyPointsBalance: customer.loyaltyPointsBalance },
              user,
            );
            await auditLogger.logCreate("LoyaltyTransaction", tx.id, tx, user);
          }

          logger.info(
            `[ReturnRefund] Restored ${pointsToAdd} loyalty points for customer #${customer.id}`,
          );
        }
      }

      // ─── Update status to cancelled ───
      returnRefund.status = "cancelled";
      returnRefund.notes = returnRefund.notes
        ? `${returnRefund.notes}\nCancelled: ${validated.reason} (was processed)`
        : `Cancelled: ${validated.reason} (was processed)`;
      returnRefund.updatedAt = new Date();

      const cancelled = await updateDb(returnRepo, returnRefund, {
        queryRunner: qr,
      });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate(
          "ReturnRefund",
          returnId,
          { status: "processed" },
          { status: "cancelled" },
          user,
        );
      }

      logger.info(
        `[ReturnRefund] Return #${returnId} cancelled (was processed, stock reversed)`,
      );

      // ✅ Return metadata for subscriber side effects
      return {
        return: cancelled,
        wasProcessed: true,
        itemsRestockedReversed,
        pointsRestored,
      };
    }

    throw new Error(`Unexpected return status: ${returnRefund.status}`);
  }

  // ============================================================
  // 📤 BULK & IMPORT OPERATIONS
  // ============================================================

  /**
   * Bulk create returns
   * @param {Array<Object>} returnsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(returnsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of returnsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ return: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import returns from CSV file
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
        let items = [];
        if (record.items) {
          items = JSON.parse(record.items);
        }
        const data = {
          saleId: parseInt(record.saleId, 10),
          customerId: parseInt(record.customerId, 10),
          reason: record.reason || null,
          refundMethod: record.refundMethod,
          items: items,
          referenceNo: record.referenceNo || null,
        };
        if (
          !data.saleId ||
          !data.customerId ||
          !data.refundMethod ||
          !data.items ||
          data.items.length === 0
        ) {
          throw new Error(
            "saleId, customerId, refundMethod, and at least one item are required",
          );
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
   * Generate a unique reference number
   * @param {import("typeorm").Repository<any>} repo
   * @param {string} prefix - Optional prefix (defaults to "RET")
   * @returns {Promise<string>}
   */
  async generateReference(repo, prefix = "RET") {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    let ref = `${prefix}-${datePart}-${randomPart}`;

    let attempts = 0;
    let existing = await repo.findOne({ where: { referenceNo: ref } });
    while (existing && attempts < 5) {
      const newRandom = Math.floor(1000 + Math.random() * 9000);
      ref = `${prefix}-${datePart}-${newRandom}`;
      existing = await repo.findOne({ where: { referenceNo: ref } });
      attempts++;
    }
    if (existing) {
      ref = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    return ref;
  }

  // ============================================================
  // 🧹 CLEANUP & HELPERS
  // ============================================================

  /**
   * Clean up old returns (archive - placeholder)
   * @param {number} daysOld
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldReturns(daysOld = null, user = "system", qr = null) {
    if (daysOld === null) {
      daysOld = await this._getRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    logger.info(
      `[ReturnRefund] cleanOldReturns called with ${daysOld} days (cutoff: ${cutoffDate.toISOString()})`,
    );
    return { count: 0 };
  }

  /**
   * Get return health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    const byStatus = await returnRepo
      .createQueryBuilder("return")
      .select("return.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("return.status")
      .getRawMany();

    const statusCounts = byStatus.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const pending = statusCounts.pending || 0;
    const processed = statusCounts.processed || 0;
    const cancelled = statusCounts.cancelled || 0;

    const totalRefundedResult = await returnRepo
      .createQueryBuilder("return")
      .select("SUM(return.totalAmount)", "total")
      .where("return.status = 'processed'")
      .getRawOne();
    const totalRefunded = parseFloat(totalRefundedResult.total) || 0;

    const avgResult = await returnRepo
      .createQueryBuilder("return")
      .select("AVG(return.totalAmount)", "avg")
      .where("return.status = 'processed'")
      .getRawOne();
    const averageRefund = parseFloat(avgResult.avg) || 0;

    const processingRate =
      total > 0 ? Math.round((processed / total) * 100) : 0;

    const refundsEnabled = await this._isRefundsEnabled(qr);
    const refundWindowDays = await this._getRefundWindowDays(qr);
    const allowedStatuses = await this._getAllowedStatuses(qr);

    return {
      total,
      byStatus: statusCounts,
      pending,
      processed,
      cancelled,
      totalRefunded,
      averageRefund,
      processingRate,
      refundsEnabled,
      refundWindowDays,
      allowedStatuses,
    };
  }

  /**
   * Get refund retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getRetentionDays(qr);
    const auditEnabled = await this._isAuditEnabled(qr);
    const refundsEnabled = await this._isRefundsEnabled(qr);
    const refundWindowDays = await this._getRefundWindowDays(qr);

    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalReturns = await returnRepo.count();
    const oldReturns = await returnRepo
      .createQueryBuilder("return")
      .where("return.status = 'processed'")
      .andWhere("return.createdAt < :cutoffDate", { cutoffDate })
      .getCount();

    const allowedStatuses = await this._getAllowedStatuses(qr);

    return {
      refundsEnabled,
      refundWindowDays,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalReturns,
      returnsToArchive: oldReturns,
      allowedStatuses,
      auditEnabled,
    };
  }

  /**
   * Get refund summary by customer
   * @param {number} customerId
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRefundSummaryByCustomer(customerId, qr = null) {
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    const refunds = await returnRepo
      .createQueryBuilder("return")
      .where("return.customerId = :customerId", { customerId })
      .orderBy("return.createdAt", "DESC")
      .getMany();

    const summary = {
      customerId,
      totalRefunds: refunds.length,
      totalAmount: 0,
      pending: 0,
      processed: 0,
      cancelled: 0,
      byStatus: {},
      refunds: refunds.slice(0, 20),
    };

    for (const refund of refunds) {
      summary.totalAmount += refund.totalAmount;
      summary.byStatus[refund.status] =
        (summary.byStatus[refund.status] || 0) + 1;

      if (refund.status === "pending") summary.pending++;
      if (refund.status === "processed") summary.processed++;
      if (refund.status === "cancelled") summary.cancelled++;
    }

    return summary;
  }

  /**
   * Bulk update returns
   * @param {Array<{ id: number, updates: Object }>} updatesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkUpdate(updatesArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        // Handle status-specific updates
        if (updates.status) {
          switch (updates.status) {
            case "processed":
              await this.processReturn(id, user, qr);
              break;
            case "cancelled":
              await this.cancelReturn(id, updates.reason || "", user, qr);
              break;
            default:
              await this.update(id, updates, user, qr);
          }
        } else {
          await this.update(id, updates, user, qr);
        }
        results.updated.push({ id, status: "success" });
      } catch (err) {
        results.errors.push({ id, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const returnRefundService = new ReturnRefundService();
module.exports = returnRefundService;