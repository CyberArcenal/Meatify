// src/services/Purchase.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

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
    console.log("PurchaseService initialized");
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
    console.log(
      `[Purchase._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[Purchase._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

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

    try {
      // Validate required fields
      if (!data.supplierId) throw new Error("supplierId is required");
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("At least one item is required");
      }

      // Validate supplier
      const supplier = await supplierRepo.findOne({
        where: { id: data.supplierId, isActive: true },
      });
      if (!supplier) {
        throw new Error(`Supplier with ID ${data.supplierId} not found or inactive`);
      }

      // Validate items and prepare purchase items
      const purchaseItems = [];
      let totalAmount = 0;

      for (const itemData of data.items) {
        if (!itemData.meatId) throw new Error("meatId is required for each item");
        if (!itemData.quantity || itemData.quantity <= 0) {
          throw new Error("quantity must be greater than 0");
        }
        if (itemData.unitPrice === undefined || itemData.unitPrice < 0) {
          throw new Error("unitPrice must be non-negative");
        }
        if (!itemData.expiryDate) throw new Error("expiryDate is required for each item");

        const meat = await meatRepo.findOne({ where: { id: itemData.meatId, isActive: true } });
        if (!meat) {
          throw new Error(`Meat with ID ${itemData.meatId} not found or inactive`);
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

      // Generate reference if not provided
      let referenceNo = data.referenceNo;
      if (!referenceNo) {
        referenceNo = await this.generateReferenceNo(purchaseRepo);
      } else {
        const existing = await purchaseRepo.findOne({ where: { referenceNo } });
        if (existing) {
          throw new Error(`Reference "${referenceNo}" already exists`);
        }
      }

      // Create purchase
      const purchase = purchaseRepo.create({
        referenceNo,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        status: data.status || "pending",
        totalAmount: Math.round(totalAmount * 100) / 100,
        notes: data.notes || null,
        supplier: supplier,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedPurchase = await saveDb(purchaseRepo, purchase, { queryRunner: qr });

      // Create purchase items
      for (const itemData of purchaseItems) {
        const purchaseItem = purchaseItemRepo.create({
          ...itemData,
          purchase: savedPurchase,
          createdAt: new Date(),
        });
        await saveDb(purchaseItemRepo, purchaseItem, { queryRunner: qr });
      }

      await auditLogger.logCreate("Purchase", savedPurchase.id, savedPurchase, user);
      console.log(`Purchase created: #${savedPurchase.id} - ${savedPurchase.referenceNo}`);

      // Reload with relations
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
    const { updateDb, saveDb, removeDb } = require("../utils/dbUtils/dbActions");
    const Purchase = require("../entities/Purchase");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Meat = require("../entities/Meat");
    const Supplier = require("../entities/Supplier");

    const purchaseRepo = this._getRepo(qr, Purchase);
    const purchaseItemRepo = this._getRepo(qr, PurchaseItem);
    const meatRepo = this._getRepo(qr, Meat);
    const supplierRepo = this._getRepo(qr, Supplier);

    try {
      const existing = await purchaseRepo.findOne({
        where: { id },
        relations: ["supplier", "purchaseItems", "purchaseItems.meat"],
      });
      if (!existing) {
        throw new Error(`Purchase with ID ${id} not found`);
      }

      // Only allow updates for pending or approved status (not completed/cancelled)
      if (existing.status === "completed" || existing.status === "cancelled") {
        throw new Error(`Cannot update a purchase with status "${existing.status}"`);
      }

      const oldData = { ...existing };

      // Handle supplier change
      if (data.supplierId !== undefined) {
        const supplier = await supplierRepo.findOne({
          where: { id: data.supplierId, isActive: true },
        });
        if (!supplier) {
          throw new Error(`Supplier with ID ${data.supplierId} not found or inactive`);
        }
        existing.supplier = supplier;
        delete data.supplierId;
      }

      // Handle reference change
      if (data.referenceNo && data.referenceNo !== existing.referenceNo) {
        const duplicate = await purchaseRepo.findOne({
          where: { referenceNo: data.referenceNo },
        });
        if (duplicate) {
          throw new Error(`Reference "${data.referenceNo}" already exists`);
        }
        existing.referenceNo = data.referenceNo;
        delete data.referenceNo;
      }

      // Handle items update (only if pending)
      if (data.items) {
        if (existing.status !== "pending") {
          throw new Error("Can only update items for pending purchases");
        }

        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new Error("At least one item is required");
        }

        // Remove old items
        for (const oldItem of existing.purchaseItems) {
          await removeDb(purchaseItemRepo, oldItem, { queryRunner: qr });
        }

        // Create new items
        const newItems = [];
        let totalAmount = 0;

        for (const itemData of data.items) {
          if (!itemData.meatId) throw new Error("meatId is required for each item");
          if (!itemData.quantity || itemData.quantity <= 0) {
            throw new Error("quantity must be greater than 0");
          }
          if (itemData.unitPrice === undefined || itemData.unitPrice < 0) {
            throw new Error("unitPrice must be non-negative");
          }
          if (!itemData.expiryDate) throw new Error("expiryDate is required for each item");

          const meat = await meatRepo.findOne({
            where: { id: itemData.meatId, isActive: true },
          });
          if (!meat) {
            throw new Error(`Meat with ID ${itemData.meatId} not found or inactive`);
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

        for (const itemData of newItems) {
          const purchaseItem = purchaseItemRepo.create({
            ...itemData,
            createdAt: new Date(),
          });
          await saveDb(purchaseItemRepo, purchaseItem, { queryRunner: qr });
        }

        delete data.items;
      }

      // Update other fields
      if (data.orderDate !== undefined) {
        existing.orderDate = new Date(data.orderDate);
      }
      if (data.notes !== undefined) {
        existing.notes = data.notes;
      }

      existing.updatedAt = new Date();

      const saved = await updateDb(purchaseRepo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Purchase", id, oldData, saved, user);
      console.log(`Purchase updated: #${id}`);

      // Reload with relations
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
   * Soft delete a purchase (set status to cancelled) – use state service for status change
   * We'll just provide a method to cancel via state service.
   * For consistency, we'll use the state service for status changes.
   * So this method will just be a placeholder or we can allow hard delete for pending.
   */
  // We'll skip soft delete for purchase – use state service to cancel.

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

    // Only allow deletion for pending or cancelled purchases
    if (purchase.status === "completed") {
      throw new Error("Cannot delete a completed purchase");
    }

    // Remove purchase items first
    for (const item of purchase.purchaseItems) {
      await removeDb(purchaseItemRepo, item, { queryRunner: qr });
    }

    await removeDb(purchaseRepo, purchase, { queryRunner: qr });
    await auditLogger.logDelete("Purchase", id, purchase, user);
    console.log(`Purchase #${id} permanently deleted`);
  }

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
    await auditLogger.logView("Purchase", id, "system");
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

    // Filters
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      qb.andWhere("purchase.status IN (:...statuses)", { statuses });
    }
    if (options.supplierId) {
      qb.andWhere("purchase.supplierId = :supplierId", { supplierId: options.supplierId });
    }
    if (options.referenceNo) {
      qb.andWhere("purchase.referenceNo LIKE :referenceNo", {
        referenceNo: `%${options.referenceNo}%`,
      });
    }
    if (options.startDate) {
      qb.andWhere("purchase.orderDate >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("purchase.orderDate <= :endDate", { endDate: end });
    }
    if (options.minAmount !== undefined) {
      qb.andWhere("purchase.totalAmount >= :minAmount", { minAmount: options.minAmount });
    }
    if (options.maxAmount !== undefined) {
      qb.andWhere("purchase.totalAmount <= :maxAmount", { maxAmount: options.maxAmount });
    }
    if (options.search) {
      qb.andWhere(
        "(purchase.referenceNo LIKE :search OR purchase.notes LIKE :search OR supplier.name LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "orderDate";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Purchase] Invalid sortBy: ${sortBy}, falling back to orderDate`);
      sortBy = "orderDate";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`purchase.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Purchase", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get purchase statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Purchase = require("../entities/Purchase");
    const purchaseRepo = this._getRepo(qr, Purchase);

    // By status
    const byStatus = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("purchase.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(purchase.totalAmount)", "total")
      .groupBy("purchase.status")
      .getRawMany();

    // Total completed purchases amount
    const completedResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("SUM(purchase.totalAmount)", "total")
      .where("purchase.status = 'completed'")
      .getRawOne();
    const totalSpent = parseFloat(completedResult.total) || 0;

    // Average purchase amount (completed)
    const avgResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("AVG(purchase.totalAmount)", "avg")
      .where("purchase.status = 'completed'")
      .getRawOne();
    const averagePurchase = parseFloat(avgResult.avg) || 0;

    // Pending purchases count
    const pending = await purchaseRepo
      .createQueryBuilder("purchase")
      .where("purchase.status = 'pending'")
      .getCount();

    // Total items purchased (completed only)
    const itemsResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .leftJoin("purchase.purchaseItems", "items")
      .select("SUM(items.quantity)", "total")
      .where("purchase.status = 'completed'")
      .getRawOne();
    const totalItems = parseFloat(itemsResult.total) || 0;

    return {
      byStatus,
      totalSpent,
      averagePurchase,
      pending,
      totalItems,
    };
  }

  /**
   * Export purchases to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportPurchases(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
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

      await auditLogger.logExport("Purchase", format, filters, user);
      console.log(`Exported ${purchases.length} purchases in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export purchases:", error);
      throw error;
    }
  }

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
   * @returns {Promise<string>}
   */
  async generateReferenceNo(repo) {
    const prefix = "PO";
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
}

// Singleton instance
const purchaseService = new PurchaseService();
module.exports = purchaseService;