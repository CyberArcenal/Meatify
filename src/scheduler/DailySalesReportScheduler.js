// src/scheduler/DailySalesReportScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const saleService = require("../services/Sale");
const notificationService = require("../services/Notification");
const system = require("../utils/system");

class DailySalesReportScheduler {
  constructor() {
    this.intervalId = null;
    this.runTime = 60 * 60 * 1000; // 1 hour after midnight (1:00 AM)
  }

  async start() {
    logger.info("🚀 Starting Daily Sales Report Scheduler...");
    
    // Calculate next run (tomorrow 1:00 AM)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(1, 0, 0, 0);
    const delay = tomorrow.getTime() - now.getTime();

    logger.info(`⏳ First daily report in ${Math.round(delay / (1000 * 60))} minutes`);

    setTimeout(async () => {
      await this.generateDailyReport();
      this.intervalId = setInterval(async () => {
        await this.generateDailyReport();
      }, 24 * 60 * 60 * 1000);
      logger.info("✅ Daily sales report scheduled (every 24 hours)");
    }, delay);

    return this;
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("🛑 Daily Sales Report Scheduler Stopped");
    }
  }

  async generateDailyReport() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];

      logger.info(`[DAILY REPORT] Generating sales report for ${dateStr}...`);

      const summary = await saleService.getDailySalesSummary(dateStr);
      const company = await system.companyName();

      let message = `📊 Daily Sales Report - ${dateStr}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Total Sales: ${summary.totalSales}\n`;
      message += `Total Amount: ₱${summary.totalAmount.toFixed(2)}\n`;
      message += `Average Amount: ₱${summary.averageAmount.toFixed(2)}\n`;
      message += `Total Weight: ${summary.totalWeight.toFixed(2)}kg\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      // Payment methods breakdown
      for (const [method, amount] of Object.entries(summary.byPaymentMethod)) {
        message += `${method}: ₱${amount.toFixed(2)}\n`;
      }

      // Send to admin
      await notificationService.create({
        userId: 1,
        title: `Daily Sales Report - ${dateStr}`,
        message: message,
        type: "info",
        metadata: {
          date: dateStr,
          totalSales: summary.totalSales,
          totalAmount: summary.totalAmount,
          totalWeight: summary.totalWeight,
        },
      }, "system");

      logger.info(`[DAILY REPORT] ✅ Daily report for ${dateStr} sent`);
    } catch (error) {
      logger.error("[DAILY REPORT] Error generating daily report:", error);
    }
  }

  async forceReport() {
    logger.info("🔄 Force daily report triggered");
    await this.generateDailyReport();
  }
}

module.exports = DailySalesReportScheduler;