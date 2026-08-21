// src/main/ipc/core/saleItem/index.ipc.js - Sale Item Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class SaleItemHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllItems = this.importHandler("./get/all.ipc");
    this.getItemById = this.importHandler("./get/by_id.ipc");
    this.getItemsBySale = this.importHandler("./get/by_sale.ipc");
    this.getItemsByMeat = this.importHandler("./get/by_meat.ipc");
    this.getItemsByBatch = this.importHandler("./get/by_batch.ipc");
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
      console.warn(`[SaleItemHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`SaleItemHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllItems":
          return await this.getAllItems(params);
        case "getItemById":
          return await this.getItemById(params);
        case "getItemsBySale":
          return await this.getItemsBySale(params);
        case "getItemsByMeat":
          return await this.getItemsByMeat(params);
        case "getItemsByBatch":
          return await this.getItemsByBatch(params);
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
      console.error("SaleItemHandler error:", error);
      if (logger) {
        logger.error("SaleItemHandler error:", error);
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
const saleItemHandler = new SaleItemHandler();

ipcMain.handle(
  "saleItem",
  withErrorHandling(
    saleItemHandler.handleRequest.bind(saleItemHandler),
    "IPC:saleItem"
  )
);

module.exports = { SaleItemHandler, saleItemHandler };