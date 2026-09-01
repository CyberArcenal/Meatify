// src/scheduler/BatchExpiryScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const batchService = require("../services/Batch");
const notificationService = require("../services/Notification");
const { BrowserWindow } = require("electron");
const { notifyExpiringBatches } = require("../utils/system");

class BatchExpiryScheduler {
  constructor() {
    this.checkInterval = 6 * 60 * 60 * 1000; // 6 hours
    this.intervalId = null;
  }

  _sendToRenderers(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
  }

  async start() {
    logger.info("🚀 Starting Batch Expiry Scheduler...");
    // Run immediately on startup
    await this.checkExpiredBatches();
    // Then every 6 hours
    this.intervalId = setInterval(async () => {
      await this.checkExpiredBatches();
    }, this.checkInterval);
    logger.info(`✅ Batch expiry check scheduled (every ${this.checkInterval / (1000 * 60 * 60)} hours)`);
    return this;
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("🛑 Batch Expiry Scheduler Stopped");
    }
  }

  async checkExpiredBatches() {
    try {
      const enabled = await notifyExpiringBatches();
      if (!enabled) {
        logger.debug("[BATCH EXPIRY] Expiry notifications disabled");
        return;
      }

      logger.info("[BATCH EXPIRY] Checking for expired batches...");

      // 1. Mark expired batches
      const result = await batchService.cleanExpiredBatches("system");
      if (result.count > 0) {
        logger.info(`[BATCH EXPIRY] Marked ${result.count} batches as expired`);
        
        await notificationService.create({
          userId: 1,
          title: "Expired Batches Marked",
          message: `${result.count} batch(es) have been marked as expired.`,
          type: "warning",
          metadata: { count: result.count },
        }, "system");

        this._sendToRenderers("batch:expired", {
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Check expiring soon (within 7 days)
      const stats = await batchService.getStatistics();
      if (stats.expiringSoon > 0) {
        logger.info(`[BATCH EXPIRY] ${stats.expiringSoon} batches expiring within 7 days`);
        
        await notificationService.create({
          userId: 1,
          title: "Batches Expiring Soon",
          message: `${stats.expiringSoon} batch(es) will expire within 7 days.`,
          type: "warning",
          metadata: { count: stats.expiringSoon },
        }, "system");

        this._sendToRenderers("batch:expiringSoon", {
          count: stats.expiringSoon,
          batches: stats.lowStockDetails?.filter(b => b.expiringSoon),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("[BATCH EXPIRY] Error checking expired batches:", error);
    }
  }

  async forceCheck() {
    logger.info("🔄 Force batch expiry check triggered");
    await this.checkExpiredBatches();
  }
}

module.exports = BatchExpiryScheduler;