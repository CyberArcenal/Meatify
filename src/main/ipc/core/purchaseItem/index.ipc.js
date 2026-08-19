// src/main/ipc/core/purchaseItem/index.ipc.js - Purchase Item Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { AppDataSource } = require("../../db/data-source");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class PurchaseItemHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllItems = this.importHandler("./get/all.ipc");
    this.getItemById = this.importHandler("./get/by_id.ipc");
    this.getItemsByPurchase = this.importHandler("./get/by_purchase.ipc");
    this.getItemsByMeat = this.importHandler("./get/by_meat.ipc");
    this.getItemStatistics = this.importHandler("./get/statistics.ipc");
    this.searchItems = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createItem = this.importHandler("./create.ipc");
    this.updateItem = this.importHandler("./update.ipc");
    this.deleteItem = this.importHandler("./delete.ipc");
    this.permanentlyDeleteItem = this.importHandler("./permanent_delete.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateItems = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateItems = this.importHandler("./bulk_update.ipc");
    this.importItemsCSV = this.importHandler("./import_csv.ipc");
    this.exportItems = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[PurchaseItemHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`PurchaseItemHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllItems":
          return await this.getAllItems(params);
        case "getItemById":
          return await this.getItemById(params);
        case "getItemsByPurchase":
          return await this.getItemsByPurchase(params);
        case "getItemsByMeat":
          return await this.getItemsByMeat(params);
        case "getItemStatistics":
          return await this.getItemStatistics(params);
        case "searchItems":
          return await this.searchItems(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createItem":
          return await this.handleWithTransaction(this.createItem, params);
        case "updateItem":
          return await this.handleWithTransaction(this.updateItem, params);
        case "deleteItem":
          return await this.handleWithTransaction(this.deleteItem, params);
        case "permanentlyDeleteItem":
          return await this.handleWithTransaction(this.permanentlyDeleteItem, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateItems":
          return await this.handleWithTransaction(this.bulkCreateItems, params);
        case "bulkUpdateItems":
          return await this.handleWithTransaction(this.bulkUpdateItems, params);
        case "importItemsCSV":
          return await this.handleWithTransaction(this.importItemsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportItems":
          return await this.exportItems(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("PurchaseItemHandler error:", error);
      if (logger) {
        logger.error("PurchaseItemHandler error:", error);
      }
      return {
        status: false,
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }

  async handleWithTransaction(handler, params) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await handler(params, queryRunner);
      if (result.status) {
        await queryRunner.commitTransaction();
      } else {
        await queryRunner.rollbackTransaction();
      }
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// Register IPC handler
const purchaseItemHandler = new PurchaseItemHandler();

ipcMain.handle(
  "purchaseItem",
  withErrorHandling(
    purchaseItemHandler.handleRequest.bind(purchaseItemHandler),
    "IPC:purchaseItem"
  )
);

module.exports = { PurchaseItemHandler, purchaseItemHandler };