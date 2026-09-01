// src/scheduler/DataRetentionScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const { dataRetentionDays } = require("../utils/system");
const notificationService = require("../services/Notification");
const saleService = require("../services/Sale");
const inventoryMovementService = require("../services/InventoryMovement");
const loyaltyTransactionService = require("../services/LoyaltyTransaction");

class DataRetentionScheduler {
  constructor() {
    this.intervalId = null;
  }

  async start() {
    logger.info("🚀 Starting Data Retention Scheduler...");
    // Run weekly (every 7 days)
    this.intervalId = setInterval(async () => {
      await this.cleanupOldData();
    }, 7 * 24 * 60 * 60 * 1000);
    // Also run on startup
    setTimeout(() => this.cleanupOldData(), 30000);
    logger.info("✅ Data retention scheduled (weekly)");
    return this;
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("🛑 Data Retention Scheduler Stopped");
    }
  }

  async cleanupOldData() {
    try {
      const retentionDays = await dataRetentionDays();
      logger.info(`[DATA RETENTION] Cleaning up data older than ${retentionDays} days...`);

      const results = {
        sales: 0,
        movements: 0,
        loyalty: 0,
      };

      // Clean old sales (soft delete via void)
      const salesResult = await saleService.cleanOldSales(retentionDays);
      results.sales = salesResult.count || 0;

      // Clean old inventory movements
      const movementResult = await inventoryMovementService.cleanOldMovements(retentionDays);
      results.movements = movementResult.count || 0;

      // Clean old loyalty transactions
      const loyaltyResult = await loyaltyTransactionService.cleanOldTransactions(retentionDays);
      results.loyalty = loyaltyResult.count || 0;

      const total = results.sales + results.movements + results.loyalty;

      if (total > 0) {
        logger.info(`[DATA RETENTION] Cleaned ${total} records (Sales: ${results.sales}, Movements: ${results.movements}, Loyalty: ${results.loyalty})`);
        
        await notificationService.create({
          userId: 1,
          title: "Data Cleanup Completed",
          message: `Cleaned up ${total} old records older than ${retentionDays} days.`,
          type: "info",
          metadata: results,
        }, "system");
      } else {
        logger.debug("[DATA RETENTION] No old data to clean up");
      }
    } catch (error) {
      logger.error("[DATA RETENTION] Error cleaning up data:", error);
    }
  }
}

module.exports = DataRetentionScheduler;