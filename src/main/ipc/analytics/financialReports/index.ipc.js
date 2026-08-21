// src/main/ipc/analytics/financialReports/index.ipc.js - Financial Reports Analytics Handler (Offline Only)
//@ts-check
const { ipcMain } = require("electron");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");

class FinancialReportsHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 DATA HANDLERS
    this.getFinancialData = this.importHandler("./get_data.ipc");
    this.getFinancialSummary = this.importHandler("./get_summary.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[FinancialReportsHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`FinancialReportsHandler: ${method}`, { params });
      }

      switch (method) {
        case "getFinancialData":
          return await this.getFinancialData(params);
        case "getFinancialSummary":
          return await this.getFinancialSummary(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("FinancialReportsHandler error:", error);
      if (logger) {
        logger.error("FinancialReportsHandler error:", error);
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
const financialReportsHandler = new FinancialReportsHandler();

ipcMain.handle(
  "financialReports",
  withErrorHandling(
    financialReportsHandler.handleRequest.bind(financialReportsHandler),
    "IPC:financialReports"
  )
);

module.exports = { FinancialReportsHandler, financialReportsHandler };