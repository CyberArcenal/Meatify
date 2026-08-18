// src/services/SaleService.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

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
    console.log("SaleService initialized");
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
    console.log(
      `[Sale._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[Sale._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
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

      // Determine if discount was used
      const usedDiscount = totalDiscount > 0;

      // Compute total amount
      const totalAmount = subtotal - totalDiscount + totalTax - loyaltyRedeemed;

      // Create sale
      const sale = saleRepo.create({
        timestamp: new Date(),
        status: "initiated",
        paymentMethod: data.paymentMethod || "cash",
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

      await auditLogger.logCreate("Sale", savedSale.id, savedSale, user);
      console.log(`Sale created: #${savedSale.id} (initiated)`);

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
        const totalAmount = subtotal - totalDiscount + totalTax - loyaltyRedeemed;
        existing.totalAmount = Math.round(totalAmount * 100) / 100;
        existing.totalDiscount = totalDiscount;
        existing.usedDiscount = totalDiscount > 0;
        existing.subtotal = subtotal; // if you have a subtotal field

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
      await auditLogger.logUpdate("Sale", id, oldData, saved, user);
      console.log(`Sale updated: #${id}`);

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
    await auditLogger.logDelete("Sale", id, sale, user);
    console.log(`Sale #${id} permanently deleted`);
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
    await auditLogger.logView("Sale", id, "system");
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

    // Filters
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      qb.andWhere("sale.status IN (:...statuses)", { statuses });
    }
    if (options.customerId) {
      qb.andWhere("sale.customerId = :customerId", { customerId: options.customerId });
    }
    if (options.paymentMethod) {
      qb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod: options.paymentMethod });
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

    await auditLogger.logView("Sale", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get sale statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Sale = require("../entities/Sale");
    const saleRepo = this._getRepo(qr, Sale);

    // By status
    const byStatus = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(sale.totalAmount)", "total")
      .groupBy("sale.status")
      .getRawMany();

    // Total paid revenue
    const paidResult = await saleRepo
      .createQueryBuilder("sale")
      .select("SUM(sale.totalAmount)", "total")
      .where("sale.status = 'paid'")
      .getRawOne();
    const totalRevenue = parseFloat(paidResult.total) || 0;

    // Average sale amount (paid)
    const avgResult = await saleRepo
      .createQueryBuilder("sale")
      .select("AVG(sale.totalAmount)", "avg")
      .where("sale.status = 'paid'")
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
      .getRawOne();
    const totalWeightSold = parseFloat(itemsSoldResult.total) || 0;

    return {
      byStatus,
      totalRevenue,
      averageSale,
      todaySales,
      totalWeightSold,
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
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
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

      await auditLogger.logExport("Sale", format, filters, user);
      console.log(`Exported ${sales.length} sales in ${format} format`);
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
}

// Singleton instance
const saleService = new SaleService();
module.exports = saleService;