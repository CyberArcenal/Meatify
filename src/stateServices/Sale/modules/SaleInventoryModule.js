// src/stateServices/sale/modules/SaleInventoryModule.js
//@ts-check
const { logger } = require("../../../utils/logger");

const SaleItem = require("../../../entities/SaleItem");
const InventoryMovement = require("../../../entities/InventoryMovement");
const batchService = require("../../../services/Batch");

/**
 * SaleInventoryModule - Handles inventory operations for sale events.
 * This includes stock deduction (FIFO or manual) and stock reversal (restock or waste).
 */
class SaleInventoryModule {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.saleItemRepo = dataSource.getRepository(SaleItem);
    this.movementRepo = dataSource.getRepository(InventoryMovement);
    this.batchService = batchService;
  }

  /**
   * Helper: get repository (transactional)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Deduct stock from batches (FIFO or manual batch selection)
   * @param {Object} sale - The sale entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ newSaleItems: Array, recalculatedDiscount: number }>}
   */
  async deductStock(sale, user = "system", queryRunner = null) {
    const { updateDb, saveDb, removeDb } = require("../../../utils/dbUtils/dbActions");
    const saleItemRepo = this._getRepo(queryRunner, this.saleItemRepo.target);

    // ─── STEP 1: Deduct from batches ────────────────────────────
    const deductions = [];
    for (const item of sale.saleItems) {
      if (item.batchId) {
        // Manual batch selection
        const result = await this.batchService.deductFromBatch(
          item.batchId,
          item.weightKg,
          "sale",
          {
            saleId: sale.id,
            notes: `Manual batch selection for sale #${sale.id} (batch: ${item.batch?.batchCode})`,
          },
          user,
          queryRunner
        );
        deductions.push({ saleItem: item, deductions: [result] });
      } else {
        // FIFO deduction
        const result = await this.batchService.fifoDeduct(
          item.meat.id,
          item.weightKg,
          "sale",
          {
            saleId: sale.id,
            notes: `Sale #${sale.id} - ${item.meat.name} (FIFO)`,
          },
          user,
          queryRunner
        );
        deductions.push({ saleItem: item, deductions: result });
      }
    }

    // ─── STEP 2: Replace sale items with batch-specific items ──
    // Remove old items
    for (const item of sale.saleItems) {
      await removeDb(saleItemRepo, item, { queryRunner });
    }

    // Create new items with batch assignments
    const newSaleItems = [];
    const globalDiscount = sale.globalDiscount || 0;
    let recalculatedDiscount = 0;

    for (const deductionGroup of deductions) {
      const originalItem = deductionGroup.saleItem;
      for (const d of deductionGroup.deductions) {
        const discountPercent = originalItem.discount || 0;
        const taxPercent = originalItem.tax || 0;
        const unitPrice = originalItem.unitPrice;
        const weight = d.deductedWeight;

        const subtotal = unitPrice * weight;
        const discountAmount = subtotal * (discountPercent / 100);
        const taxable = subtotal - discountAmount;
        const taxAmount = taxable * (taxPercent / 100);
        let lineTotal = taxable + taxAmount;
        recalculatedDiscount += discountAmount;

        // Apply global discount
        const discountFactor = 1 - globalDiscount / 100;
        lineTotal = lineTotal * discountFactor;

        const newItem = saleItemRepo.create({
          weightKg: weight,
          unitPrice: unitPrice,
          discount: discountPercent,
          tax: taxPercent,
          lineTotal: lineTotal,
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

    return { newSaleItems, recalculatedDiscount };
  }

  /**
   * Reverse stock for a refunded sale (restock or waste)
   * @param {Object} sale - The sale entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async reverseStock(sale, user = "system", queryRunner = null) {
    const { updateDb, saveDb, removeDb } = require("../../../utils/dbUtils/dbActions");
    const movementRepo = this._getRepo(queryRunner, this.movementRepo.target);

    // Get refund metadata
    const refundMeta = sale._refundMeta || {
      restock: true,
      restockItems: sale.saleItems.map((_, i) => ({ itemIndex: i, restock: true })),
    };

    const restockItemsMap = new Map();
    refundMeta.restockItems.forEach((ri) => {
      restockItemsMap.set(ri.itemIndex, ri.restock);
    });

    for (let i = 0; i < sale.saleItems.length; i++) {
      const item = sale.saleItems[i];
      const shouldRestock = refundMeta.restock
        ? restockItemsMap.get(i) !== false
        : restockItemsMap.get(i) === true;

      if (item.batch) {
        if (shouldRestock) {
          // Restock: add back to batch
          await this.batchService.addToBatch(
            item.batch.id,
            item.weightKg,
            "refund",
            { saleId: sale.id, notes: `Refund of sale #${sale.id}` },
            user,
            queryRunner
          );
          logger.info(`[SaleInventory] Restocked ${item.weightKg}kg from item #${i}`);
        } else {
          // Waste: create waste movement
          const movement = movementRepo.create({
            movementType: "waste",
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
          logger.info(`[SaleInventory] Marked ${item.weightKg}kg as waste from item #${i}`);
        }
      } else {
        logger.warn(`[SaleInventory] Sale item #${item.id} has no batch, skipping stock operation`);
      }
    }
  }
}

module.exports = SaleInventoryModule;