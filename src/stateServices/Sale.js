// src/stateServices/SaleStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Sale = require("../entities/Sale");
const SaleItem = require("../entities/SaleItem");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const notificationService = require("../services/Notification");
const system = require("../utils/system");
const CashDrawerService = require("../services/CashDrawer");
const PrinterService = require("../services/Printer");
const batchService = require("../services/Batch");
const InventoryMovement = require("../entities/InventoryMovement");

/**
 * SaleStateService handles side effects for sale state transitions.
 * It does NOT update the sale status – that is done by the service or subscriber.
 * All methods here react to status changes (onPaid, onRefunded, onVoided)
 * and perform necessary business logic (stock deduction, loyalty, notifications, etc.).
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
    this.batchService = batchService;
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
   * React to a sale becoming 'paid'.
   * This is called after the status has already been updated to 'paid'.
   * It handles FIFO batch deduction, loyalty points, notifications, receipt printing, cash drawer.
   * @param {number} saleId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onPaid(saleId, user = "system", queryRunner = null) {
    const {
      updateDb,
      saveDb,
      removeDb,
    } = require("../utils/dbUtils/dbActions");

    const saleRepo = this._getRepo(queryRunner, Sale);
    const saleItemRepo = this._getRepo(queryRunner, SaleItem);

    // Load the sale with its items and customer
    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["saleItems", "saleItems.meat", "saleItems.batch", "customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    // If the sale is not 'paid', we still process (idempotent) but we warn.
    if (sale.status !== "paid") {
      logger.warn(
        `[SaleState] onPaid called for sale #${saleId} with status '${sale.status}' – expected 'paid'. Proceeding anyway.`,
      );
    }

    logger.info(`[SaleState] Processing onPaid for sale #${saleId}`);

    // --- STEP 1: Batch Deduction (Respect user selection) ---
    const deductions = [];
    for (const item of sale.saleItems) {
      if (item.batchId) {
        // User selected a specific batch – deduct from that batch directly
        const result = await this.batchService.deductFromBatch(
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
        // No batch selected – use FIFO
        const result = await this.batchService.fifoDeduct(
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

    // --- STEP 3: Update sale total (recalculate) ---
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

    // --- STEP 5: Apply loyalty points (redeem & earn) ---
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

    // --- STEP 6: Save the updated sale (with new total and items) ---
    // Note: We do not change the status here; it should already be 'paid'.
    // We still need to persist the updated total and items.
    const updatedSale = await updateDb(saleRepo, sale, { queryRunner });

    // --- STEP 7: Audit log (status change is already logged elsewhere) ---
    await auditLogger.logUpdate(
      "Sale",
      saleId,
      { previousState: "initiated" }, // just for context
      { newState: "paid", total: sale.totalAmount },
      user,
    );

    // --- STEP 8: Non-critical side effects ---
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

    logger.info(`[SaleState] onPaid completed for sale #${saleId}`);
    return updatedSale;
  }

  /**
   * React to a sale becoming 'refunded'.
   * Reverses stock deductions and loyalty points.
   * @param {number} saleId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRefunded(saleId, reason = "", user = "system", queryRunner = null) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

    const saleRepo = this._getRepo(queryRunner, Sale);
    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["saleItems", "saleItems.batch", "saleItems.meat", "customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    // ✅ Get refund metadata
    const refundMeta = sale._refundMeta || {
      restock: true,
      restockItems: sale.saleItems.map((_, i) => ({
        itemIndex: i,
        restock: true,
      })),
      reason: reason,
    };

    const restockItemsMap = new Map();
    refundMeta.restockItems.forEach((ri) => {
      restockItemsMap.set(ri.itemIndex, ri.restock);
    });

    logger.info(`[SaleState] Processing onRefunded for sale #${saleId}`, {
      restock: refundMeta.restock,
      items: refundMeta.restockItems,
    });

    // --- STEP 1: Reverse stock for each sale item ---
    for (let i = 0; i < sale.saleItems.length; i++) {
      const item = sale.saleItems[i];
      const shouldRestock = refundMeta.restock
        ? restockItemsMap.get(i) !== false // If restock=true, default to true
        : restockItemsMap.get(i) === true; // If restock=false, only restock if explicitly true

      if (item.batch) {
        if (shouldRestock) {
          // ✅ Restock: add back to batch
          await this.batchService.addToBatch(
            item.batch.id,
            item.weightKg,
            "refund",
            { saleId: sale.id, notes: `Refund of sale #${sale.id}` },
            user,
            queryRunner,
          );
          logger.info(
            `[SaleState] Restocked ${item.weightKg}kg from item #${i} (batch #${item.batch.id})`,
          );
        } else {
          // ❌ Waste: do NOT restock, create waste movement
          const movementRepo = this._getRepo(queryRunner, InventoryMovement);
          const movement = movementRepo.create({
            movementType: "waste", // ✅ New movement type
            qtyChange: -item.weightKg,
            notes: `Waste from refund #${sale.id} - item #${i}`,
            meat: item.meat,
            batch: item.batch,
            sale: sale,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await saveDb(movementRepo, movement, { queryRunner });
          logger.info(
            `[SaleState] Marked ${item.weightKg}kg as waste from item #${i} (batch #${item.batch.id})`,
          );
        }
      } else {
        logger.warn(
          `[SaleState] Sale item #${item.id} has no batch, skipping stock operation`,
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

    // --- STEP 3: Audit log (status already changed) ---
    await auditLogger.logUpdate(
      "Sale",
      saleId,
      { previousState: "paid" },
      { newState: "refunded", reason },
      user,
    );

    logger.info(`[SaleState] onRefunded completed for sale #${saleId}`);
    return sale;
  }

  /**
   * React to a sale becoming 'voided' (before payment).
   * No stock changes – just logs and notifications.
   * @param {number} saleId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onVoided(saleId, reason = "", user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");

    const saleRepo = this._getRepo(queryRunner, Sale);
    const sale = await saleRepo.findOne({
      where: { id: saleId },
      relations: ["customer"],
    });
    if (!sale) {
      throw new Error(`Sale #${saleId} not found`);
    }

    if (sale.status !== "voided") {
      logger.warn(
        `[SaleState] onVoided called for sale #${saleId} with status '${sale.status}' – expected 'voided'. Proceeding anyway.`,
      );
    }

    logger.info(`[SaleState] Processing onVoided for sale #${saleId}`);

    // --- STEP 1: Audit log ---
    await auditLogger.logUpdate(
      "Sale",
      saleId,
      { previousState: "initiated" },
      { newState: "voided", reason },
      user,
    );

    // --- STEP 2: Notification (optional) ---
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Sale Voided",
          message: `Sale #${saleId} was voided. Reason: ${reason || "No reason provided."}`,
          type: "info",
          metadata: { saleId, reason },
        },
        user,
        queryRunner,
      );
    } catch (err) {
      logger.error(`[SaleState] Failed to send void notification:`, err);
    }

    logger.info(`[SaleState] onVoided completed for sale #${saleId}`);
    return sale;
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
    return; // Disabled for now
    
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
