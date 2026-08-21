// src/main/ipc/analytics/salesReport/index.ipc.js - Sales Report Analytics Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class SalesReportHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 DATA HANDLERS
    this.getSalesReportData = this.importHandler("./get_data.ipc");
    this.getSalesReportSummary = this.importHandler("./get_summary.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[SalesReportHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`SalesReportHandler: ${method}`, { params });
      }

      switch (method) {
        case "getSalesReportData":
          return await this.getSalesReportData(params);
        case "getSalesReportSummary":
          return await this.getSalesReportSummary(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("SalesReportHandler error:", error);
      if (logger) {
        logger.error("SalesReportHandler error:", error);
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
const salesReportHandler = new SalesReportHandler();

ipcMain.handle(
  "salesReport",
  withErrorHandling(
    salesReportHandler.handleRequest.bind(salesReportHandler),
    "IPC:salesReport"
  )
);

module.exports = { SalesReportHandler, salesReportHandler };