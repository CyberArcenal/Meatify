// src/scheduler/DailySalesReportScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const saleService = require("../services/Sale");
const system = require("../utils/system");
const { BaseScheduler } = require("./BaseScheduler");

class DailySalesReportScheduler extends BaseScheduler {
  constructor() {
    super({
      name: 'DailySalesReportScheduler',
      checkInterval: 24 * 60 * 60 * 1000, // 24 hours
      startupDelay: 5000,
      cooldownMinutes: 24 * 60, // 24 hours (only one report per day)
    });
  }

  async start() {
    if (!this.isEnabled) {
      logger.info(`⏸️ ${this.name} is disabled`);
      return this;
    }

    logger.info(`🚀 Starting ${this.name}...`);

    // Wait for database readiness
    if (!this._isDatabaseReady()) {
      logger.info(`⏳ ${this.name} waiting for database...`);
      const ready = await this._waitForDatabase(30000);
      if (!ready) {
        logger.warn(`⚠️ ${this.name} database not ready after 30s`);
        return this;
      }
    }

    // Calculate next run (tomorrow 1:00 AM)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(1, 0, 0, 0);
    const delay = tomorrow.getTime() - now.getTime();

    logger.info(`⏳ First daily report in ${Math.round(delay / (1000 * 60))} minutes`);

    // Schedule first run after delay
    this.startupTimeoutId = setTimeout(async () => {
      await this.execute();
      // Start periodic interval
      this.intervalId = setInterval(async () => {
        await this.execute();
      }, this.checkInterval);
      logger.info("✅ Daily sales report scheduled (every 24 hours)");
    }, delay);

    this._isRunning = true;
    return this;
  }

  async execute() {
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

      for (const [method, amount] of Object.entries(summary.byPaymentMethod)) {
        message += `${method}: ₱${amount.toFixed(2)}\n`;
      }

      // ✅ Deduplicated notification - once per day is enough
      await this._sendNotification({
        title: `Daily Sales Report - ${dateStr}`,
        message: message,
        type: "info",
        notificationType: "daily_sales_report",
        metadata: {
          date: dateStr,
          totalSales: summary.totalSales,
          totalAmount: summary.totalAmount,
          totalWeight: summary.totalWeight,
        },
        cooldownMinutes: 24 * 60, // Once per day
      });

      logger.info(`[DAILY REPORT] ✅ Daily report for ${dateStr} sent`);
    } catch (error) {
      logger.error("[DAILY REPORT] Error generating daily report:", error);
    }
  }

  async forceReport() {
    logger.info("🔄 Force daily report triggered");
    await this.execute();
  }
}

module.exports = DailySalesReportScheduler;