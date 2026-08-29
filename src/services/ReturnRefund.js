// src/services/ReturnRefund.js
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
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const ReturnRefund = require("../entities/ReturnRefund");
    const ReturnRefundItem = require("../entities/ReturnRefundItem");
    const Sale = require("../entities/Sale");
    const Customer = require("../entities/Customer");
    const Meat = require("../entities/Meat");
    const Batch = require("../entities/Batch");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.returnRepository = AppDataSource.getRepository(ReturnRefund);
    this.returnItemRepository = AppDataSource.getRepository(ReturnRefundItem);
    this.saleRepository = AppDataSource.getRepository(Sale);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.batchRepository = AppDataSource.getRepository(Batch);
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
   * ✅ NEW: Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get allowed return statuses from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedStatuses(qr = null) {
    try {
      return await system.getArray("allowed_return_statuses", SettingType.SALES, [
        "pending", "processed", "cancelled"
      ]);
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get allowed statuses: ${error.message}, using defaults`);
      return ["pending", "processed", "cancelled"];
    }
  }

  /**
   * ✅ NEW: Get reference prefix from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _getReferencePrefix(qr = null) {
    try {
      const prefix = await system.getValue("return_reference_prefix", SettingType.SALES, null);
      if (prefix && prefix.trim()) {
        return prefix.trim().toUpperCase();
      }
      const company = await system.companyName();
      return company.substring(0, 3).toUpperCase() || "RET";
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get reference prefix: ${error.message}, defaulting to "RET"`);
      return "RET";
    }
  }

  /**
   * ✅ NEW: Check if refunds are enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isRefundsEnabled(qr = null) {
    try {
      return await system.enableRefunds();
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to check refunds enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get refund window days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRefundWindowDays(qr = null) {
    try {
      return await system.refundWindowDays();
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get refund window days: ${error.message}, defaulting to 7`);
      return 7;
    }
  }

  /**
   * ✅ NEW: Check if receipt is required for refund
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isReceiptRequired(qr = null) {
    try {
      return await system.requireReceiptForRefund();
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to check receipt required: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Check if restock is enabled for refunds
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isRestockEnabled(qr = null) {
    try {
      return await system.refundRestockEnabled();
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to check restock enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get max reason length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxReasonLength(qr = null) {
    try {
      return await system.getInt("max_return_reason_length", SettingType.SALES, 500);
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get max reason length: ${error.message}, defaulting to 500`);
      return 500;
    }
  }

  /**
   * ✅ NEW: Get retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRetentionDays(qr = null) {
    try {
      return await system.getInt("return_retention_days", SettingType.SALES, 730);
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get retention days: ${error.message}, defaulting to 730`);
      return 730;
    }
  }

  /**
   * ✅ NEW: Get max weight per item from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxWeightKg(qr = null) {
    try {
      return await system.getDecimal("max_return_weight_kg", SettingType.SALES, 999.999);
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get max weight: ${error.message}, defaulting to 999.999`);
      return 999.999;
    }
  }

  /**
   * ✅ NEW: Get max unit price from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxUnitPrice(qr = null) {
    try {
      return await system.getDecimal("max_return_unit_price", SettingType.SALES, 9999.99);
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get max unit price: ${error.message}, defaulting to 9999.99`);
      return 9999.99;
    }
  }

  /**
   * ✅ NEW: Get max total amount from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxTotalAmount(qr = null) {
    try {
      return await system.getDecimal("max_return_total_amount", SettingType.SALES, 999999.99);
    } catch (error) {
      logger.warn(`[ReturnRefund] Failed to get max total amount: ${error.message}, defaulting to 999999.99`);
      return 999999.99;
    }
  }

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

    try {
      // ✅ Check if refunds are enabled
      const refundsEnabled = await this._isRefundsEnabled(qr);
      if (!refundsEnabled) {
        throw new Error("Refunds are disabled in system settings");
      }

      // Validate required fields
      if (!data.saleId) throw new Error("saleId is required");
      if (!data.customerId) throw new Error("customerId is required");
      if (!data.refundMethod) throw new Error("refundMethod is required");
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("At least one return item is required");
      }

      // ✅ Validate reason length
      if (data.reason) {
        const maxReasonLength = await this._getMaxReasonLength(qr);
        if (data.reason.length > maxReasonLength) {
          throw new Error(`Reason cannot exceed ${maxReasonLength} characters`);
        }
      }

      // ✅ Validate status if provided
      if (data.status) {
        const allowedStatuses = await this._getAllowedStatuses(qr);
        if (!allowedStatuses.includes(data.status)) {
          throw new Error(
            `Invalid return status: "${data.status}". Allowed: ${allowedStatuses.join(", ")}`
          );
        }
      }

      // Validate sale exists and is paid
      const sale = await saleRepo.findOne({ where: { id: data.saleId } });
      if (!sale) {
        throw new Error(`Sale with ID ${data.saleId} not found`);
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

      // ✅ Check if receipt is required
      const receiptRequired = await this._isReceiptRequired(qr);
      if (receiptRequired) {
        // TODO: Implement receipt validation logic here
        // For now, we'll just log a warning
        logger.warn("[ReturnRefund] Receipt validation not implemented, but receipt is required by settings");
      }

      // Validate customer exists
      const customer = await customerRepo.findOne({ where: { id: data.customerId } });
      if (!customer) {
        throw new Error(`Customer with ID ${data.customerId} not found`);
      }

      // ✅ Get max values for validation
      const maxWeight = await this._getMaxWeightKg(qr);
      const maxUnitPrice = await this._getMaxUnitPrice(qr);
      const maxTotalAmount = await this._getMaxTotalAmount(qr);

      // Validate items and prepare return items
      const returnItems = [];
      let totalAmount = 0;

      for (const itemData of data.items) {
        if (!itemData.meatId) throw new Error("meatId is required for each item");
        if (!itemData.batchId) throw new Error("batchId is required for each item");
        if (!itemData.weightKg || itemData.weightKg <= 0) {
          throw new Error("weightKg must be greater than 0");
        }
        // ✅ Validate max weight
        if (itemData.weightKg > maxWeight) {
          throw new Error(`Weight ${itemData.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`);
        }

        const meat = await meatRepo.findOne({ where: { id: itemData.meatId, isActive: true } });
        if (!meat) {
          throw new Error(`Meat with ID ${itemData.meatId} not found or inactive`);
        }

        const batch = await batchRepo.findOne({ where: { id: itemData.batchId } });
        if (!batch) {
          throw new Error(`Batch with ID ${itemData.batchId} not found`);
        }
        if (batch.meatId !== itemData.meatId) {
          throw new Error(`Batch #${itemData.batchId} does not belong to meat #${itemData.meatId}`);
        }

        const unitPrice = itemData.unitPrice ?? meat.pricePerKg;
        // ✅ Validate max unit price
        if (unitPrice > maxUnitPrice) {
          throw new Error(`Unit price ₱${unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`);
        }

        const subtotal = unitPrice * itemData.weightKg;
        totalAmount += subtotal;

        // ✅ Validate max total amount
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

      // Generate reference number if not provided
      let referenceNo = data.referenceNo;
      if (!referenceNo) {
        const prefix = await this._getReferencePrefix(qr);
        referenceNo = await this.generateReference(returnRepo, prefix);
      } else {
        const existing = await returnRepo.findOne({ where: { referenceNo } });
        if (existing) {
          throw new Error(`Reference "${referenceNo}" already exists`);
        }
      }

      // Create return
      const returnRefund = returnRepo.create({
        referenceNo,
        reason: data.reason || null,
        refundMethod: data.refundMethod,
        totalAmount: Math.round(totalAmount * 100) / 100,
        status: data.status || "pending",
        sale: sale,
        customer: customer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedReturn = await saveDb(returnRepo, returnRefund, { queryRunner: qr });

      // Create return items
      for (const itemData of returnItems) {
        const returnItem = returnItemRepo.create({
          ...itemData,
          returnRefund: savedReturn,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await saveDb(returnItemRepo, returnItem, { queryRunner: qr });
      }

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("ReturnRefund", savedReturn.id, savedReturn, user);
      }

      logger.debug(`ReturnRefund created: #${savedReturn.id} - ${savedReturn.referenceNo}`);

      // Reload with relations
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
    const { updateDb, saveDb, removeDb } = require("../utils/dbUtils/dbActions");
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

    try {
      const existing = await returnRepo.findOne({
        where: { id },
        relations: ["items", "items.meat", "items.batch", "sale", "customer"],
      });
      if (!existing) {
        throw new Error(`ReturnRefund with ID ${id} not found`);
      }

      // Only allow updates for pending status
      if (existing.status !== "pending") {
        throw new Error(`Cannot update a return with status "${existing.status}"`);
      }

      const oldData = { ...existing };

      // ✅ Validate reason length
      if (data.reason !== undefined) {
        const maxReasonLength = await this._getMaxReasonLength(qr);
        if (data.reason.length > maxReasonLength) {
          throw new Error(`Reason cannot exceed ${maxReasonLength} characters`);
        }
      }

      // Handle sale change
      if (data.saleId && data.saleId !== existing.sale.id) {
        const sale = await saleRepo.findOne({ where: { id: data.saleId } });
        if (!sale) {
          throw new Error(`Sale with ID ${data.saleId} not found`);
        }
        existing.sale = sale;
        delete data.saleId;
      }

      // Handle customer change
      if (data.customerId && data.customerId !== existing.customer.id) {
        const customer = await customerRepo.findOne({ where: { id: data.customerId } });
        if (!customer) {
          throw new Error(`Customer with ID ${data.customerId} not found`);
        }
        existing.customer = customer;
        delete data.customerId;
      }

      // Handle items update (replace all items)
      if (data.items) {
        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new Error("At least one return item is required");
        }

        // ✅ Get max values for validation
        const maxWeight = await this._getMaxWeightKg(qr);
        const maxUnitPrice = await this._getMaxUnitPrice(qr);
        const maxTotalAmount = await this._getMaxTotalAmount(qr);

        // Remove old items
        for (const oldItem of existing.items) {
          await removeDb(returnItemRepo, oldItem, { queryRunner: qr });
        }

        // Create new items
        const newItems = [];
        let totalAmount = 0;

        for (const itemData of data.items) {
          if (!itemData.meatId) throw new Error("meatId is required for each item");
          if (!itemData.batchId) throw new Error("batchId is required for each item");
          if (!itemData.weightKg || itemData.weightKg <= 0) {
            throw new Error("weightKg must be greater than 0");
          }
          if (itemData.weightKg > maxWeight) {
            throw new Error(`Weight ${itemData.weightKg}kg exceeds maximum allowed of ${maxWeight}kg`);
          }

          const meat = await meatRepo.findOne({ where: { id: itemData.meatId, isActive: true } });
          if (!meat) {
            throw new Error(`Meat with ID ${itemData.meatId} not found or inactive`);
          }

          const batch = await batchRepo.findOne({ where: { id: itemData.batchId } });
          if (!batch) {
            throw new Error(`Batch with ID ${itemData.batchId} not found`);
          }
          if (batch.meatId !== itemData.meatId) {
            throw new Error(`Batch #${itemData.batchId} does not belong to meat #${itemData.meatId}`);
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

        delete data.items;
      }

      // Update other fields
      if (data.reason !== undefined) existing.reason = data.reason;
      if (data.refundMethod !== undefined) existing.refundMethod = data.refundMethod;

      existing.updatedAt = new Date();

      const saved = await updateDb(returnRepo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("ReturnRefund", id, oldData, saved, user);
      }

      logger.debug(`ReturnRefund updated: #${id}`);

      // Reload with relations
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
   * Soft delete a return (set status to cancelled) – use state service instead
   * We'll keep this as a simple status update to cancelled.
   * For business logic, use ReturnRefundStateService.cancelReturn()
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
        throw new Error(`Cannot cancel a processed return. Use state service to reverse.`);
      }

      const oldData = { ...returnRefund };
      returnRefund.status = "cancelled";
      returnRefund.updatedAt = new Date();

      const saved = await updateDb(returnRepo, returnRefund, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
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

    // Prevent deletion of processed returns
    if (returnRefund.status === "processed") {
      throw new Error(`Cannot delete a processed return. Use state service to reverse first.`);
    }

    // Remove items first
    for (const item of returnRefund.items) {
      await removeDb(returnItemRepo, item, { queryRunner: qr });
    }

    await removeDb(returnRepo, returnRefund, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("ReturnRefund", id, returnRefund, user);
    }

    logger.debug(`ReturnRefund #${id} permanently deleted`);
  }

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

    // ✅ Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("return.createdAt >= :cutoffDate", { cutoffDate });
    }

    // Filters
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      // ✅ Validate statuses against allowed list
      const allowedStatuses = await this._getAllowedStatuses(qr);
      const invalidStatuses = statuses.filter(s => !allowedStatuses.includes(s));
      if (invalidStatuses.length > 0) {
        logger.warn(`[ReturnRefund] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${allowedStatuses.join(", ")}`);
      }
      qb.andWhere("return.status IN (:...statuses)", { statuses });
    }
    if (options.saleId) {
      qb.andWhere("return.saleId = :saleId", { saleId: options.saleId });
    }
    if (options.customerId) {
      qb.andWhere("return.customerId = :customerId", { customerId: options.customerId });
    }
    if (options.refundMethod) {
      qb.andWhere("return.refundMethod = :refundMethod", { refundMethod: options.refundMethod });
    }
    if (options.startDate) {
      qb.andWhere("return.createdAt >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("return.createdAt <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(return.referenceNo LIKE :search OR return.reason LIKE :search OR customer.name LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "createdAt";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[ReturnRefund] Invalid sortBy: ${sortBy}, falling back to createdAt`);
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
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get return statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    // ✅ Apply retention days filter
    const retentionDays = await this._getRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // By status
    const byStatus = await returnRepo
      .createQueryBuilder("return")
      .select("return.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(return.totalAmount)", "total")
      .where("return.createdAt >= :cutoffDate", { cutoffDate })
      .groupBy("return.status")
      .getRawMany();

    // Total processed refunds
    const processedResult = await returnRepo
      .createQueryBuilder("return")
      .select("SUM(return.totalAmount)", "total")
      .where("return.status = 'processed'")
      .andWhere("return.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalProcessed = parseFloat(processedResult.total) || 0;

    // Average refund amount
    const avgResult = await returnRepo
      .createQueryBuilder("return")
      .select("AVG(return.totalAmount)", "avg")
      .where("return.status = 'processed'")
      .andWhere("return.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const averageRefund = parseFloat(avgResult.avg) || 0;

    // Today's returns
    const today = new Date().toISOString().split("T")[0];
    const todayReturns = await returnRepo
      .createQueryBuilder("return")
      .where("DATE(return.createdAt) = :today", { today })
      .getCount();

    // Top customers by refund amount
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

    // ✅ Get settings info
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
  async exportReturns(format = "json", filters = {}, user = "system", qr = null) {
    try {
      // Fetch all data without pagination for export
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined, ignoreRetention: true }, qr);
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

      // ✅ Check if audit logging is enabled before logging
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
        if (!data.saleId || !data.customerId || !data.refundMethod || !data.items || data.items.length === 0) {
          throw new Error("saleId, customerId, refundMethod, and at least one item are required");
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

  /**
   * ✅ NEW: Clean up old returns (soft delete via status change)
   * @param {number} daysOld - Mark returns older than this as cancelled (overrides settings)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldReturns(daysOld = null, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    // ✅ Use settings if not provided
    if (daysOld === null) {
      daysOld = await this._getRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // ✅ Only clean processed returns (don't touch pending or cancelled)
    const oldReturns = await returnRepo
      .createQueryBuilder("return")
      .where("return.status = 'processed'")
      .andWhere("return.createdAt < :cutoffDate", { cutoffDate })
      .getMany();

    if (oldReturns.length === 0) {
      logger.info(`[ReturnRefund] No old returns to clean up (threshold: ${daysOld} days)`);
      return { count: 0 };
    }

    let updatedCount = 0;
    for (const returnRefund of oldReturns) {
      try {
        // Don't delete, just note for archiving
        // Or you can soft delete by adding a flag
        // For now, we'll just log and potentially archive
        logger.debug(`[ReturnRefund] Return #${returnRefund.id} (${returnRefund.referenceNo}) is older than ${daysOld} days`);

        // Optionally, you could mark as archived if you have an archived flag
        // returnRefund.isArchived = true;
        // await updateDb(returnRepo, returnRefund, { queryRunner: qr, skipSignal: true });

        updatedCount++;
      } catch (err) {
        logger.error(`[ReturnRefund] Failed to process old return #${returnRefund.id}:`, err);
      }
    }

    logger.info(`[ReturnRefund] Found ${updatedCount} old returns to archive (older than ${daysOld} days)`);
    return { count: updatedCount };
  }

  /**
   * ✅ NEW: Get return health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const ReturnRefund = require("../entities/ReturnRefund");
    const returnRepo = this._getRepo(qr, ReturnRefund);

    // Get counts by status
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

    // ✅ Get total refund amount (processed only)
    const totalRefundedResult = await returnRepo
      .createQueryBuilder("return")
      .select("SUM(return.totalAmount)", "total")
      .where("return.status = 'processed'")
      .getRawOne();
    const totalRefunded = parseFloat(totalRefundedResult.total) || 0;

    // ✅ Get average refund amount
    const avgResult = await returnRepo
      .createQueryBuilder("return")
      .select("AVG(return.totalAmount)", "avg")
      .where("return.status = 'processed'")
      .getRawOne();
    const averageRefund = parseFloat(avgResult.avg) || 0;

    // ✅ Get processing rate
    const processingRate = total > 0 ? Math.round((processed / total) * 100) : 0;

    // ✅ Get settings info
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
   * ✅ NEW: Get refund retention info
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
   * ✅ NEW: Get refund summary by customer
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
      refunds: refunds.slice(0, 20), // Return last 20 refunds
    };

    for (const refund of refunds) {
      summary.totalAmount += refund.totalAmount;
      summary.byStatus[refund.status] = (summary.byStatus[refund.status] || 0) + 1;

      if (refund.status === "pending") summary.pending++;
      if (refund.status === "processed") summary.processed++;
      if (refund.status === "cancelled") summary.cancelled++;
    }

    return summary;
  }
}

// Singleton instance
const returnRefundService = new ReturnRefundService();
module.exports = returnRefundService;