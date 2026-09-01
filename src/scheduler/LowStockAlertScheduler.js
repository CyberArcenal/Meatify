// src/scheduler/LowStockAlertScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const batchService = require("../services/Batch");
const notificationService = require("../services/Notification");
const { notifyLowStock, lowStockThreshold } = require("../utils/system");
const { BrowserWindow } = require("electron");

class LowStockAlertScheduler {
  constructor() {
    this.checkInterval = 4 * 60 * 60 * 1000; // 4 hours
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
    const enabled = await notifyLowStock();
    if (!enabled) {
      logger.info("⏸️ Low Stock Alert Scheduler is disabled");
      return this;
    }

    logger.info("🚀 Starting Low Stock Alert Scheduler...");
    await this.checkLowStock();
    this.intervalId = setInterval(async () => {
      await this.checkLowStock();
    }, this.checkInterval);
    logger.info(`✅ Low stock alert scheduled (every ${this.checkInterval / (1000 * 60 * 60)} hours)`);
    return this;
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("🛑 Low Stock Alert Scheduler Stopped");
    }
  }

  async checkLowStock() {
    try {
      const stats = await batchService.getStatistics();
      const threshold = await lowStockThreshold();

      if (stats.lowStockBatches === 0) {
        logger.debug("[LOW STOCK] No low stock items found");
        return;
      }

      logger.info(`[LOW STOCK] ${stats.lowStockBatches} batches below threshold (${threshold}kg)`);

      // Build message
      let message = `⚠️ Low Stock Alert\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Threshold: ${threshold}kg\n`;
      message += `Batches at risk: ${stats.lowStockBatches}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      for (const batch of stats.lowStockDetails || []) {
        message += `• ${batch.meatName || "Unknown"}\n`;
        message += `  Batch: ${batch.batchCode}\n`;
        message += `  Remaining: ${batch.remainingQuantity}kg\n\n`;
      }

      await notificationService.create({
        userId: 1,
        title: `⚠️ Low Stock Alert (${stats.lowStockBatches} items)`,
        message: message,
        type: "warning",
        metadata: {
          count: stats.lowStockBatches,
          threshold: threshold,
          batches: stats.lowStockDetails,
        },
      }, "system");

      this._sendToRenderers("inventory:lowStock", {
        count: stats.lowStockBatches,
        threshold: threshold,
        batches: stats.lowStockDetails,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error("[LOW STOCK] Error checking low stock:", error);
    }
  }

  async forceCheck() {
    logger.info("🔄 Force low stock check triggered");
    await this.checkLowStock();
  }
}

module.exports = LowStockAlertScheduler;