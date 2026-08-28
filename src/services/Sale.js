// src/services/SaleService.js
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
  "timestamp",
  "status",
  "paymentMethod",
  "totalAmount",
  "usedLoyalty",
  "loyaltyRedeemed",
  "usedDiscount",
  "totalDiscount",
  "usedVoucher",
  "voucherCode",
  "pointsEarn",
  "notes",
  "createdAt",
  "updatedAt",
]);

class SaleService {
  constructor() {
    this.saleRepository = null;
    this.saleItemRepository = null;
    this.meatRepository = null;
    this.customerRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Sale = require("../entities/Sale");
    const SaleItem = require("../entities/SaleItem");
    const Meat = require("../entities/Meat");
    const Customer = require("../entities/Customer");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.saleRepository = AppDataSource.getRepository(Sale);
    this.saleItemRepository = AppDataSource.getRepository(SaleItem);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.customerRepository = AppDataSource.getRepository(Customer);
    logger.debug("SaleService initialized");
  }

  async getRepositories() {
    if (!this.saleRepository) {
      await this.initialize();
    }
    return {
      sale: this.saleRepository,
      saleItem: this.saleItemRepository,
      meat: this.meatRepository,
      customer: this.customerRepository,
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
      `[Sale._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Sale._getRepo] Using global repository (fallback)`);
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
      logger.warn(`[Sale] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get allowed sale statuses from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedStatuses(qr = null) {
    try {
      return await system.getArray("allowed_sale_statuses", SettingType.SALES, [
        "initiated", "paid", "refunded", "voided"
      ]);
    } catch (error) {
      logger.warn(`[Sale] Failed to get allowed statuses: ${error.message}, using defaults`);
      return ["initiated", "paid", "refunded", "voided"];
    }
  }

  /**
   * ✅ NEW: Get enabled payment methods
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getEnabledPaymentMethods(qr = null) {
    try {
      const methods = [];
      if (await system.enableCashPayment()) methods.push("cash");
      if (await system.enableCardPayment()) methods.push("card");
      if (await system.enableWalletPayment()) methods.push("wallet");
      return methods;
    } catch (error) {
      logger.warn(`[Sale] Failed to get enabled payment methods: ${error.message}, defaulting to ["cash"]`);
      return ["cash"];
    }
  }

  /**
   * ✅ NEW: Get default payment method
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _getDefaultPaymentMethod(qr = null) {
    try {
      const defaultMethod = await system.defaultPaymentMethod();
      const enabledMethods = await this._getEnabledPaymentMethods(qr);
      if (!enabledMethods.includes(defaultMethod)) {
        logger.warn(`[Sale] Default payment method "${defaultMethod}" is not enabled, defaulting to "${enabledMethods[0]}"`);
        return enabledMethods[0] || "cash";
      }
      return defaultMethod;
    } catch (error) {
      logger.warn(`[Sale] Failed to get default payment method: ${error.message}, defaulting to "cash"`);
      return "cash";
    }
  }

  /**
   * ✅ NEW: Get max discount percent from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxDiscountPercent(qr = null) {
    try {
      return await system.maxDiscountPercent();
    } catch (error) {
      logger.warn(`[Sale] Failed to get max discount percent: ${error.message}, defaulting to 20`);
      return 20;
    }
  }

  /**
   * ✅ NEW: Check if discounts are enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isDiscountsEnabled(qr = null) {
    try {
      return await system.enableDiscounts();
    } catch (error) {
      logger.warn(`[Sale] Failed to check discounts enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get tax rate from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getTaxRate(qr = null) {
    try {
      return await system.taxRate();
    } catch (error) {
      logger.warn(`[Sale] Failed to get tax rate: ${error.message}, defaulting to 0`);
      return 0;
    }
  }

  /**
   * ✅ NEW: Get max notes length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxNotesLength(qr = null) {
    try {
      return await system.getInt("max_sale_notes_length", SettingType.SALES, 500);
    } catch (error) {
      logger.warn(`[Sale] Failed to get max notes length: ${error.message}, defaulting to 500`);
      return 500;
    }
  }

  /**
   * ✅ NEW: Get sale retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRetentionDays(qr = null) {
    try {
      return await system.getInt("sale_retention_days", SettingType.SALES, 730);
    } catch (error) {
      logger.warn(`[Sale] Failed to get retention days: ${error.message}, defaulting to 730`);
      return 730;
    }
  }

  /**
   * ✅ NEW: Get loyalty enabled from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isLoyaltyEnabled(qr = null) {
    try {
      return await system.loyaltyPointsEnabled();
    } catch (error) {
      logger.warn(`[Sale] Failed to check loyalty enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get loyalty point rate from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getLoyaltyPointRate(qr = null) {
    try {
      return await system.getLoyaltyPointRate();
    } catch (error) {
      logger.warn(`[Sale] Failed to get loyalty point rate: ${error.message}, defaulting to 100`);
      return 100;
    }
  }

  /**
   * Create a new sale (initiated status)
   * @param {Object} data - { items, customerId?, paymentMethod?, notes?, loyaltyRedeemed?, voucherCode? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Sale = require("../entities/Sale");
    const SaleItem = require("../entities/SaleItem");
    const Meat = require("../entities/Meat");
    const Customer = require("../entities/Customer");

    const saleRepo = this._getRepo(qr, Sale);
    const saleItemRepo = this._getRepo(qr, SaleItem);
    const meatRepo = this._getRepo(qr, Meat);
    const customerRepo = this._getRepo(qr, Customer);

    try {
      // Validate required fields
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("At least one item is required");
      }

      // ✅ Get settings
      const enabledPaymentMethods = await this._getEnabledPaymentMethods(qr);
      const defaultPaymentMethod = await this._getDefaultPaymentMethod(qr);
      const maxDiscountPercent = await this._getMaxDiscountPercent(qr);
      const discountsEnabled = await this._isDiscountsEnabled(qr);
      const taxRate = await this._getTaxRate(qr);
      const maxNotesLength = await this._getMaxNotesLength(qr);
      const loyaltyEnabled = await this._isLoyaltyEnabled(qr);
      const loyaltyPointRate = await this._getLoyaltyPointRate(qr);

      // ✅ Validate payment method
      let paymentMethod = data.paymentMethod || defaultPaymentMethod;
      if (!enabledPaymentMethods.includes(paymentMethod)) {
        throw new Error(
          `Payment method "${paymentMethod}" is not enabled. Enabled: ${enabledPaymentMethods.join(", ")}`
        );
      }

      // ✅ Validate notes length
      if (data.notes && data.notes.length > maxNotesLength) {
        throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
      }

      // ✅ Validate status if provided
      if (data.status) {
        const allowedStatuses = await this._getAllowedStatuses(qr);
        if (!allowedStatuses.includes(data.status)) {
          throw new Error(
            `Invalid sale status: "${data.status}". Allowed: ${allowedStatuses.join(", ")}`
          );
        }
      }

      // Validate customer if provided
      let customer = null;
      if (data.customerId) {
        customer = await customerRepo.findOne({ where: { id: data.customerId } });
        if (!customer) {
          throw new Error(`Customer with ID ${data.customerId} not found`);
        }
      }

      // Validate items and prepare sale items
      const saleItems = [];
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      for (const itemData of data.items) {
        if (!itemData.meatId) throw new Error("meatId is required for each item");
        if (!itemData.weightKg || itemData.weightKg <= 0) {
          throw new Error("weightKg must be greater than 0");
        }

        const meat = await meatRepo.findOne({ where: { id: itemData.meatId, isActive: true } });
        if (!meat) {
          throw new Error(`Meat with ID ${itemData.meatId} not found or inactive`);
        }

        const unitPrice = itemData.unitPrice ?? meat.pricePerKg;
        const discount = itemData.discount ?? 0;

        // ✅ Validate discount if discounts are enabled
        if (discount > 0) {
          if (!discountsEnabled) {
            throw new Error("Discounts are disabled in system settings");
          }
          // ✅ Validate discount percent
          const discountPercent = (discount / (unitPrice * itemData.weightKg)) * 100;
          if (discountPercent > maxDiscountPercent) {
            throw new Error(
              `Discount ${discountPercent.toFixed(1)}% exceeds maximum allowed of ${maxDiscountPercent}%`
            );
          }
        }

        const tax = itemData.tax ?? 0;
        const lineTotal = (unitPrice * itemData.weightKg) - discount + tax;

        subtotal += unitPrice * itemData.weightKg;
        totalDiscount += discount;
        totalTax += tax;

        saleItems.push({
          weightKg: itemData.weightKg,
          unitPrice: unitPrice,
          discount: discount,
          tax: tax,
          lineTotal: lineTotal,
          meat: meat,
          // batch will be assigned later by state service
        });
      }

      // Determine if loyalty was used
      const loyaltyRedeemed = data.loyaltyRedeemed ?? 0;
      const usedLoyalty = loyaltyRedeemed > 0;

      // ✅ Validate loyalty redemption if loyalty is disabled
      if (usedLoyalty && !loyaltyEnabled) {
        throw new Error("Loyalty points are disabled in system settings");
      }

      // Determine if discount was used
      const usedDiscount = totalDiscount > 0;

      // Compute total amount
      const totalAmount = subtotal - totalDiscount + totalTax - loyaltyRedeemed;

      // Create sale
      const sale = saleRepo.create({
        timestamp: new Date(),
        status: data.status || "initiated",
        paymentMethod: paymentMethod,
        totalAmount: Math.round(totalAmount * 100) / 100,
        notes: data.notes || null,
        customer: customer || null,
        usedLoyalty,
        loyaltyRedeemed,
        usedDiscount,
        totalDiscount,
        usedVoucher: !!data.voucherCode,
        voucherCode: data.voucherCode || null,
        pointsEarn: 0, // will be computed by state service
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedSale = await saveDb(saleRepo, sale, { queryRunner: qr });

      // Create sale items
      for (const itemData of saleItems) {
        const saleItem = saleItemRepo.create({
          ...itemData,
          sale: savedSale,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await saveDb(saleItemRepo, saleItem, { queryRunner: qr });
      }

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Sale", savedSale.id, savedSale, user);
      }

      logger.debug(`Sale created: #${savedSale.id} (initiated)`);

      // Reload with items
      const fullSale = await saleRepo.findOne({
        where: { id: savedSale.id },
        relations: ["saleItems", "saleItems.meat", "customer"],
      });

      return fullSale;
    } catch (error) {
      console.error("Failed to create sale:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing sale (only allowed for initiated status)
   * @param {number} id
   * @param {Object} data - { paymentMethod?, notes?, customerId?, items? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb, saveDb, removeDb } = require("../utils/dbUtils/dbActions");
    const Sale = require("../entities/Sale");
    const SaleItem = require("../entities/SaleItem");
    const Meat = require("../entities/Meat");
    const Customer = require("../entities/Customer");

    const saleRepo = this._getRepo(qr, Sale);
    const saleItemRepo = this._getRepo(qr, SaleItem);
    const meatRepo = this._getRepo(qr, Meat);
    const customerRepo = this._getRepo(qr, Customer);

    try {
      const existing = await saleRepo.findOne({
        where: { id },
        relations: ["saleItems", "saleItems.meat", "customer"],
      });
      if (!existing) {
        throw new Error(`Sale with ID ${id} not found`);
      }

      // Only allow updates for initiated status
      if (existing.status !== "initiated") {
        throw new Error(`Cannot update a sale with status "${existing.status}"`);
      }

      const oldData = { ...existing };

      // ✅ Get settings
      const enabledPaymentMethods = await this._getEnabledPaymentMethods(qr);
      const maxDiscountPercent = await this._getMaxDiscountPercent(qr);
      const discountsEnabled = await this._isDiscountsEnabled(qr);
      const maxNotesLength = await this._getMaxNotesLength(qr);
      const loyaltyEnabled = await this._isLoyaltyEnabled(qr);

      // ✅ Validate payment method if provided
      if (data.paymentMethod) {
        if (!enabledPaymentMethods.includes(data.paymentMethod)) {
          throw new Error(
            `Payment method "${data.paymentMethod}" is not enabled. Enabled: ${enabledPaymentMethods.join(", ")}`
          );
        }
      }

      // ✅ Validate notes length if provided
      if (data.notes !== undefined && data.notes.length > maxNotesLength) {
        throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
      }

      // Handle customer change
      if (data.customerId !== undefined) {
        if (data.customerId === null || data.customerId === "") {
          existing.customer = null;
        } else {
          const customer = await customerRepo.findOne({ where: { id: data.customerId } });
          if (!customer) {
            throw new Error(`Customer with ID ${data.customerId} not found`);
          }
          existing.customer = customer;
        }
        delete data.customerId;
      }

      // Handle items update (replace all items)
      if (data.items) {
        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new Error("At least one item is required");
        }

        // Remove old items
        for (const oldItem of existing.saleItems) {
          await removeDb(saleItemRepo, oldItem, { queryRunner: qr });
        }

        // Create new items
        const newItems = [];
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        for (const itemData of data.items) {
          if (!itemData.meatId) throw new Error("meatId is required for each item");
          if (!itemData.weightKg || itemData.weightKg <= 0) {
            throw new Error("weightKg must be greater than 0");
          }

          const meat = await meatRepo.findOne({ where: { id: itemData.meatId, isActive: true } });
          if (!meat) {
            throw new Error(`Meat with ID ${itemData.meatId} not found or inactive`);
          }

          const unitPrice = itemData.unitPrice ?? meat.pricePerKg;
          const discount = itemData.discount ?? 0;

          // ✅ Validate discount if discounts are enabled
          if (discount > 0) {
            if (!discountsEnabled) {
              throw new Error("Discounts are disabled in system settings");
            }
            const discountPercent = (discount / (unitPrice * itemData.weightKg)) * 100;
            if (discountPercent > maxDiscountPercent) {
              throw new Error(
                `Discount ${discountPercent.toFixed(1)}% exceeds maximum allowed of ${maxDiscountPercent}%`
              );
            }
          }

          const tax = itemData.tax ?? 0;
          const lineTotal = (unitPrice * itemData.weightKg) - discount + tax;

          subtotal += unitPrice * itemData.weightKg;
          totalDiscount += discount;
          totalTax += tax;

          newItems.push({
            weightKg: itemData.weightKg,
            unitPrice: unitPrice,
            discount: discount,
            tax: tax,
            lineTotal: lineTotal,
            meat: meat,
            sale: existing,
          });
        }

        // Update sale totals
        const loyaltyRedeemed = data.loyaltyRedeemed ?? existing.loyaltyRedeemed ?? 0;

        // ✅ Validate loyalty redemption if loyalty is disabled
        if (loyaltyRedeemed > 0 && !loyaltyEnabled) {
          throw new Error("Loyalty points are disabled in system settings");
        }

        const totalAmount = subtotal - totalDiscount + totalTax - loyaltyRedeemed;
        existing.totalAmount = Math.round(totalAmount * 100) / 100;
        existing.totalDiscount = totalDiscount;
        existing.usedDiscount = totalDiscount > 0;

        // Save new items
        for (const itemData of newItems) {
          const saleItem = saleItemRepo.create({
            ...itemData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await saveDb(saleItemRepo, saleItem, { queryRunner: qr });
        }

        delete data.items;
        delete data.loyaltyRedeemed; // handled above
      }

      // Update other fields
      if (data.paymentMethod !== undefined) existing.paymentMethod = data.paymentMethod;
      if (data.notes !== undefined) existing.notes = data.notes;
      if (data.voucherCode !== undefined) {
        existing.voucherCode = data.voucherCode;
        existing.usedVoucher = !!data.voucherCode;
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(saleRepo, existing, { queryRunner: qr });

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Sale", id, oldData, saved, user);
      }

      logger.debug(`Sale updated: #${id}`);

      // Reload with relations
      const fullSale = await saleRepo.findOne({
        where: { id: saved.id },
        relations: ["saleItems", "saleItems.meat", "customer"],
      });
      return fullSale;
    } catch (error) {
      console.error("Failed to update sale:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a sale (only allowed for initiated or voided status)
   * We'll just mark as voided via state service, but here we'll allow setting status to voided.
   * For consistency, we'll use the state service for status changes.
   * So this method will just be a placeholder or we can allow hard delete for initiated.
   */
  // We'll skip soft delete for sale – use state service to void or refund.

  /**
   * Permanently delete a sale (hard delete) – only allowed for initiated status
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Sale = require("../entities/Sale");
    const SaleItem = require("../entities/SaleItem");

    const saleRepo = this._getRepo(qr, Sale);
    const saleItemRepo = this._getRepo(qr, SaleItem);

    const sale = await saleRepo.findOne({
      where: { id },
      relations: ["saleItems"],
    });
    if (!sale) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    // Only allow deletion for initiated or voided sales
    if (sale.status !== "initiated" && sale.status !== "voided") {
      throw new Error(`Cannot delete a sale with status "${sale.status}"`);
    }

    // Remove sale items first
    for (const item of sale.saleItems) {
      await removeDb(saleItemRepo, item, { queryRunner: qr });
    }

    await removeDb(saleRepo, sale, { queryRunner: qr });

    // ✅ Check if audit logging is enabled before logging
    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.debugDelete("Sale", id, sale, user);
    }

    logger.debug(`Sale #${id} permanently deleted`);
  }

  /**
   * Find sale by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    const sale = await saleRepo
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.saleItems", "saleItems")
      .leftJoinAndSelect("saleItems.meat", "meat")
      .leftJoinAndSelect("saleItems.batch", "batch")
      .leftJoinAndSelect("sale.customer", "customer")
      .where("sale.id = :id", { id })
      .getOne();

    if (!sale) {
      throw new Error(`Sale with ID ${id} not found`);
    }
    await logger.debug("Sale", id, "system");
    return sale;
  }

  /**
   * Find all sales with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    const qb = saleRepo
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.customer", "customer")
      .leftJoinAndSelect("sale.saleItems", "saleItems")
      .leftJoinAndSelect("saleItems.meat", "meat");

    // ✅ Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("sale.timestamp >= :cutoffDate", { cutoffDate });
    }

    // Filters
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      // ✅ Validate statuses against allowed list
      const allowedStatuses = await this._getAllowedStatuses(qr);
      const invalidStatuses = statuses.filter(s => !allowedStatuses.includes(s));
      if (invalidStatuses.length > 0) {
        logger.warn(`[Sale] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${allowedStatuses.join(", ")}`);
      }
      qb.andWhere("sale.status IN (:...statuses)", { statuses });
    }
    if (options.customerId) {
      qb.andWhere("sale.customerId = :customerId", { customerId: options.customerId });
    }
    if (options.paymentMethod) {
      const methods = Array.isArray(options.paymentMethod) ? options.paymentMethod : [options.paymentMethod];
      // ✅ Validate payment methods
      const enabledMethods = await this._getEnabledPaymentMethods(qr);
      const invalidMethods = methods.filter(m => !enabledMethods.includes(m));
      if (invalidMethods.length > 0) {
        logger.warn(`[Sale] Invalid payment methods: ${invalidMethods.join(", ")}. Enabled: ${enabledMethods.join(", ")}`);
      }
      qb.andWhere("sale.paymentMethod IN (:...methods)", { methods });
    }
    if (options.startDate) {
      qb.andWhere("sale.timestamp >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("sale.timestamp <= :endDate", { endDate: end });
    }
    if (options.minAmount !== undefined) {
      qb.andWhere("sale.totalAmount >= :minAmount", { minAmount: options.minAmount });
    }
    if (options.maxAmount !== undefined) {
      qb.andWhere("sale.totalAmount <= :maxAmount", { maxAmount: options.maxAmount });
    }
    if (options.search) {
      qb.andWhere(
        "(sale.notes LIKE :search OR customer.name LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "timestamp";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Sale] Invalid sortBy: ${sortBy}, falling back to timestamp`);
      sortBy = "timestamp";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`sale.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("Sale", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get sale statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    // ✅ Apply retention days filter
    const retentionDays = await this._getRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // By status
    const byStatus = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(sale.totalAmount)", "total")
      .where("sale.timestamp >= :cutoffDate", { cutoffDate })
      .groupBy("sale.status")
      .getRawMany();

    // Total paid revenue
    const paidResult = await saleRepo
      .createQueryBuilder("sale")
      .select("SUM(sale.totalAmount)", "total")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalRevenue = parseFloat(paidResult.total) || 0;

    // Average sale amount (paid)
    const avgResult = await saleRepo
      .createQueryBuilder("sale")
      .select("AVG(sale.totalAmount)", "avg")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const averageSale = parseFloat(avgResult.avg) || 0;

    // Today's sales
    const today = new Date().toISOString().split("T")[0];
    const todaySales = await saleRepo
      .createQueryBuilder("sale")
      .where("DATE(sale.timestamp) = :today", { today })
      .andWhere("sale.status = 'paid'")
      .getCount();

    // Total items sold (paid sales only)
    const itemsSoldResult = await saleRepo
      .createQueryBuilder("sale")
      .leftJoin("sale.saleItems", "items")
      .select("SUM(items.weightKg)", "total")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalWeightSold = parseFloat(itemsSoldResult.total) || 0;

    // ✅ Get settings info
    const allowedStatuses = await this._getAllowedStatuses(qr);
    const enabledPaymentMethods = await this._getEnabledPaymentMethods(qr);
    const maxDiscountPercent = await this._getMaxDiscountPercent(qr);
    const discountsEnabled = await this._isDiscountsEnabled(qr);
    const taxRate = await this._getTaxRate(qr);
    const loyaltyEnabled = await this._isLoyaltyEnabled(qr);

    // ✅ Get counts by payment method
    const byPaymentMethod = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.paymentMethod", "paymentMethod")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(sale.totalAmount)", "total")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :cutoffDate", { cutoffDate })
      .groupBy("sale.paymentMethod")
      .getRawMany();

    return {
      byStatus,
      totalRevenue,
      averageSale,
      todaySales,
      totalWeightSold,
      byPaymentMethod,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      allowedStatuses,
      enabledPaymentMethods,
      maxDiscountPercent,
      discountsEnabled,
      taxRate,
      loyaltyEnabled,
    };
  }

  /**
   * Export sales to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportSales(format = "json", filters = {}, user = "system", qr = null) {
    try {
      // Fetch all data without pagination for export
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined, ignoreRetention: true }, qr);
      const sales = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Date",
          "Customer",
          "Payment Method",
          "Status",
          "Total Amount",
          "Items Count",
          "Total Weight (kg)",
          "Loyalty Redeemed",
          "Points Earned",
          "Discount",
          "Voucher",
          "Notes",
        ];
        const rows = sales.map((s) => {
          const totalWeight = s.saleItems?.reduce((sum, item) => sum + item.weightKg, 0) || 0;
          return [
            s.id,
            new Date(s.timestamp).toLocaleString(),
            s.customer?.name ?? "Walk-in",
            s.paymentMethod,
            s.status,
            s.totalAmount,
            s.saleItems?.length ?? 0,
            totalWeight.toFixed(3),
            s.loyaltyRedeemed ?? 0,
            s.pointsEarn ?? 0,
            s.totalDiscount ?? 0,
            s.voucherCode ?? "",
            s.notes ?? "",
          ];
        });
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `sales_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: sales,
          filename: `sales_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      // ✅ Check if audit logging is enabled before logging
      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Sale", format, filters, user);
      }

      logger.debug(`Exported ${sales.length} sales in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export sales:", error);
      throw error;
    }
  }

  /**
   * Bulk create sales
   * @param {Array<Object>} salesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(salesArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of salesArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ sale: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import sales from CSV file
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
        // Parse items from JSON string
        let items = [];
        if (record.items) {
          items = JSON.parse(record.items);
        }
        const data = {
          items,
          customerId: record.customerId ? parseInt(record.customerId, 10) : null,
          paymentMethod: record.paymentMethod || "cash",
          notes: record.notes || null,
          loyaltyRedeemed: record.loyaltyRedeemed ? parseInt(record.loyaltyRedeemed, 10) : 0,
          voucherCode: record.voucherCode || null,
        };
        if (!data.items || data.items.length === 0) {
          throw new Error("At least one item is required");
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
   * ✅ NEW: Clean up old sales (soft delete via void status)
   * @param {number} daysOld - Mark sales older than this as voided (overrides settings)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldSales(daysOld = null, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    // ✅ Use settings if not provided
    if (daysOld === null) {
      daysOld = await this._getRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // ✅ Only clean completed/paid sales (don't touch pending or refunded)
    const oldSales = await saleRepo
      .createQueryBuilder("sale")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp < :cutoffDate", { cutoffDate })
      .getMany();

    if (oldSales.length === 0) {
      logger.info(`[Sale] No old sales to clean up (threshold: ${daysOld} days)`);
      return { count: 0 };
    }

    let updatedCount = 0;
    for (const sale of oldSales) {
      try {
        // Don't delete, just note for archiving
        // Or you can soft delete by adding a flag
        // For now, we'll just log and potentially archive
        logger.debug(`[Sale] Sale #${sale.id} (${sale.customer?.name || "Walk-in"}) is older than ${daysOld} days`);

        // Optionally, you could mark as archived if you have an archived flag
        // sale.isArchived = true;
        // await updateDb(saleRepo, sale, { queryRunner: qr, skipSignal: true });

        updatedCount++;
      } catch (err) {
        logger.error(`[Sale] Failed to process old sale #${sale.id}:`, err);
      }
    }

    logger.info(`[Sale] Found ${updatedCount} old sales to archive (older than ${daysOld} days)`);
    return { count: updatedCount };
  }

  /**
   * ✅ NEW: Get sale health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    // Get counts by status
    const byStatus = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("sale.status")
      .getRawMany();

    const statusCounts = byStatus.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const paid = statusCounts.paid || 0;
    const initiated = statusCounts.initiated || 0;
    const refunded = statusCounts.refunded || 0;
    const voided = statusCounts.voided || 0;

    // ✅ Get total revenue (paid only)
    const totalRevenueResult = await saleRepo
      .createQueryBuilder("sale")
      .select("SUM(sale.totalAmount)", "total")
      .where("sale.status = 'paid'")
      .getRawOne();
    const totalRevenue = parseFloat(totalRevenueResult.total) || 0;

    // ✅ Get average sale amount
    const avgResult = await saleRepo
      .createQueryBuilder("sale")
      .select("AVG(sale.totalAmount)", "avg")
      .where("sale.status = 'paid'")
      .getRawOne();
    const averageAmount = parseFloat(avgResult.avg) || 0;

    // ✅ Get completion rate
    const completionRate = total > 0 ? Math.round((paid / total) * 100) : 0;

    // ✅ Get settings info
    const allowedStatuses = await this._getAllowedStatuses(qr);
    const enabledPaymentMethods = await this._getEnabledPaymentMethods(qr);
    const loyaltyEnabled = await this._isLoyaltyEnabled(qr);

    return {
      total,
      byStatus: statusCounts,
      paid,
      initiated,
      refunded,
      voided,
      totalRevenue,
      averageAmount,
      completionRate,
      allowedStatuses,
      enabledPaymentMethods,
      loyaltyEnabled,
    };
  }

  /**
   * ✅ NEW: Get sale retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getRetentionDays(qr);
    const auditEnabled = await this._isAuditEnabled(qr);
    const loyaltyEnabled = await this._isLoyaltyEnabled(qr);

    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalSales = await saleRepo.count();
    const oldSales = await saleRepo
      .createQueryBuilder("sale")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp < :cutoffDate", { cutoffDate })
      .getCount();

    const allowedStatuses = await this._getAllowedStatuses(qr);
    const enabledPaymentMethods = await this._getEnabledPaymentMethods(qr);

    return {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalSales,
      salesToArchive: oldSales,
      allowedStatuses,
      enabledPaymentMethods,
      loyaltyEnabled,
      auditEnabled,
    };
  }

  /**
   * ✅ NEW: Get daily sales summary
   * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getDailySalesSummary(date = null, qr = null) {
    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split("T")[0];

    const sales = await saleRepo
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.saleItems", "saleItems")
      .where("DATE(sale.timestamp) = :date", { date: dateStr })
      .andWhere("sale.status = 'paid'")
      .getMany();

    let totalAmount = 0;
    let totalWeight = 0;
    let totalItems = 0;
    const byPaymentMethod = {};

    for (const sale of sales) {
      totalAmount += sale.totalAmount;
      totalItems += sale.saleItems?.length || 0;
      const weight = sale.saleItems?.reduce((sum, item) => sum + item.weightKg, 0) || 0;
      totalWeight += weight;

      const method = sale.paymentMethod || "unknown";
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + sale.totalAmount;
    }

    return {
      date: dateStr,
      totalSales: sales.length,
      totalAmount,
      averageAmount: sales.length > 0 ? totalAmount / sales.length : 0,
      totalItems,
      totalWeight,
      byPaymentMethod,
      sales,
    };
  }
}

// Singleton instance
const saleService = new SaleService();
module.exports = saleService;