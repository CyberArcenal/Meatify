// src/main/ipc/analytics/dailySales/index.ipc.js - Daily Sales Analytics Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class DailySalesHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 DATA HANDLERS
    this.getDailySalesData = this.importHandler("./get_data.ipc");
    this.getDailySalesSummary = this.importHandler("./get_summary.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[DailySalesHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`DailySalesHandler: ${method}`, { params });
      }

      switch (method) {
        case "getDailySalesData":
          return await this.getDailySalesData(params);
        case "getDailySalesSummary":
          return await this.getDailySalesSummary(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("DailySalesHandler error:", error);
      if (logger) {
        logger.error("DailySalesHandler error:", error);
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
const dailySalesHandler = new DailySalesHandler();

ipcMain.handle(
  "dailySales",
  withErrorHandling(
    dailySalesHandler.handleRequest.bind(dailySalesHandler),
    "IPC:dailySales"
  )
);

module.exports = { DailySalesHandler, dailySalesHandler };