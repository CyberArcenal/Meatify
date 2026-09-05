// src/scheduler/LowStockAlertScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const batchService = require("../services/Batch");
const { notifyLowStock, lowStockThreshold } = require("../utils/system");
const { BrowserWindow } = require("electron");
const { BaseScheduler } = require("./BaseScheduler");

class LowStockAlertScheduler extends BaseScheduler {
  constructor() {
    super({
      name: 'LowStockAlertScheduler',
      checkInterval: 4 * 60 * 60 * 1000, // 4 hours
      startupDelay: 30000,
      cooldownHours: 6, // ✅ Don't send same notification within 6 hours
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
      const enabled = await notifyLowStock();
      if (!enabled) {
        logger.debug("[LOW STOCK] Low stock alerts disabled");
        return;
      }

      const stats = await batchService.getStatistics();
      const threshold = await lowStockThreshold();

      if (stats.lowStockBatches === 0) {
        logger.debug("[LOW STOCK] No low stock items found");
        return;
      }

      logger.info(`[LOW STOCK] ${stats.lowStockBatches} batches below threshold (${threshold}kg)`);

      let message = `⚠️ Low Stock Alert\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Threshold: ${threshold}kg\nBatches at risk: ${stats.lowStockBatches}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      for (const batch of stats.lowStockDetails || []) {
        message += `• ${batch.meatName || "Unknown"}\n`;
        message += `  Batch: ${batch.batchCode}\n`;
        message += `  Remaining: ${batch.remainingQuantity}kg\n\n`;
      }

      const title = `⚠️ Low Stock Alert (${stats.lowStockBatches} items)`;
      
      // ✅ Database check automatically prevents duplicates
      const sent = await this._sendNotification({
        title,
        message,
        type: "warning",
        metadata: {
          count: stats.lowStockBatches,
          threshold,
          batches: stats.lowStockDetails,
        },
      });

      if (sent) {
        this._sendToRenderers("inventory:lowStock", {
          count: stats.lowStockBatches,
          threshold,
          batches: stats.lowStockDetails,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("[LOW STOCK] Error:", error);
    }
  }

  async forceCheck() {
    logger.info("🔄 Force low stock check triggered");
    await this.execute();
  }
}

module.exports = LowStockAlertScheduler;