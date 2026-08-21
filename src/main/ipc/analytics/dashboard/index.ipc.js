// src/main/ipc/dashboard/index.ipc.js - Dashboard Analytics Handler (Offline Only)
//@ts-check
const { ipcMain } = require("electron");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");


class DashboardHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 DATA HANDLERS
    this.getDashboardSummary = this.importHandler("./get_summary.ipc");
    this.getSalesChart = this.importHandler("./get_chart.ipc");
    this.getLowStockAlert = this.importHandler("./get_low_stock.ipc");
    this.getRecentActivities = this.importHandler("./get_activities.ipc");
    this.getTopProducts = this.importHandler("./get_top_products.ipc");
    this.getCustomerStats = this.importHandler("./get_customer_stats.ipc");
    this.getExpiringBatches = this.importHandler("./get_expiring.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[DashboardHandler] Failed to load handler: ${path}`, error.message);
      return async () => ({
        status: false,
        message: `Handler not implemented: ${path}`,
        data: null,
      });
    }
  }

  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      if (logger) {
        logger.info(`DashboardHandler: ${method}`, { params });
      }

      switch (method) {
        case "getDashboardSummary":
          return await this.getDashboardSummary(params);
        case "getSalesChart":
          return await this.getSalesChart(params);
        case "getLowStockAlert":
          return await this.getLowStockAlert(params);
        case "getRecentActivities":
          return await this.getRecentActivities(params);
        case "getTopProducts":
          return await this.getTopProducts(params);
        case "getCustomerStats":
          return await this.getCustomerStats(params);
        case "getExpiringBatches":
          return await this.getExpiringBatches(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("DashboardHandler error:", error);
      if (logger) {
        logger.error("DashboardHandler error:", error);
      }
      return {
        status: false,
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }
}

// Register IPC handler
const dashboardHandler = new DashboardHandler();

ipcMain.handle(
  "dashboard",
  withErrorHandling(
    dashboardHandler.handleRequest.bind(dashboardHandler),
    "IPC:dashboard"
  )
);

module.exports = { DashboardHandler, dashboardHandler };