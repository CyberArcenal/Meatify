// src/main/ipc/analytics/returnRefundReports/index.ipc.js - Return Refund Reports Analytics Handler (Offline Only)
//@ts-check
const { ipcMain } = require("electron");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");

class ReturnRefundReportsHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 DATA HANDLERS
    this.getReturnRefundData = this.importHandler("./get_data.ipc");
    this.getReturnRefundSummary = this.importHandler("./get_summary.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[ReturnRefundReportsHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`ReturnRefundReportsHandler: ${method}`, { params });
      }

      switch (method) {
        case "getReturnRefundData":
          return await this.getReturnRefundData(params);
        case "getReturnRefundSummary":
          return await this.getReturnRefundSummary(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("ReturnRefundReportsHandler error:", error);
      if (logger) {
        logger.error("ReturnRefundReportsHandler error:", error);
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
const returnRefundReportsHandler = new ReturnRefundReportsHandler();

ipcMain.handle(
  "returnRefundReports",
  withErrorHandling(
    returnRefundReportsHandler.handleRequest.bind(returnRefundReportsHandler),
    "IPC:returnRefundReports"
  )
);

module.exports = { ReturnRefundReportsHandler, returnRefundReportsHandler };