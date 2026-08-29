// src/stateServices/SaleStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Sale = require("../entities/Sale");
const SaleItem = require("../entities/SaleItem");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const notificationService = require("../services/Notification");
const { BatchStateService } = require("./Batch");
const system = require("../utils/system"); // ✅ ADDED - for flexible settings
const CashDrawerService = require("../services/CashDrawer");
const PrinterService = require("../services/Printer");

// ❌ REMOVED hardcoded functions:
// const getLoyaltyPointRate = async () => 100;
// const loyaltyPointsEnabled = async () => true;
// const enableReceiptPrinting = async () => true;
// const enableCashDrawer = async () => true;
// const companyName = async () => "Meatify Shop";

/**
 * SaleStateService handles state transitions for sales.
 * It does NOT contain CRUD operations – those belong to SaleService.
 * All methods here modify the state (status) of sales and trigger side effects.
 */
class SaleStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.saleRepo = dataSource.getRepository(Sale);
    this.saleItemRepo = dataSource.getRepository(SaleItem);
    this.customerRepo = dataSource.getRepository(Customer);
    this.loyaltyRepo = dataSource.getRepository(LoyaltyTransaction);
    this.batchStateService = new BatchStateService(dataSource);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Mark a sale as paid – triggers all side effects: FIFO batch deduction,
   * loyalty points, notifications, receipt printing, cash drawer.
   * @param {number} saleId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */

  async markAsPaid(saleId, user = "system", queryRunner = null) {
    const {
      updateDb,
      saveDb,
      removeDb,
    } = require("../utils/dbUtils/dbActions");

    const saleRepo = this._getRepo(queryRunner, Sale);
    const saleItemRepo = this._getRepo(queryRunner, SaleItem);

    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["saleItems", "saleItems.meat", "saleItems.batch", "customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    if (sale.status !== "initiated") {
      throw new Error(`Sale #${saleId} is already ${sale.status}`);
    }

    logger.info(`[SaleState] Marking sale #${saleId} as paid`);

    // --- STEP 1: Batch Deduction (Respect user selection) ---
    const deductions = [];
    for (const item of sale.saleItems) {
      if (item.batchId) {
        // ✅ User selected a specific batch – deduct from that batch directly
        const result = await this.batchStateService.deductFromBatch(
          item.batchId,
          item.weightKg,
          "sale",
          {
            saleId: sale.id,
            notes: `Manual batch selection for sale #${sale.id} (batch: ${item.batch.batchCode})`,
          },
          user,
          queryRunner,
        );
        deductions.push({ saleItem: item, deductions: [result] });
      } else {
        // ✅ No batch selected – use FIFO
        const result = await this.batchStateService.fifoDeduct(
          item.meat.id,
          item.weightKg,
          "sale",
          {
            saleId: sale.id,
            notes: `Sale #${sale.id} - ${item.meat.name} (FIFO)`,
          },
          user,
          queryRunner,
        );
        deductions.push({ saleItem: item, deductions: result });
      }
    }

    // --- STEP 2: Replace sale items with batch-specific items ---
    // Remove old items
    for (const item of sale.saleItems) {
      await removeDb(saleItemRepo, item, { queryRunner });
    }

    // Create new items with batch assignments
    const newSaleItems = [];
    for (const deductionGroup of deductions) {
      const originalItem = deductionGroup.saleItem;
      for (const d of deductionGroup.deductions) {
        const newItem = saleItemRepo.create({
          weightKg: d.deductedWeight,
          unitPrice: originalItem.unitPrice,
          discount: originalItem.discount || 0,
          tax: originalItem.tax || 0,
          lineTotal:
            originalItem.unitPrice * d.deductedWeight -
            (originalItem.discount || 0) +
            (originalItem.tax || 0),
          sale: sale,
          meat: originalItem.meat,
          batch: d.batch,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const saved = await saveDb(saleItemRepo, newItem, { queryRunner });
        newSaleItems.push(saved);
      }
    }

    // --- STEP 3: Update sale total ---
    let newTotal = 0;
    for (const item of newSaleItems) {
      newTotal += item.lineTotal;
    }
    if (sale.loyaltyRedeemed > 0) {
      newTotal -= sale.loyaltyRedeemed;
    }
    sale.totalAmount = Math.round(newTotal * 100) / 100;
    sale.saleItems = newSaleItems;

    // --- STEP 4: Loyalty Points (Earn) ---
    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    let pointsEarned = 0;
    if (loyaltyEnabled && sale.customer) {
      const rate = await system.getLoyaltyPointRate();
      const netSpend = sale.totalAmount - (sale.loyaltyRedeemed || 0);
      pointsEarned = Math.floor(netSpend / rate);
      sale.pointsEarn = pointsEarned;
    }

    // --- STEP 5: Loyalty Points (Redeem & Earn) ---
    if (sale.customer) {
      const customerRepo = this._getRepo(queryRunner, Customer);
      const customer = await customerRepo.findOne({
        where: { id: sale.customer.id },
      });
      if (customer) {
        // Earn points
        if (pointsEarned > 0) {
          const oldBalance = customer.loyaltyPointsBalance;
          customer.loyaltyPointsBalance += pointsEarned;
          customer.lifetimePointsEarned =
            (customer.lifetimePointsEarned || 0) + pointsEarned;
          customer.updatedAt = new Date();
          await updateDb(customerRepo, customer, { queryRunner });

          // Create earn transaction
          const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);
          const tx = loyaltyRepo.create({
            pointsChange: pointsEarned,
            transactionType: "earn",
            notes: `Sale #${sale.id}`,
            customer: customer,
            sale: sale,
            timestamp: new Date(),
          });
          await saveDb(loyaltyRepo, tx, { queryRunner });
        }

        // Redeem points
        if (sale.loyaltyRedeemed > 0) {
          const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);
          const redeemTx = loyaltyRepo.create({
            pointsChange: -sale.loyaltyRedeemed,
            transactionType: "redeem",
            notes: `Redeemed on Sale #${sale.id}`,
            customer: customer,
            sale: sale,
            timestamp: new Date(),
          });
          await saveDb(loyaltyRepo, redeemTx, { queryRunner });
        }
      }
    }

    // --- STEP 6: Update sale status to paid ---
    sale.status = "paid";
    sale.updatedAt = new Date();
    const paidSale = await updateDb(saleRepo, sale, { queryRunner });

    // --- STEP 7: Audit log ---
    await auditLogger.logUpdate(
      "Sale",
      saleId,
      { status: "initiated" },
      { status: "paid" },
      user,
    );

    // --- STEP 8: Side effects ---
    try {
      // Large sale notification
      if (sale.totalAmount > 10000) {
        await this._notifyLargeSale(sale, user, queryRunner);
      }

      // Loyalty milestone
      if (sale.customer && pointsEarned > 0) {
        await this._checkLoyaltyMilestone(sale.customer, user, queryRunner);
      }

      // Receipt printing
      const printEnabled = await system.enableReceiptPrinting();
      if (printEnabled) {
        try {
          const PrinterService = require("../services/Printer");
          const printerService = new PrinterService();
          await printerService.printReceipt(saleId);
          logger.info(`[SaleState] Receipt printed for sale #${saleId}`);
        } catch (err) {
          logger.error(
            `[SaleState] Failed to print receipt for sale #${saleId}:`,
            err,
          );
        }
      }

      // Cash drawer
      const drawerEnabled = await system.enableCashDrawer();
      if (drawerEnabled && sale.paymentMethod === "cash") {
        try {
          const CashDrawerService = require("../services/CashDrawer");
          const cashDrawerService = new CashDrawerService();
          await cashDrawerService.openDrawer("sale");
          logger.info(`[SaleState] Cash drawer opened for sale #${saleId}`);
        } catch (err) {
          logger.error(
            `[SaleState] Failed to open cash drawer for sale #${saleId}:`,
            err,
          );
        }
      }
    } catch (err) {
      logger.error(
        `[SaleState] Non-critical side effects failed for sale #${saleId}:`,
        err,
      );
    }

    logger.info(`[SaleState] Sale #${saleId} paid successfully`);
    return paidSale;
  }

  /**
   * Refund a sale – reverse all stock deductions and loyalty points
   * @param {number} saleId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async refundSale(saleId, reason = "", user = "system", queryRunner = null) {
    const {
      updateDb,
      saveDb,
      removeDb,
    } = require("../utils/dbUtils/dbActions");

    const saleRepo = this._getRepo(queryRunner, Sale);
    const saleItemRepo = this._getRepo(queryRunner, SaleItem);

    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["saleItems", "saleItems.batch", "saleItems.meat", "customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    if (sale.status !== "paid") {
      throw new Error(`Cannot refund sale with status "${sale.status}"`);
    }

    logger.info(`[SaleState] Refunding sale #${saleId}`);

    // --- STEP 1: Reverse stock for each sale item (add back to batch) ---
    for (const item of sale.saleItems) {
      if (item.batch) {
        await this.batchStateService.addToBatch(
          item.batch.id,
          item.weightKg,
          "refund",
          { saleId: sale.id, notes: `Refund of sale #${sale.id}` },
          user,
          queryRunner,
        );
      } else {
        logger.warn(
          `[SaleState] Sale item #${item.id} has no batch, skipping stock reversal`,
        );
      }
    }

    // --- STEP 2: Reverse loyalty points (if any) ---
    if (sale.pointsEarn > 0 && sale.customer) {
      const customerRepo = this._getRepo(queryRunner, Customer);
      const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);

      const customer = await customerRepo.findOne({
        where: { id: sale.customer.id },
      });
      if (customer) {
        const oldBalance = customer.loyaltyPointsBalance;
        customer.loyaltyPointsBalance -= sale.pointsEarn;
        customer.updatedAt = new Date();
        await updateDb(customerRepo, customer, { queryRunner });

        // Create reversal transaction
        const tx = loyaltyRepo.create({
          pointsChange: -sale.pointsEarn,
          transactionType: "refund",
          notes: `Refund of sale #${sale.id} - ${reason}`,
          customer: customer,
          sale: sale,
          timestamp: new Date(),
        });
        await saveDb(loyaltyRepo, tx, { queryRunner });

        await auditLogger.logUpdate(
          "Customer",
          customer.id,
          { loyaltyPointsBalance: oldBalance },
          { loyaltyPointsBalance: customer.loyaltyPointsBalance },
          user,
        );
      }
    }

    // --- STEP 3: Update sale status ---
    sale.status = "refunded";
    sale.notes = sale.notes
      ? `${sale.notes}\nRefunded: ${reason}`
      : `Refunded: ${reason}`;
    sale.updatedAt = new Date();
    const refundedSale = await updateDb(saleRepo, sale, { queryRunner });

    // --- STEP 4: Audit log ---
    await auditLogger.logUpdate(
      "Sale",
      saleId,
      { status: "paid" },
      { status: "refunded" },
      user,
    );

    logger.info(`[SaleState] Sale #${saleId} refunded successfully`);
    return refundedSale;
  }

  /**
   * Void a sale (before payment) – no stock changes
   * @param {number} saleId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async voidSale(saleId, reason = "", user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");

    const saleRepo = this._getRepo(queryRunner, Sale);

    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["saleItems", "customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    if (sale.status !== "initiated") {
      throw new Error(`Cannot void a sale with status "${sale.status}"`);
    }

    logger.info(`[SaleState] Voiding sale #${saleId}`);

    sale.status = "voided";
    sale.notes = sale.notes
      ? `${sale.notes}\nVoided: ${reason}`
      : `Voided: ${reason}`;
    sale.updatedAt = new Date();

    const voidedSale = await updateDb(saleRepo, sale, { queryRunner });

    await auditLogger.logUpdate(
      "Sale",
      saleId,
      { status: "initiated" },
      { status: "voided" },
      user,
    );

    logger.info(`[SaleState] Sale #${saleId} voided successfully`);
    return voidedSale;
  }

  // --- Helper methods for side effects ---

  /**
   * Notify about large sale
   * @private
   */
  async _notifyLargeSale(sale, user, queryRunner) {
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Large Sale Alert",
          message: `Sale #${sale.id} amount: ₱${sale.totalAmount.toFixed(2)}`,
          type: "sale",
          metadata: { saleId: sale.id, amount: sale.totalAmount },
        },
        user,
        queryRunner,
      );
    } catch (err) {
      logger.error(`[SaleState] Failed to send large sale notification:`, err);
    }
  }

  /**
   * Check loyalty milestone and notify
   * @private
   */
  async _checkLoyaltyMilestone(customer, user, queryRunner) {
    // ✅ Optionally use system thresholds for flexibility
    // const vipThreshold = await system.loyaltyVipThreshold();
    // const eliteThreshold = await system.loyaltyEliteThreshold();
    // For now, keep simple check for demonstration
    const thresholds = [100, 500, 1000, 5000];
    const current = customer.lifetimePointsEarned || 0;

    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Loyalty Milestone",
          message: `${customer.name} has earned points! Total: ${customer.lifetimePointsEarned}`,
          type: "success",
          metadata: {
            customerId: customer.id,
            points: customer.loyaltyPointsBalance,
          },
        },
        user,
        queryRunner,
      );
    } catch (err) {
      logger.error(
        `[SaleState] Failed to send loyalty milestone notification:`,
        err,
      );
    }
  }
}

module.exports = { SaleStateService };
