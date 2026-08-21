// src/main/ipc/analytics/customerInsights/index.ipc.js - Customer Insights Analytics Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class CustomerInsightsHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 DATA HANDLERS
    this.getCustomerInsightsData = this.importHandler("./get_data.ipc");
    this.getCustomerInsightsSummary = this.importHandler("./get_summary.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[CustomerInsightsHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`CustomerInsightsHandler: ${method}`, { params });
      }

      switch (method) {
        case "getCustomerInsightsData":
          return await this.getCustomerInsightsData(params);
        case "getCustomerInsightsSummary":
          return await this.getCustomerInsightsSummary(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("CustomerInsightsHandler error:", error);
      if (logger) {
        logger.error("CustomerInsightsHandler error:", error);
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
const customerInsightsHandler = new CustomerInsightsHandler();

ipcMain.handle(
  "customerInsights",
  withErrorHandling(
    customerInsightsHandler.handleRequest.bind(customerInsightsHandler),
    "IPC:customerInsights"
  )
);

module.exports = { CustomerInsightsHandler, customerInsightsHandler };