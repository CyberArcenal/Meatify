// src/services/Purchase.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");
const { validate } = require("../validation");
const {
  purchaseCreateSchema,
  purchaseUpdateSchema,
  purchaseStatusSchema,
} = require("../validation/schemas/purchase.schema");
const { z } = require("zod");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "referenceNo",
  "orderDate",
  "status",
  "totalAmount",
  "notes",
  "createdAt",
  "updatedAt",
]);

class PurchaseService {
  constructor() {
    this.purchaseRepository = null;
    this.purchaseItemRepository = null;
    this.meatRepository = null;
    this.supplierRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Purchase = require("../entities/Purchase");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.purchaseRepository = AppDataSource.getRepository(Purchase);
    this.purchaseItemRepository = AppDataSource.getRepository(PurchaseItem);
    this.meatRepository = AppDataSource.getRepository(Meat);
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    logger.debug("PurchaseService initialized");
  }

  async getRepositories() {
    if (!this.purchaseRepository) {
      await this.initialize();
    }
    return {
      purchase: this.purchaseRepository,
      purchaseItem: this.purchaseItemRepository,
      meat: this.meatRepository,
      supplier: this.supplierRepository,
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
      `[Purchase._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Purchase._getRepo] Using global repository (fallback)`);
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
        `[Purchase] Failed to check audit enabled status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get allowed purchase statuses from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedStatuses(qr = null) {
    try {
      return await system.getArray(
        "allowed_purchase_statuses",
        SettingType.INVENTORY,
        ["pending", "approved", "completed", "cancelled"],
      );
    } catch (error) {
      logger.warn(
        `[Purchase] Failed to get allowed statuses: ${error.message}, using defaults`,
      );
      return ["pending", "approved", "completed", "cancelled"];
    }
  }

  /**
   * Get company prefix for reference number
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _getReferencePrefix(qr = null) {
    try {
      const prefix = await system.getValue(
        "purchase_reference_prefix",
        SettingType.INVENTORY,
        null,
      );
      if (prefix && prefix.trim()) {
        return prefix.trim().toUpperCase();
      }
      const company = await system.companyName();
      return company.substring(0, 2).toUpperCase() || "PO";
    } catch (error) {
      logger.warn(
        `[Purchase] Failed to get reference prefix: ${error.message}, defaulting to "PO"`,
      );
      return "PO";
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
        "max_purchase_notes_length",
        SettingType.INVENTORY,
        500,
      );
    } catch (error) {
      logger.warn(
        `[Purchase] Failed to get max notes length: ${error.message}, defaulting to 500`,
      );
      return 500;
    }
  }

  /**
   * Get purchase retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getRetentionDays(qr = null) {
    try {
      return await system.getInt(
        "purchase_retention_days",
        SettingType.INVENTORY,
        730,
      );
    } catch (error) {
      logger.warn(
        `[Purchase] Failed to get retention days: ${error.message}, defaulting to 730`,
      );
      return 730;
    }
  }

  /**
   * Get max quantity from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxQuantity(qr = null) {
    try {
      return await system.getDecimal(
        "max_purchase_quantity",
        SettingType.INVENTORY,
        9999.999,
      );
    } catch (error) {
      logger.warn(
        `[Purchase] Failed to get max quantity: ${error.message}, defaulting to 9999.999`,
      );
      return 9999.999;
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
        "max_purchase_unit_price",
        SettingType.INVENTORY,
        9999.99,
      );
    } catch (error) {
      logger.warn(
        `[Purchase] Failed to get max unit price: ${error.message}, defaulting to 9999.99`,
      );
      return 9999.99;
    }
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  /**
   * Find purchase by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    const purchase = await purchaseRepo
      .createQueryBuilder("purchase")
      .leftJoinAndSelect("purchase.supplier", "supplier")
      .leftJoinAndSelect("purchase.purchaseItems", "purchaseItems")
      .leftJoinAndSelect("purchaseItems.meat", "meat")
      .where("purchase.id = :id", { id })
      .getOne();

    if (!purchase) {
      throw new Error(`Purchase with ID ${id} not found`);
    }
    await logger.debug("Purchase", id, "system");
    return purchase;
  }

  /**
   * Find all purchases with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    const qb = purchaseRepo
      .createQueryBuilder("purchase")
      .leftJoinAndSelect("purchase.supplier", "supplier")
      .leftJoinAndSelect("purchase.purchaseItems", "purchaseItems")
      .leftJoinAndSelect("purchaseItems.meat", "meat");

    // Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("purchase.createdAt >= :cutoffDate", { cutoffDate });
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
          `[Purchase] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${allowedStatuses.join(", ")}`,
        );
      }
      qb.andWhere("purchase.status IN (:...statuses)", { statuses });
    }
    if (options.supplierId) {
      qb.andWhere("purchase.supplierId = :supplierId", {
        supplierId: options.supplierId,
      });
    }
    if (options.referenceNo) {
      qb.andWhere("purchase.referenceNo LIKE :referenceNo", {
        referenceNo: `%${options.referenceNo}%`,
      });
    }
    if (options.startDate) {
      qb.andWhere("purchase.orderDate >= :startDate", {
        startDate: new Date(options.startDate),
      });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("purchase.orderDate <= :endDate", { endDate: end });
    }
    if (options.minAmount !== undefined) {
      qb.andWhere("purchase.totalAmount >= :minAmount", {
        minAmount: options.minAmount,
      });
    }
    if (options.maxAmount !== undefined) {
      qb.andWhere("purchase.totalAmount <= :maxAmount", {
        maxAmount: options.maxAmount,
      });
    }
    if (options.search) {
      qb.andWhere(
        "(purchase.referenceNo LIKE :search OR purchase.notes LIKE :search OR supplier.name LIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    // Sorting
    let sortBy = options.sortBy || "orderDate";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(
        `[Purchase] Invalid sortBy: ${sortBy}, falling back to orderDate`,
      );
      sortBy = "orderDate";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`purchase.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("Purchase", null, "system");
    return result;
  }

  /**
   * Get purchase statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    const retentionDays = await this._getRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // By status
    const byStatus = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("purchase.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(purchase.totalAmount)", "total")
      .where("purchase.createdAt >= :cutoffDate", { cutoffDate })
      .groupBy("purchase.status")
      .getRawMany();

    // Total completed purchases amount
    const completedResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("SUM(purchase.totalAmount)", "total")
      .where("purchase.status = 'completed'")
      .andWhere("purchase.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalSpent = parseFloat(completedResult.total) || 0;

    // Average purchase amount (completed)
    const avgResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("AVG(purchase.totalAmount)", "avg")
      .where("purchase.status = 'completed'")
      .andWhere("purchase.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const averagePurchase = parseFloat(avgResult.avg) || 0;

    // Pending purchases count
    const pending = await purchaseRepo
      .createQueryBuilder("purchase")
      .where("purchase.status = 'pending'")
      .andWhere("purchase.createdAt >= :cutoffDate", { cutoffDate })
      .getCount();

    // Total items purchased (completed only)
    const itemsResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .leftJoin("purchase.purchaseItems", "items")
      .select("SUM(items.quantity)", "total")
      .where("purchase.status = 'completed'")
      .andWhere("purchase.createdAt >= :cutoffDate", { cutoffDate })
      .getRawOne();
    const totalItems = parseFloat(itemsResult.total) || 0;

    const allowedStatuses = await this._getAllowedStatuses(qr);

    return {
      byStatus,
      totalSpent,
      averagePurchase,
      pending,
      totalItems,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      allowedStatuses,
    };
  }

  /**
   * Export purchases to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportPurchases(
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
      const purchases = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Reference No",
          "Supplier",
          "Order Date",
          "Status",
          "Total Amount",
          "Items Count",
          "Notes",
          "Created At",
        ];
        const rows = purchases.map((p) => [
          p.id,
          p.referenceNo,
          p.supplier?.name ?? "",
          new Date(p.orderDate).toLocaleDateString(),
          p.status,
          p.totalAmount,
          p.purchaseItems?.length ?? 0,
          p.notes ?? "",
          new Date(p.createdAt).toLocaleString(),
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `purchases_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: purchases,
          filename: `purchases_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Purchase", format, filters, user);
      }

      logger.debug(
        `Exported ${purchases.length} purchases in ${format} format`,
      );
      return exportData;
    } catch (error) {
      console.error("Failed to export purchases:", error);
      throw error;
    }
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (CRUD) - WITH VALIDATION
  // ============================================================

  /**
   * Create a new purchase (pending status)
   * @param {Object} data - { supplierId, items, referenceNo?, orderDate?, status?, notes? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Purchase = require("../entities/Purchase");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    const purchaseRepo = this._getRepo(qr, Purchase);
    const purchaseItemRepo = this._getRepo(qr, PurchaseItem);
    const meatRepo = this._getRepo(qr, Meat);
    const supplierRepo = this._getRepo(qr, Supplier);

    // ✅ Validate input
    const validated = validate(purchaseCreateSchema, data, "Purchase creation");

    try {
      const { supplierId, items, referenceNo, orderDate, status, notes } =
        validated;

      // ✅ Validate notes length (business rule, though already in schema)
      if (notes) {
        const maxNotesLength = await this._getMaxNotesLength(qr);
        if (notes.length > maxNotesLength) {
          throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
        }
      }

      // ✅ Validate supplier
      const supplier = await supplierRepo.findOne({
        where: { id: supplierId, isActive: true },
      });
      if (!supplier) {
        throw new Error(`Supplier with ID ${supplierId} not found or inactive`);
      }

      // ✅ Process items
      const maxQuantity = await this._getMaxQuantity(qr);
      const maxUnitPrice = await this._getMaxUnitPrice(qr);

      const purchaseItems = [];
      let totalAmount = 0;

      for (const itemData of items) {
        const meat = await meatRepo.findOne({
          where: { id: itemData.meatId, isActive: true },
        });
        if (!meat) {
          throw new Error(
            `Meat with ID ${itemData.meatId} not found or inactive`,
          );
        }

        // ✅ Validate quantity and unit price (already validated by Zod, but double-check)
        if (itemData.quantity > maxQuantity) {
          throw new Error(
            `Quantity ${itemData.quantity} exceeds maximum allowed of ${maxQuantity}`,
          );
        }
        if (itemData.unitPrice > maxUnitPrice) {
          throw new Error(
            `Unit price ₱${itemData.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`,
          );
        }

        const expiryDate = new Date(itemData.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          throw new Error("Invalid expiryDate format");
        }

        const subtotal = itemData.quantity * itemData.unitPrice;
        totalAmount += subtotal;

        purchaseItems.push({
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice,
          subtotal: subtotal,
          expiryDate: expiryDate,
          meat: meat,
        });
      }

      // ✅ Generate reference number
      let finalReferenceNo = referenceNo;
      if (!finalReferenceNo) {
        const prefix = await this._getReferencePrefix(qr);
        finalReferenceNo = await this.generateReferenceNo(purchaseRepo, prefix);
      } else {
        const existing = await purchaseRepo.findOne({
          where: { referenceNo: finalReferenceNo },
        });
        if (existing) {
          throw new Error(`Reference "${finalReferenceNo}" already exists`);
        }
      }

      // ✅ Create purchase
      const purchase = purchaseRepo.create({
        referenceNo: finalReferenceNo,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        status: status || "pending",
        totalAmount: Math.round(totalAmount * 100) / 100,
        notes: notes || null,
        supplier: supplier,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedPurchase = await saveDb(purchaseRepo, purchase, {
        queryRunner: qr,
      });

      // ✅ Create purchase items
      for (const itemData of purchaseItems) {
        const purchaseItem = purchaseItemRepo.create({
          ...itemData,
          purchase: savedPurchase,
          createdAt: new Date(),
        });
        await saveDb(purchaseItemRepo, purchaseItem, { queryRunner: qr });
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        const auditLogger = require("../utils/auditLogger");
        await auditLogger.logCreate(
          "Purchase",
          savedPurchase.id,
          savedPurchase,
          user,
        );
      }

      logger.debug(
        `Purchase created: #${savedPurchase.id} - ${savedPurchase.referenceNo}`,
      );

      const fullPurchase = await purchaseRepo.findOne({
        where: { id: savedPurchase.id },
        relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
      });

      return fullPurchase;
    } catch (error) {
      console.error("Failed to create purchase:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing purchase (only allowed for pending status)
   * @param {number} id
   * @param {Object} data - { supplierId?, items?, referenceNo?, orderDate?, notes? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const {
      updateDb,
      saveDb,
      removeDb,
    } = require("../utils/dbUtils/dbActions");
    const Purchase = require("../entities/Purchase");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    const purchaseRepo = this._getRepo(qr, Purchase);
    const purchaseItemRepo = this._getRepo(qr, PurchaseItem);
    const meatRepo = this._getRepo(qr, Meat);
    const supplierRepo = this._getRepo(qr, Supplier);

    // ✅ Validate input
    const validated = validate(purchaseUpdateSchema, data, "Purchase update");

    try {
      const existing = await purchaseRepo.findOne({
        where: { id },
        relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
      });
      if (!existing) {
        throw new Error(`Purchase with ID ${id} not found`);
      }

      if (existing.status === "completed" || existing.status === "cancelled") {
        throw new Error(
          `Cannot update a purchase with status "${existing.status}"`,
        );
      }

      const oldData = { ...existing };

      // Use validated data
      const { supplierId, items, referenceNo, orderDate, notes } = validated;

      // ✅ Validate notes length if provided
      if (notes !== undefined) {
        const maxNotesLength = await this._getMaxNotesLength(qr);
        if (notes.length > maxNotesLength) {
          throw new Error(`Notes cannot exceed ${maxNotesLength} characters`);
        }
        existing.notes = notes;
      }

      // ✅ Handle supplier change
      if (supplierId !== undefined) {
        const supplier = await supplierRepo.findOne({
          where: { id: supplierId, isActive: true },
        });
        if (!supplier) {
          throw new Error(
            `Supplier with ID ${supplierId} not found or inactive`,
          );
        }
        existing.supplier = supplier;
      }

      // ✅ Handle reference number change
      if (referenceNo && referenceNo !== existing.referenceNo) {
        const duplicate = await purchaseRepo.findOne({
          where: { referenceNo: referenceNo },
        });
        if (duplicate) {
          throw new Error(`Reference "${referenceNo}" already exists`);
        }
        existing.referenceNo = referenceNo;
      }

      // ✅ Handle items update (replace all items)
      if (items) {
        if (existing.status !== "pending") {
          throw new Error("Can only update items for pending purchases");
        }

        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("At least one item is required");
        }

        const maxQuantity = await this._getMaxQuantity(qr);
        const maxUnitPrice = await this._getMaxUnitPrice(qr);

        // Remove old items
        for (const oldItem of existing.purchaseItems) {
          await removeDb(purchaseItemRepo, oldItem, { queryRunner: qr });
        }

        const newItems = [];
        let totalAmount = 0;

        for (const itemData of items) {
          // Validate required fields
          if (!itemData.meatId)
            throw new Error("meatId is required for each item");
          if (!itemData.quantity || itemData.quantity <= 0) {
            throw new Error("quantity must be greater than 0");
          }
          if (itemData.quantity > maxQuantity) {
            throw new Error(
              `Quantity ${itemData.quantity} exceeds maximum allowed of ${maxQuantity}`,
            );
          }
          if (itemData.unitPrice === undefined || itemData.unitPrice < 0) {
            throw new Error("unitPrice must be non-negative");
          }
          if (itemData.unitPrice > maxUnitPrice) {
            throw new Error(
              `Unit price ₱${itemData.unitPrice} exceeds maximum allowed of ₱${maxUnitPrice}`,
            );
          }
          if (!itemData.expiryDate) {
            throw new Error("expiryDate is required for each item");
          }

          const meat = await meatRepo.findOne({
            where: { id: itemData.meatId, isActive: true },
          });
          if (!meat) {
            throw new Error(
              `Meat with ID ${itemData.meatId} not found or inactive`,
            );
          }

          const expiryDate = new Date(itemData.expiryDate);
          if (isNaN(expiryDate.getTime())) {
            throw new Error("Invalid expiryDate format");
          }

          const subtotal = itemData.quantity * itemData.unitPrice;
          totalAmount += subtotal;

          newItems.push({
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
            subtotal: subtotal,
            expiryDate: expiryDate,
            meat: meat,
            purchase: existing,
          });
        }

        existing.totalAmount = Math.round(totalAmount * 100) / 100;

        // Save new items
        for (const itemData of newItems) {
          const purchaseItem = purchaseItemRepo.create({
            ...itemData,
            createdAt: new Date(),
          });
          await saveDb(purchaseItemRepo, purchaseItem, { queryRunner: qr });
        }
      }

      // ✅ Handle order date
      if (orderDate !== undefined) {
        existing.orderDate = new Date(orderDate);
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(purchaseRepo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Purchase", id, oldData, saved, user);
      }

      logger.debug(`Purchase updated: #${id}`);

      const fullPurchase = await purchaseRepo.findOne({
        where: { id: saved.id },
        relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
      });
      return fullPurchase;
    } catch (error) {
      console.error("Failed to update purchase:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a purchase (hard delete) – only allowed for pending status
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Purchase = require("../entities/Purchase");
    const PurchaseItem = require("../entities/PurchaseItem");

    const purchaseRepo = this._getRepo(qr, Purchase);
    const purchaseItemRepo = this._getRepo(qr, PurchaseItem);

    const purchase = await purchaseRepo.findOne({
      where: { id },
      relations: ["purchaseItems"],
    });
    if (!purchase) {
      throw new Error(`Purchase with ID ${id} not found`);
    }

    if (purchase.status === "completed") {
      throw new Error("Cannot delete a completed purchase");
    }

    for (const item of purchase.purchaseItems) {
      await removeDb(purchaseItemRepo, item, { queryRunner: qr });
    }

    await removeDb(purchaseRepo, purchase, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("Purchase", id, purchase, user);
    }

    logger.debug(`Purchase #${id} permanently deleted`);
  }

  // ============================================================
  // 🔄 BUSINESS LOGIC METHODS (Status Transitions + Data Mutation)
  // ============================================================

  /**
   * Approve a purchase (pending → approved)
   * @param {number} purchaseId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async approve(purchaseId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    const purchase = await purchaseRepo.findOne({
      where: { id: purchaseId },
      relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
    });
    if (!purchase) {
      throw new Error(`Purchase #${purchaseId} not found`);
    }

    if (purchase.status !== "pending") {
      throw new Error(
        `Cannot approve a purchase with status "${purchase.status}"`,
      );
    }

    logger.info(`[Purchase] Approving purchase #${purchaseId}`);

    const oldData = { status: purchase.status };
    purchase.status = "approved";
    purchase.updatedAt = new Date();

    const approvedPurchase = await updateDb(purchaseRepo, purchase, {
      queryRunner: qr,
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Purchase",
        purchaseId,
        oldData,
        approvedPurchase,
        user,
      );
    }

    logger.info(
      `[Purchase] Purchase #${purchaseId} approved (subscriber will handle side effects)`,
    );
    return approvedPurchase;
  }

  /**
   * Complete a purchase (approved/confirmed → completed) – creates batches and inventory movements
   * @param {number} purchaseId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async complete(purchaseId, user = "system", qr = null) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    const Purchase = require("../entities/Purchase");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Batch = require("../entities/Batch");
    const InventoryMovement = require("../entities/InventoryMovement");

    const purchaseRepo = this._getRepo(qr, Purchase);
    const purchaseItemRepo = this._getRepo(qr, PurchaseItem);
    const batchRepo = this._getRepo(qr, Batch);
    const movementRepo = this._getRepo(qr, InventoryMovement);

    const purchase = await purchaseRepo.findOne({
      where: { id: purchaseId },
      relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
    });
    if (!purchase) {
      throw new Error(`Purchase #${purchaseId} not found`);
    }

    if (purchase.status !== "approved" && purchase.status !== "confirmed") {
      throw new Error(
        `Cannot complete a purchase with status "${purchase.status}"`,
      );
    }

    logger.info(`[Purchase] Completing purchase #${purchaseId}`);

    // ─── STEP 1: Create batches for each purchase item ───
    const createdBatches = [];
    for (const item of purchase.purchaseItems) {
      const batch = batchRepo.create({
        batchCode: await this._generateBatchCode(batchRepo),
        initialQuantity: item.quantity,
        remainingQuantity: item.quantity,
        unitCost: item.unitPrice,
        expiryDate: item.expiryDate,
        receivedDate: new Date(),
        status: "active",
        note: `Purchase #${purchase.id} - ${purchase.referenceNo}`,
        meat: item.meat,
        supplier: purchase.supplier || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const savedBatch = await saveDb(batchRepo, batch, { queryRunner: qr });
      createdBatches.push(savedBatch);

      // Create inventory movement for batch addition
      const movement = movementRepo.create({
        movementType: "purchase",
        qtyChange: item.quantity,
        notes: `Purchase #${purchase.id} - ${purchase.referenceNo}`,
        meat: item.meat,
        batch: savedBatch,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await saveDb(movementRepo, movement, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Batch", savedBatch.id, savedBatch, user);
        await auditLogger.logCreate(
          "InventoryMovement",
          movement.id,
          movement,
          user,
        );
      }
    }

    // ─── STEP 2: Update purchase status ───
    const oldData = { status: purchase.status };
    purchase.status = "completed";
    purchase.updatedAt = new Date();

    const completedPurchase = await updateDb(purchaseRepo, purchase, {
      queryRunner: qr,
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Purchase",
        purchaseId,
        oldData,
        completedPurchase,
        user,
      );
    }

    logger.info(
      `[Purchase] Purchase #${purchaseId} completed, ${createdBatches.length} batch(es) created (subscriber will handle side effects)`,
    );

    return completedPurchase;
  }

  /**
   * Cancel a purchase (pending/approved/confirmed → cancelled)
   * @param {number} purchaseId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cancel(purchaseId, reason = "", user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    // ✅ Validate reason
    const validated = validate(
      z.object({ reason: z.string().max(500).optional() }),
      { reason },
      "Cancel reason",
    );

    const purchase = await purchaseRepo.findOne({
      where: { id: purchaseId },
      relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
    });
    if (!purchase) {
      throw new Error(`Purchase #${purchaseId} not found`);
    }

    if (purchase.status === "completed") {
      throw new Error("Cannot cancel a completed purchase");
    }

    if (purchase.status === "cancelled") {
      logger.warn(`[Purchase] Purchase #${purchaseId} is already cancelled`);
      return purchase;
    }

    const oldData = { status: purchase.status };
    logger.info(
      `[Purchase] Cancelling purchase #${purchaseId} (from ${oldData.status})`,
    );

    purchase.status = "cancelled";
    purchase.notes = purchase.notes
      ? `${purchase.notes}\nCancelled: ${validated.reason}`
      : `Cancelled: ${validated.reason}`;
    purchase.updatedAt = new Date();

    const cancelledPurchase = await updateDb(purchaseRepo, purchase, {
      queryRunner: qr,
    });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      const auditLogger = require("../utils/auditLogger");
      await auditLogger.logUpdate(
        "Purchase",
        purchaseId,
        oldData,
        cancelledPurchase,
        user,
      );
    }

    logger.info(`[Purchase] Purchase #${purchaseId} cancelled`);
    return cancelledPurchase;
  }

  // ============================================================
  // 📤 BULK & IMPORT OPERATIONS
  // ============================================================

  /**
   * Bulk create purchases
   * @param {Array<Object>} purchasesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(purchasesArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of purchasesArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ purchase: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update purchases
   * @param {Array<{ id: number, updates: Object }>} updatesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkUpdate(updatesArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        if (updates.status) {
          switch (updates.status) {
            case "approved":
              await this.approve(id, user, qr);
              break;
            case "completed":
              await this.complete(id, user, qr);
              break;
            case "cancelled":
              await this.cancel(id, updates.reason || "", user, qr);
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

  /**
   * Import purchases from CSV file
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
          supplierId: parseInt(record.supplierId, 10),
          items,
          referenceNo: record.referenceNo || null,
          orderDate: record.orderDate || null,
          status: record.status || "pending",
          notes: record.notes || null,
        };
        if (!data.supplierId || !data.items || data.items.length === 0) {
          throw new Error("supplierId and items are required");
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
   * @param {string} prefix - Optional prefix (defaults to "PO")
   * @returns {Promise<string>}
   */
  async generateReferenceNo(repo, prefix = "PO") {
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
   * Generate a unique batch code
   * @param {import("typeorm").Repository<any>} repo
   * @returns {Promise<string>}
   */
  async _generateBatchCode(repo) {
    const prefix = "BATCH";
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
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
  // 🧹 CLEANUP & HELPERS
  // ============================================================

  /**
   * Clean up old purchases (archive - placeholder)
   * @param {number} daysOld
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldPurchases(daysOld = null, user = "system", qr = null) {
    if (daysOld === null) {
      daysOld = await this._getRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // This is a placeholder – actual archiving logic can be added
    logger.info(
      `[Purchase] cleanOldPurchases called with ${daysOld} days (cutoff: ${cutoffDate.toISOString()})`,
    );
    return { count: 0 };
  }

  /**
   * Get purchase health summary
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getHealthSummary(qr = null) {
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    const byStatus = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("purchase.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("purchase.status")
      .getRawMany();

    const statusCounts = byStatus.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const completed = statusCounts.completed || 0;
    const pending = statusCounts.pending || 0;
    const approved = statusCounts.approved || 0;
    const cancelled = statusCounts.cancelled || 0;

    const totalSpentResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("SUM(purchase.totalAmount)", "total")
      .where("purchase.status = 'completed'")
      .getRawOne();
    const totalSpent = parseFloat(totalSpentResult.total) || 0;

    const avgResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("AVG(purchase.totalAmount)", "avg")
      .where("purchase.status = 'completed'")
      .getRawOne();
    const averageAmount = parseFloat(avgResult.avg) || 0;

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    const allowedStatuses = await this._getAllowedStatuses(qr);

    return {
      total,
      byStatus: statusCounts,
      completed,
      pending,
      approved,
      cancelled,
      totalSpent,
      averageAmount,
      completionRate,
      allowedStatuses,
    };
  }

  /**
   * Get purchase retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getRetentionDays(qr);
    const auditEnabled = await this._isAuditEnabled(qr);

    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalPurchases = await purchaseRepo.count();
    const oldPurchases = await purchaseRepo
      .createQueryBuilder("purchase")
      .where("purchase.status = 'completed'")
      .andWhere("purchase.createdAt < :cutoffDate", { cutoffDate })
      .getCount();

    const allowedStatuses = await this._getAllowedStatuses(qr);

    return {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalPurchases,
      purchasesToArchive: oldPurchases,
      allowedStatuses,
      auditEnabled,
    };
  }
}

// Singleton instance
const purchaseService = new PurchaseService();
module.exports = purchaseService;
