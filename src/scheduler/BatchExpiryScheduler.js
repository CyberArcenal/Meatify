// src/scheduler/BatchExpiryScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const batchService = require("../services/Batch");
const { BrowserWindow } = require("electron");
const { notifyExpiringBatches } = require("../utils/system");
const { BaseScheduler } = require("./BaseScheduler");

class BatchExpiryScheduler extends BaseScheduler {
  constructor() {
    super({
      name: 'BatchExpiryScheduler',
      checkInterval: 6 * 60 * 60 * 1000, // 6 hours
      startupDelay: 30000,
      cooldownHours: 6,
    });
  }

  _sendToRenderers(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
  }

  async execute() {
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
        await this._sendNotification({
          title: "Expired Batches Marked",
          message: `${result.count} batch(es) have been marked as expired.`,
          type: "warning",
          metadata: { count: result.count },
        });
        this._sendToRenderers("batch:expired", {
          count: result.count,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Check expiring soon
      const stats = await batchService.getStatistics();
      if (stats.expiringSoon > 0) {
        logger.info(`[BATCH EXPIRY] ${stats.expiringSoon} batches expiring within 7 days`);
        const title = `Batches Expiring Soon (${stats.expiringSoon} batches)`;
        const sent = await this._sendNotification({
          title,
          message: `${stats.expiringSoon} batch(es) will expire within 7 days.`,
          type: "warning",
          metadata: { count: stats.expiringSoon },
        });
        if (sent) {
          this._sendToRenderers("batch:expiringSoon", {
            count: stats.expiringSoon,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      logger.error("[BATCH EXPIRY] Error:", error);
    }
  }

  async forceCheck() {
    logger.info("🔄 Force batch expiry check triggered");
    await this.execute();
  }
}

module.exports = BatchExpiryScheduler;