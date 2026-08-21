// src/main/ipc/analytics/inventoryReports/index.ipc.js - Inventory Reports Analytics Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class InventoryReportsHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 DATA HANDLERS
    this.getInventoryData = this.importHandler("./get_data.ipc");
    this.getInventorySummary = this.importHandler("./get_summary.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[InventoryReportsHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`InventoryReportsHandler: ${method}`, { params });
      }

      switch (method) {
        case "getInventoryData":
          return await this.getInventoryData(params);
        case "getInventorySummary":
          return await this.getInventorySummary(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("InventoryReportsHandler error:", error);
      if (logger) {
        logger.error("InventoryReportsHandler error:", error);
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
const inventoryReportsHandler = new InventoryReportsHandler();

ipcMain.handle(
  "inventoryReports",
  withErrorHandling(
    inventoryReportsHandler.handleRequest.bind(inventoryReportsHandler),
    "IPC:inventoryReports"
  )
);

module.exports = { InventoryReportsHandler, inventoryReportsHandler };