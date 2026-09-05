// src/scheduler/DataRetentionScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const { dataRetentionDays } = require("../utils/system");
const saleService = require("../services/Sale");
const inventoryMovementService = require("../services/InventoryMovement");
const loyaltyTransactionService = require("../services/LoyaltyTransaction");
const { BaseScheduler } = require("./BaseScheduler");

class DataRetentionScheduler extends BaseScheduler {
  constructor() {
    super({
      name: 'DataRetentionScheduler',
      checkInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
      startupDelay: 30000, // 30 seconds
      cooldownMinutes: 7 * 24 * 60, // 7 days
    });
  }

  async execute() {
    try {
      const retentionDays = await dataRetentionDays();
      logger.info(`[DATA RETENTION] Cleaning up data older than ${retentionDays} days...`);

      // Ensure database is ready
      if (!this._isDatabaseReady()) {
        logger.warn("[DATA RETENTION] Database not ready, skipping cleanup");
        return;
      }

      const results = {
        sales: 0,
        movements: 0,
        loyalty: 0,
      };

      // Clean old sales
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
        logger.info(`[DATA RETENTION] Cleaned ${total} records`);

        // ✅ Deduplicated notification
        await this._sendNotification({
          title: "Data Cleanup Completed",
          message: `Cleaned up ${total} old records older than ${retentionDays} days.`,
          type: "info",
          notificationType: "data_retention_cleanup",
          metadata: { total, ...results, retentionDays },
          cooldownMinutes: 7 * 24 * 60, // Weekly
        });
      } else {
        logger.debug("[DATA RETENTION] No old data to clean up");
      }
    } catch (error) {
      logger.error("[DATA RETENTION] Error cleaning up data:", error);
    }
  }
}

module.exports = DataRetentionScheduler;